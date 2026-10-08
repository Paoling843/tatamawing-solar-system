<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\ChatMessage;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * Slow-response fallback for the inbox.
 *
 * When it's on and a customer has waited `delay` minutes without a reply,
 * they're sent a "Chat on Messenger" card (a ChatMessage of type
 * messenger_link) from the admin they wrote to.
 *
 * There's no cron job: the check runs whenever a chat refreshes — the admin's
 * inbox polls every 5 s and the customer's chat every 5–8 s. The card is
 * dated at the moment it became due (first unanswered message + delay), so
 * it reads correctly even if nobody was looking right then.
 *
 * Rules:
 *  - only messages sent while the fallback was on count (turning it on
 *    doesn't send cards for old messages)
 *  - at most one automatic card until the admin actually replies
 */
class MessengerFallback
{
    public const DELAYS = [5, 10, 15, 30];

    // Where the admin's Messenger link may point
    public const MESSENGER_HOSTS = ['m.me', 'messenger.com', 'www.messenger.com', 'facebook.com', 'www.facebook.com'];

    private const ENABLED = 'inbox.fallback_enabled';
    private const ENABLED_AT = 'inbox.fallback_enabled_at';
    private const DELAY = 'inbox.fallback_delay_minutes';
    private const URL = 'inbox.messenger_url';

    public function settings(): array
    {
        $url = AppSetting::get(self::URL) ?: null;
        $delay = (int) AppSetting::get(self::DELAY, 10);

        return [
            // Never "on" without a link to send
            'fallback_enabled' => $url !== null && AppSetting::get(self::ENABLED) === '1',
            'fallback_delay_minutes' => in_array($delay, self::DELAYS, true) ? $delay : 10,
            'messenger_url' => $url,
        ];
    }

    public function update(array $changes): array
    {
        $before = $this->settings();

        if (array_key_exists('messenger_url', $changes)) {
            AppSetting::put(self::URL, trim((string) $changes['messenger_url']) ?: null);
        }
        if (array_key_exists('fallback_delay_minutes', $changes)) {
            AppSetting::put(self::DELAY, (int) $changes['fallback_delay_minutes']);
        }
        if (array_key_exists('fallback_enabled', $changes)) {
            $enabled = (bool) $changes['fallback_enabled'];
            AppSetting::put(self::ENABLED, $enabled ? '1' : '0');
            if ($enabled && ! $before['fallback_enabled']) {
                AppSetting::put(self::ENABLED_AT, now()->toIso8601String());
            }
        }

        // Clearing the link turns the fallback off
        if (AppSetting::get(self::URL) === null) {
            AppSetting::put(self::ENABLED, '0');
        }

        return $this->settings();
    }

    public static function isMessengerUrl(?string $url): bool
    {
        if (! $url || ! str_starts_with($url, 'https://') || ! filter_var($url, FILTER_VALIDATE_URL)) {
            return false;
        }

        return in_array(strtolower((string) parse_url($url, PHP_URL_HOST)), self::MESSENGER_HOSTS, true);
    }

    /**
     * Sends the card to every customer whose wait is over (admin inbox refresh).
     */
    public function sendAllDue(): void
    {
        $settings = $this->settings();
        if (! $settings['fallback_enabled']) {
            return;
        }

        $customerIds = ChatMessage::query()
            ->whereIn('receiver_id', $this->adminIds())
            ->where('created_at', '>=', $this->enabledAt())
            ->where('created_at', '<=', now()->subMinutes($settings['fallback_delay_minutes']))
            ->distinct()
            ->pluck('sender_id');

        User::whereIn('id', $customerIds)->where('role', 'customer')->get()
            ->each(fn (User $customer) => $this->sendDueFor($customer));
    }

    /**
     * Sends the card to this customer if their wait is over (customer chat refresh).
     */
    public function sendDueFor(User $customer): void
    {
        if ($customer->role !== 'customer') {
            return;
        }

        $settings = $this->settings();
        if (! $settings['fallback_enabled']) {
            return;
        }

        // Two refreshes at the same moment must not send two cards
        Cache::lock("messenger-fallback:{$customer->id}", 10)->get(function () use ($customer, $settings) {
            $adminIds = $this->adminIds();

            $thread = ChatMessage::query()
                ->where(fn ($q) => $q->where('sender_id', $customer->id)->whereIn('receiver_id', $adminIds))
                ->orWhere(fn ($q) => $q->whereIn('sender_id', $adminIds)->where('receiver_id', $customer->id))
                ->orderBy('created_at')
                ->orderBy('id')
                ->get();

            // Everything since the admin's last real reply (the card doesn't count as one)
            $lastReply = $thread->reverse()->search(fn (ChatMessage $m) => $m->sender_id !== $customer->id && ! $m->isAutoMessengerLink());
            $since = $lastReply === false ? $thread : $thread->slice($lastReply + 1);

            if ($since->contains(fn (ChatMessage $m) => $m->isAutoMessengerLink())) {
                return; // already sent one for this wait
            }

            $firstUnanswered = $since->first(fn (ChatMessage $m) => $m->sender_id === $customer->id);
            if (! $firstUnanswered || $firstUnanswered->created_at->lt($this->enabledAt())) {
                return;
            }

            $due = $firstUnanswered->created_at->copy()->addMinutes($settings['fallback_delay_minutes']);
            if (now()->lt($due)) {
                return;
            }

            $card = new ChatMessage([
                'sender_id' => $firstUnanswered->receiver_id,
                'receiver_id' => $customer->id,
                'message' => 'Sent Messenger link',
                'type' => ChatMessage::TYPE_MESSENGER_LINK,
                'meta' => [
                    'auto' => true,
                    'after_minutes' => $settings['fallback_delay_minutes'],
                    'url' => $settings['messenger_url'],
                ],
            ]);
            $card->created_at = $due;
            $card->updated_at = $due;
            $card->save();
        });
    }

    private function adminIds()
    {
        return User::where('role', 'admin')->pluck('id');
    }

    private function enabledAt(): Carbon
    {
        $at = AppSetting::get(self::ENABLED_AT);

        return $at ? Carbon::parse($at)->setTimezone(config('app.timezone')) : now();
    }
}
