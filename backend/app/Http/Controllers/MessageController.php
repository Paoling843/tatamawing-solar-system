<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\QuotationRequest;
use App\Models\User;
use App\Services\MessengerFallback;
use App\Services\Notifier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

class MessageController extends Controller
{
    public function __construct(private MessengerFallback $fallback)
    {
    }

    public function send(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'receiver_id' => ['required', 'exists:users,id'],
            // 'messenger_link' sends the "Chat on Messenger" card (admin only)
            'type' => ['nullable', Rule::in([ChatMessage::TYPE_TEXT, ChatMessage::TYPE_MESSENGER_LINK])],
            'message' => ['required_unless:type,'.ChatMessage::TYPE_MESSENGER_LINK, 'nullable', 'string', 'min:1', 'max:1000'],
            // "Ask about this quote": the customer's quotation the message is about
            'quotation_request_id' => ['nullable', 'integer'],
        ]);

        if ($validator->fails()) {
            return response()->json(['message' => $validator->errors()->first(), 'errors' => $validator->errors()], 422);
        }

        $sender = $request->user();

        $receiver = User::find($request->receiver_id);

        if (! $receiver || $sender->id === (int) $request->receiver_id) {
            return response()->json([
                'message' => 'A valid recipient is required.',
            ], 422);
        }

        if ($sender->role !== 'admin' && $receiver->role !== 'admin') {
            return response()->json([
                'message' => 'Messages can only be sent between a customer and the admin.',
            ], 403);
        }

        if ($receiver->account_deleted_at) {
            return response()->json(['message' => 'This account was deleted, so it can no longer get messages.'], 422);
        }

        // The admins share one inbox, so they don't message each other here
        if ($sender->role === 'admin' && $receiver->role === 'admin') {
            return response()->json([
                'message' => 'Messages are between customers and TataMawing.',
            ], 422);
        }

        if ($request->type === ChatMessage::TYPE_MESSENGER_LINK) {
            if ($sender->role !== 'admin') {
                return response()->json(['message' => 'Only the admin can send the Messenger link.'], 403);
            }

            $url = $this->fallback->settings()['messenger_url'];
            if (! $url) {
                return response()->json(['message' => 'Add your Messenger link first.'], 422);
            }

            $chatMessage = ChatMessage::create([
                'sender_id' => $sender->id,
                'receiver_id' => $request->receiver_id,
                'message' => 'Sent Messenger link',
                'type' => ChatMessage::TYPE_MESSENGER_LINK,
                'meta' => ['auto' => false, 'url' => $url],
            ]);
        } else {
            // A question about one of the customer's own quotations carries its
            // reference, so the admin sees which one it's about
            $meta = null;
            if ($request->filled('quotation_request_id')) {
                $quotationRequest = QuotationRequest::query()
                    ->whereKey($request->quotation_request_id)
                    ->where('customer_id', $sender->customer?->id)
                    ->first();

                if (! $quotationRequest) {
                    return response()->json(['message' => "We couldn't find that quotation on your account."], 422);
                }

                $meta = [
                    'quotation_request_id' => $quotationRequest->id,
                    'quotation_reference' => Notifier::reference($quotationRequest),
                ];
            }

            $chatMessage = ChatMessage::create([
                'sender_id' => $sender->id,
                'receiver_id' => $request->receiver_id,
                'message' => trim($request->message),
                'meta' => $meta,
            ]);
        }

        $chatMessage->load(['sender','receiver']);

        return response()->json([
            'message' => 'Message sent successfully.',
            'chat_message' => $chatMessage,
        ], 201);
    }

    public function getConversation(Request $request, $userId)
    {
        $currentUser = $request->user();
        $target = User::find((int) $userId);

        // A customer opens their chat with the team (any admin's id works);
        // an admin opens one customer's chat
        if ($currentUser->role === 'customer') {
            if (! $target || $target->role !== 'admin') {
                return response()->json([
                    'message' => 'You can only view your own conversation with the admin.',
                ], 403);
            }
            $customer = $currentUser;
        } else {
            if (! $target || $target->role !== 'customer') {
                return response()->json(['message' => "We couldn't find that conversation."], 404);
            }
            $customer = $target;
        }

        // Send the slow-response card first if this customer's wait is over
        $this->fallback->sendDueFor($customer);

        // One thread per customer, with replies from every admin
        $messages = ChatMessage::query()
            ->customerThread($customer->id)
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->with(['sender:id,name,role', 'receiver:id,name,role'])
            ->get();

        // Read status is shared: once any admin opens the chat, the
        // customer's messages are read for the whole team
        ChatMessage::query()
            ->customerThread($customer->id)
            ->where($currentUser->role === 'customer' ? 'receiver_id' : 'sender_id', $customer->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    public function getConversations(Request $request)
    {
        // Send any slow-response cards that are due before listing
        $this->fallback->sendAllDue();

        // The admins share one inbox: every customer's chat with any admin
        $adminIds = User::where('role', 'admin')->pluck('id');
        $isAdmin = fn ($id) => $adminIds->contains($id);

        $messages = ChatMessage::query()
            ->where(fn ($q) => $q->whereIn('sender_id', $adminIds)->orWhereIn('receiver_id', $adminIds))
            ->with('sender:id,name')
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get()
            // Older admin-to-admin messages aren't a customer chat
            ->reject(fn (ChatMessage $m) => $isAdmin($m->sender_id) && $isAdmin($m->receiver_id));

        $unread = ChatMessage::whereIn('receiver_id', $adminIds)
            ->whereNotIn('sender_id', $adminIds)
            ->whereNull('read_at')
            ->selectRaw('sender_id, count(*) as total')
            ->groupBy('sender_id')
            ->pluck('total', 'sender_id');

        // Newest message per customer (the list is already newest first)
        $otherId = fn (ChatMessage $m) => $isAdmin($m->sender_id) ? $m->receiver_id : $m->sender_id;
        $latest = $messages->unique($otherId);

        $users = User::with([
                'customer.latestQuotationRequest.solarComputation',
                'customer.latestQuotationRequest.quotation.installationSchedule',
            ])
            ->whereIn('id', $latest->map($otherId))
            ->get()
            ->keyBy('id');

        $conversations = $latest->map(function (ChatMessage $message) use ($isAdmin, $users, $unread, $otherId) {
            $otherUser = $users->get($otherId($message));
            if (! $otherUser) {
                return null;
            }

            $customer = $otherUser->customer;

            return [
                'user' => [
                    'id' => $otherUser->id,
                    'name' => $otherUser->name,
                    'email' => $otherUser->email,
                    'role' => $otherUser->role,
                    'customer' => $customer ? [
                        'contact_number' => $customer->contact_number,
                        'address' => $customer->address,
                        'install_location' => $customer->install_location,
                    ] : null,
                ],
                'latest_message' => $message->message,
                'latest_type' => $message->type,
                // Sent by any admin; the page says "You:" or the admin's name
                'latest_from_admin' => $isAdmin($message->sender_id),
                'latest_sender_id' => $message->sender_id,
                'latest_sender_name' => $message->sender?->name,
                'latest_time' => $message->created_at,
                'unread_count' => (int) ($unread[$otherUser->id] ?? 0),
                'linked_request' => $this->linkedRequest($customer?->latestQuotationRequest),
            ];
        })->filter()->values();

        return response()->json($conversations);
    }

    // The customer's newest quotation request, as shown in the inbox
    private function linkedRequest($quotationRequest): ?array
    {
        if (! $quotationRequest) {
            return null;
        }

        $computation = $quotationRequest->solarComputation;

        return [
            'id' => $quotationRequest->id,
            'created_at' => $quotationRequest->created_at,
            'status' => $quotationRequest->status,
            'has_schedule' => (bool) $quotationRequest->quotation?->installationSchedule,
            'installation_address' => $quotationRequest->installation_address,
            'install_barangay' => $quotationRequest->install_barangay,
            'install_municipality' => $quotationRequest->install_municipality,
            'solar_system_type' => $quotationRequest->solar_system_type,
            'system_kw' => $computation ? (float) ($computation->package_kw ?? $computation->panel_capacity_kw) : null,
            'panel_count' => $computation?->panel_count,
        ];
    }

    public function markRead(Request $request, ChatMessage $chatMessage)
    {
        $currentUser = $request->user();

        // Messages to any admin can be marked read by any admin (shared inbox)
        $toTeam = $currentUser->role === 'admin' && $chatMessage->receiver?->role === 'admin';

        if ($chatMessage->receiver_id !== $currentUser->id && ! $toTeam) {
            return response()->json([
                'message' => 'You can only mark your own messages as read.'
            ], 403);
        }

        $chatMessage->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Message marked as read.',
            'chat_message' => $chatMessage,
        ]);
    }

    // Where the customer's chat sends messages. Any admin's id would do: the
    // admins share one inbox, so every admin sees the conversation.
    public function getAdminId()
    {
        $admin = User::active()->where('role', 'admin')->first();

        return response()->json([
            'admin_id' =>$admin?->id,
        ]);
    }
    
    public function checkUnread(Request $request, $userId)
    {
        $currentUser = $request->user();
        $target = User::find((int) $userId);

        if ($currentUser->role === 'customer' && (! $target || $target->role !== 'admin')) {
            return response()->json([
                'message' => 'You can only check your conversation with the admin.',
            ], 403);
        }

        $this->fallback->sendDueFor($currentUser);

        // Customer: replies from any admin. Admin: that customer's unread
        // messages to the team.
        $customerId = $currentUser->role === 'customer' ? $currentUser->id : (int) $userId;

        $unreadCount = ChatMessage::query()
            ->customerThread($customerId)
            ->where($currentUser->role === 'customer' ? 'receiver_id' : 'sender_id', $customerId)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'has_unread' => $unreadCount > 0,
            // shown on the customer's "Chat with us" button
            'unread_count' => $unreadCount,
        ]);
    }
}
