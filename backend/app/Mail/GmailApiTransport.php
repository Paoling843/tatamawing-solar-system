<?php

namespace App\Mail;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;

/**
 * Sends mail from the business Gmail account through the Gmail API (HTTPS)
 * instead of SMTP. Used in production (MAIL_MAILER=gmail) because Render's
 * free plan blocks SMTP ports and there is no custom domain for an email
 * service like Brevo yet.
 *
 * Needs an OAuth client and a refresh token with the gmail.send scope
 * (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN).
 */
class GmailApiTransport extends AbstractTransport
{
    public function __construct(
        private string $clientId,
        private string $clientSecret,
        private string $refreshToken,
    ) {
        parent::__construct();
    }

    protected function doSend(SentMessage $message): void
    {
        // Gmail wants the whole MIME message, base64url-encoded
        $raw = rtrim(strtr(base64_encode($message->toString()), '+/', '-_'), '=');

        Http::withToken($this->accessToken())
            ->post('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', ['raw' => $raw])
            ->throw();
    }

    /**
     * Access tokens last an hour; reuse one until shortly before it expires.
     */
    private function accessToken(): string
    {
        return Cache::remember('gmail_api_access_token', now()->addMinutes(50), function () {
            return Http::asForm()
                ->post('https://oauth2.googleapis.com/token', [
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                    'refresh_token' => $this->refreshToken,
                    'grant_type' => 'refresh_token',
                ])
                ->throw()
                ->json('access_token');
        });
    }

    public function __toString(): string
    {
        return 'gmail+api://default';
    }
}
