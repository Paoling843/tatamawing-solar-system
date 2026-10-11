<?php

namespace Tests\Feature;

use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class GmailApiTransportTest extends TestCase
{
    public function test_sends_the_message_through_the_gmail_api(): void
    {
        config([
            'mail.default' => 'gmail',
            'services.gmail' => ['client_id' => 'id', 'client_secret' => 'secret', 'refresh_token' => 'refresh'],
        ]);
        Cache::forget('gmail_api_access_token');

        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'access-123']),
            'gmail.googleapis.com/*' => Http::response(['id' => 'msg-1']),
        ]);

        Mail::raw('Your quotation is ready.', fn ($m) => $m->to('customer@example.com')->subject('Quotation'));

        Http::assertSent(fn (Request $r) => $r->url() === 'https://oauth2.googleapis.com/token'
            && $r['refresh_token'] === 'refresh'
            && $r['grant_type'] === 'refresh_token');

        Http::assertSent(function (Request $r) {
            if (! str_starts_with($r->url(), 'https://gmail.googleapis.com/')) {
                return false;
            }
            $mime = base64_decode(strtr($r['raw'], '-_', '+/'));

            return $r->hasHeader('Authorization', 'Bearer access-123')
                && str_contains($mime, 'To: customer@example.com')
                && str_contains($mime, 'Subject: Quotation')
                && str_contains($mime, 'Your quotation is ready.');
        });
    }
}
