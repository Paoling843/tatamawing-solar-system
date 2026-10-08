<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\User;
use App\Services\MessengerFallback;
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
            'receiver_id' => ['required', 'exists:users,id', 'different:sender_id'],
            // 'messenger_link' sends the "Chat on Messenger" card (admin only)
            'type' => ['nullable', Rule::in([ChatMessage::TYPE_TEXT, ChatMessage::TYPE_MESSENGER_LINK])],
            'message' => ['required_unless:type,'.ChatMessage::TYPE_MESSENGER_LINK, 'nullable', 'string', 'min:1', 'max:1000'],
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
                'message' => 'Unauthorized message.',
            ], 403);
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
            $chatMessage = ChatMessage::create([
                'sender_id' => $sender->id,
                'receiver_id' => $request->receiver_id,
                'message' => trim($request->message),
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
        $targetUserId = (int) $userId;
        $adminId = User::where('role', 'admin')->value('id');

        if ($currentUser->role === 'customer' && $targetUserId !== $currentUser->id && $targetUserId !== (int) $adminId) {
            return response()->json([
                'message' => 'Forbidden. You can only view your own conversation with the admin.',
            ], 403);
        }

        // Send the slow-response card first if this customer's wait is over
        $customer = $currentUser->role === 'customer' ? $currentUser : User::find($targetUserId);
        if ($customer) {
            $this->fallback->sendDueFor($customer);
        }

        $messages = ChatMessage::where(function ($query) use ($currentUser, $targetUserId) {
                $query->where('sender_id', $currentUser->id)
                    ->where('receiver_id', $targetUserId);
            })
            ->orWhere(function ($query) use ($currentUser, $targetUserId) {
                $query->where('sender_id', $targetUserId)
                    ->where('receiver_id', $currentUser->id);
            })
            ->orderBy('created_at', 'asc')
            ->orderBy('id', 'asc')
            ->with(['sender', 'receiver'])
            ->get();

        ChatMessage::where('sender_id', $targetUserId)
            ->where('receiver_id', $currentUser->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($messages);
    }

    public function getConversations(Request $request)
    {
        $admin = $request->user();

        // Send any slow-response cards that are due before listing
        $this->fallback->sendAllDue();

        $messages = ChatMessage::where('sender_id', $admin->id)
            ->orWhere('receiver_id', $admin->id)
            ->orderBy('created_at', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $unread = ChatMessage::where('receiver_id', $admin->id)
            ->whereNull('read_at')
            ->selectRaw('sender_id, count(*) as total')
            ->groupBy('sender_id')
            ->pluck('total', 'sender_id');

        // Newest message per person (the list is already newest first)
        $otherId = fn (ChatMessage $m) => $m->sender_id === $admin->id ? $m->receiver_id : $m->sender_id;
        $latest = $messages->unique($otherId);

        $users = User::with([
                'customer.latestQuotationRequest.solarComputation',
                'customer.latestQuotationRequest.quotation.installationSchedule',
            ])
            ->whereIn('id', $latest->map($otherId))
            ->get()
            ->keyBy('id');

        $conversations = $latest->map(function (ChatMessage $message) use ($admin, $users, $unread, $otherId) {
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
                'latest_from_admin' => $message->sender_id === $admin->id,
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

        if ($chatMessage->receiver_id !== $currentUser->id) {
            return response()->json([
                'message' => 'Forbidden.'
            ], 403);
        }

        $chatMessage->update(['read_at' => now()]);

        return response()->json([
            'message' => 'Message marked as read.',
            'chat_message' => $chatMessage,
        ]);
    }

    public function getAdminId()
    {
        $admin = User::where('role', 'admin')->first();

        return response()->json([
            'admin_id' =>$admin?->id,
        ]);
    }
    
    public function checkUnread(Request $request, $userId)
    {
        $currentUser = $request->user();
        $targetUserId = (int) $userId;
        $adminId = User::where('role', 'admin')->value('id');

        if ($currentUser->role === 'customer' && $targetUserId !== (int) $adminId) {
            return response()->json([
                'message' => 'Forbidden. Only the admin conversation can be checked.',
            ], 403);
        }

        $this->fallback->sendDueFor($currentUser);

        $unreadCount = ChatMessage::where('sender_id', $targetUserId)
            ->where('receiver_id', $currentUser->id)
            ->whereNull('read_at')
            ->count();

        return response()->json([
            'has_unread' => $unreadCount > 0,
            // shown on the customer's "Chat with us" button
            'unread_count' => $unreadCount,
        ]);
    }
}
