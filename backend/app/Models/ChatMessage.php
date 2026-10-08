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
