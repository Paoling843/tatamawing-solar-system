<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

/**
 * "Reset your password" email. $url opens the website's reset page with the
 * one-time token; it stops working after the minutes in config/auth.php.
 */
class PasswordResetLink extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user, public string $url, public int $expiresMinutes)
    {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Reset your TataMawing Solar password',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password-reset',
            with: [
                'name' => $this->user->name,
                'url' => $this->url,
                'expiresMinutes' => $this->expiresMinutes,
            ],
        );
    }
}
