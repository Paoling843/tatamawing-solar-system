<?php

namespace App\Mail;

use App\Models\QuotationRequest;
use App\Services\Notifier;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

// Sent to the customer when the admin rejects their quotation request, with
// the reason the admin typed (saved in the request's notes)
class QuotationRejected extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public QuotationRequest $quotationRequest)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Update on your quotation request ' . Notifier::reference($this->quotationRequest),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.quotation-rejected',
            with: [
                'name' => $this->quotationRequest->customer?->user?->name,
                'reference' => Notifier::reference($this->quotationRequest),
                'reason' => $this->quotationRequest->notes,
                'link' => config('app.frontend_url') . '/customer/my-quotations',
            ],
        );
    }
}
