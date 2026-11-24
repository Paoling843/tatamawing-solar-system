<?php

namespace App\Mail;

use App\Models\InstallationSchedule;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// Sent when the admin books an installation, and when they change its status
// (in progress, completed, delayed, or back on schedule). A moved date or time
// has its own email (InstallationRescheduled).
class InstallationUpdate extends Mailable
{
    use Queueable, SerializesModels;

    // What each kind of update says: the label, the heading, and the subject
    public const KINDS = [
        'scheduled' => [
            'label' => 'SCHEDULED',
            'heading' => 'Your installation is scheduled',
            'subject' => 'Your installation is scheduled for :date',
            'intro' => "Good news! We've scheduled your solar installation.",
            'outro' => 'Please make sure someone is home on the installation day. The technician will contact you before arriving. If the schedule doesn\'t work for you, message us so we can find another time.',
        ],
        'in_progress' => [
            'label' => 'IN PROGRESS',
            'heading' => 'Your installation has started',
            'subject' => 'Your installation is in progress',
            'intro' => 'Our team has started installing your solar system.',
            'outro' => 'We will let you know as soon as it is finished.',
        ],
        'completed' => [
            'label' => 'COMPLETED',
            'heading' => 'Your installation is complete',
            'subject' => 'Your solar installation is complete',
            'intro' => 'Your solar system is installed. Thank you for choosing TataMawing Solar!',
            'outro' => 'If you have any questions about your new system, just send us a message.',
        ],
        'delayed' => [
            'label' => 'DELAYED',
            'heading' => 'Your installation is delayed',
            'subject' => 'Your installation is delayed',
            'intro' => "We're sorry, but we have to delay your solar installation.",
            'outro' => 'We will contact you with a new date as soon as possible.',
        ],
        'back_on_schedule' => [
            'label' => 'BACK ON SCHEDULE',
            'heading' => 'Your installation is back on schedule',
            'subject' => 'Your installation is back on schedule',
            'intro' => 'Your solar installation is going ahead as planned.',
            'outro' => 'Please make sure someone is home on the installation day. The technician will contact you before arriving.',
        ],
    ];

    /**
     * @param  string  $kind  one of KINDS
     * @param  string  $name  who it's addressed to
     * @param  string  $link  where they can see the schedule (their account,
     *                        or the status page for an external request)
     */
    public function __construct(
        public InstallationSchedule $schedule,
        public string $kind,
        public string $name,
        public string $link,
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: str_replace(':date', $this->schedule->scheduled_date->format('F j'), self::KINDS[$this->kind]['subject']),
        );
    }

    public function content(): Content
    {
        $this->schedule->loadMissing('quotation.quotationRequest', 'externalInstallationRequest');

        return new Content(
            view: 'emails.installation-update',
            with: [
                'copy' => self::KINDS[$this->kind],
                'when' => InstallationRescheduled::formatWhen($this->schedule->scheduled_date, $this->schedule->scheduled_time),
                'technician' => $this->schedule->assigned_technician,
                'address' => $this->schedule->quotation?->quotationRequest?->installation_address
                    ?? $this->schedule->externalInstallationRequest?->address,
                // The date doesn't matter while it's delayed: a new one will follow
                'showDate' => $this->kind !== 'delayed',
            ],
        );
    }
}
