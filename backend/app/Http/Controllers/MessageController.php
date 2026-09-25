<?php

namespace App\Http\Controllers;

use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class MessageController extends Controller
{
    public function send(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'receiver_id' => ['required', 'exists:users,id', 'different:sender_id'],
            'message' => ['required', 'string', 'min:1', 'max:1000'],
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

        $chatMessage = ChatMessage::create([
            'sender_id' => $sender->id,
            'receiver_id' => $request->receiver_id,
            'message' => trim($request->message),
        ]);

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

        $messages = ChatMessage::where(function ($query) use ($currentUser, $targetUserId) {
                $query->where('sender_id', $currentUser->id)
                    ->where('receiver_id', $targetUserId);
            })
            ->orWhere(function ($query) use ($currentUser, $targetUserId) {
                $query->where('sender_id', $targetUserId)
                    ->where('receiver_id', $currentUser->id);
            })
            ->orderBy('created_at', 'asc')
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
        $admin =$request->user();

        $messages = ChatMessage::where('sender_id', $admin->id)
            ->orWhere('receiver_id', $admin->id)
            ->with(['sender', 'receiver'])
            ->orderBy('created_at', 'desc')
            ->get();

        $conversations = [];

        foreach ($messages as $message) {
            $otherUserId = $message->sender_id === $admin->id
                ? $message->receiver_id
                : $message->sender_id;

            if (!isset($conversations[$otherUserId])) {
                $otherUser = $message->sender_id === $admin->id
                ? $message->receiver
                : $message->sender;

                $unreadCount = ChatMessage::where('sender_id', $otherUserId)
                    ->where('receiver_id', $admin->id)
                    ->whereNull('read_at')
                    ->count();

                $conversations[$otherUserId] = [
                    'user' => $otherUser,
                    'latest_message' => $message->message,
                    'latest_time' => $message->created_at,
                    'unread_count' => $unreadCount,
                ];  
            }
        }

        return response()->json(array_values($conversations));
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

        $hasUnread = ChatMessage::where('sender_id', $targetUserId)
            ->where('receiver_id', $currentUser->id)
            ->whereNull('read_at')
            ->exists();

        return response()->json([
            'has_unread' => $hasUnread,
        ]);
    }
}
