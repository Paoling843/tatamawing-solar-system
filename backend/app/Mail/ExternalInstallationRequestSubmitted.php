<?php

namespace App\Mail;

use App\Models\ExternalInstallationRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\URL;

class ExternalInstallationRequestSubmitted extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public ExternalInstallationRequest $requestRecord)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Installation request received',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.external-installation-request-submitted',
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
