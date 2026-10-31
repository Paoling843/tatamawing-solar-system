<?php

namespace App\Mail;

use App\Models\InstallationSchedule;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// Sent when the admin moves an installation to another date or time
class InstallationRescheduled extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  string  $name      who it's addressed to
     * @param  string  $link      where they can see the schedule (their account,
     *                            or the status page for an external request)
     * @param  string  $previous  the old date and time, e.g. "October 27, 2026 · 8:00 AM"
     */
    public function __construct(
        public InstallationSchedule $schedule,
        public string $name,
        public string $link,
        public string $previous,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Your installation was moved to ' . $this->schedule->scheduled_date->format('F j'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.installation-rescheduled',
            with: [
                'newDate' => self::formatWhen($this->schedule->scheduled_date, $this->schedule->scheduled_time),
            ],
        );
    }

    // "October 31, 2026 · 9:00 AM"
    public static function formatWhen($date, ?string $time): string
    {
        $text = Carbon::parse($date)->format('F j, Y');

        return $time ? $text . ' · ' . Carbon::parse($time)->format('g:i A') : $text;
    }
}
