<?php

namespace App\Mail;

use App\Models\ExternalInstallationRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class ExternalInstallationRequestStatusUpdated extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ExternalInstallationRequest $requestRecord)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->requestRecord->status === 'confirmed'
                ? 'Your installation request has been confirmed'
                : 'Update on your installation request',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.external-installation-request-status-updated',
            with: [
                'statusUrl' => URL::temporarySignedRoute(
                    'external-installation-requests.status',
                    now()->addDays(30),
                    ['externalInstallationRequest' => $this->requestRecord->id]
                ),
            ],
        );
    }
}
