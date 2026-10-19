<?php

namespace App\Http\Controllers;

use App\Services\Notifier;
use Illuminate\Http\Request;

/**
 * The bell in the top bar: the signed-in user's latest notifications.
 */
class NotificationController extends Controller
{
    private const LIMIT = 20;

    public function index(Request $request)
    {
        $user = $request->user();

        // Reminders are created on demand, so no scheduled job is needed
        Notifier::remindersFor($user);

        $notifications = $user->notifications()
            ->latest()
            ->limit(self::LIMIT)
            ->get()
            ->map(fn ($notification) => [
                'id' => $notification->id,
                'kind' => $notification->data['kind'] ?? null,
                'title' => $notification->data['title'] ?? '',
                'body' => $notification->data['body'] ?? '',
                'link' => $notification->data['link'] ?? null,
                'tone' => $notification->data['tone'] ?? null,
                'read_at' => $notification->read_at,
                'created_at' => $notification->created_at,
            ]);

        return response()->json([
            'unread_count' => $user->unreadNotifications()->count(),
            'notifications' => $notifications,
        ]);
    }

    public function markRead(Request $request, string $id)
    {
        // Only the user's own notifications can be found here
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return response()->json(['message' => 'Notification marked as read.']);
    }

    public function markAllRead(Request $request)
    {
        $request->user()->unreadNotifications()->update(['read_at' => now()]);

        return response()->json(['message' => 'All notifications marked as read.']);
    }
}
