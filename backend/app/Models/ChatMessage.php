<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    protected $fillable = [
        'sender_id',
        'receiver_id',
        'message',
        'type',
        'meta',
        'read_at',
    ];

    // 'text', or 'messenger_link' (the "Chat on Messenger" card)
    public const TYPE_TEXT = 'text';
    public const TYPE_MESSENGER_LINK = 'messenger_link';

    protected $attributes = [
        'type' => self::TYPE_TEXT,
    ];

    // The fallback's own card, as opposed to one the admin sent by hand
    public function isAutoMessengerLink(): bool
    {
        return $this->type === self::TYPE_MESSENGER_LINK && ($this->meta['auto'] ?? false);
    }

    // Everything between this customer and any admin: the admins share one
    // inbox, so a customer has a single thread with the whole team
    public function scopeCustomerThread($query, int $customerId)
    {
        $admins = User::where('role', 'admin')->select('id');

        return $query->where(fn ($q) => $q
            ->where(fn ($q) => $q->where('sender_id', $customerId)->whereIn('receiver_id', $admins))
            ->orWhere(fn ($q) => $q->whereIn('sender_id', $admins)->where('receiver_id', $customerId)));
    }

    protected function casts()
    {
        return [
            'read_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }
}
