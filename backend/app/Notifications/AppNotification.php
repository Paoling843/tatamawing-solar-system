<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;

/**
 * One in-app notification (the bell in the top bar). Saved in the
 * `notifications` table; App\Services\Notifier decides who gets what.
 *
 *   kind     what happened, e.g. 'quotation_approved' — the bell picks its icon from this
 *   title    one short line, e.g. "#Q-2026-049 approved"
 *   body     one short detail line, e.g. "Total ₱480,080.00"
 *   link     page to open when it is clicked, e.g. "/customer/my-quotations"
 *   tone     status colour for the icon (a key of statusColors on the frontend)
 *   subject  "type:id" of the record it is about — used to avoid sending a reminder twice
 */
class AppNotification extends Notification
{
    public function __construct(
        public string $kind,
        public string $title,
        public string $body,
        public string $link,
        public string $tone,
        public ?string $subject = null,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'kind' => $this->kind,
            'title' => $this->title,
            'body' => $this->body,
            'link' => $this->link,
            'tone' => $this->tone,
            'subject' => $this->subject,
        ];
    }
}
