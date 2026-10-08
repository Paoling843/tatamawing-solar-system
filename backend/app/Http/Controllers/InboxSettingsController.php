<?php

namespace App\Http\Controllers;

use App\Services\AuditLogger;
use App\Services\MessengerFallback;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

// The inbox's slow-response fallback: on/off, delay, and the admin's Messenger link
class InboxSettingsController extends Controller
{
    public function __construct(private MessengerFallback $fallback)
    {
    }

    public function show()
    {
        return response()->json($this->fallback->settings());
    }

    // Public: how to reach the owner, for the Privacy Policy and Terms pages.
    // Only the Messenger link — it's already shown to customers in the chat.
    public function contact()
    {
        return response()->json([
            'messenger_url' => $this->fallback->settings()['messenger_url'],
        ]);
    }

    // Each control saves on its own, so every field is optional
    public function update(Request $request)
    {
        $data = $request->validate([
            'fallback_enabled' => ['sometimes', 'boolean'],
            'fallback_delay_minutes' => ['sometimes', 'integer', Rule::in(MessengerFallback::DELAYS)],
            'messenger_url' => ['sometimes', 'nullable', 'string', 'max:255', function ($attribute, $value, $fail) {
                if (! MessengerFallback::isMessengerUrl(trim((string) $value))) {
                    $fail('Use your Messenger link, e.g. https://m.me/yourpage');
                }
            }],
        ], [
            'fallback_delay_minutes.in' => 'Choose 5, 10, 15 or 30 minutes.',
        ]);

        $current = $this->fallback->settings();
        $url = array_key_exists('messenger_url', $data) ? (trim((string) $data['messenger_url']) ?: null) : $current['messenger_url'];

        if (($data['fallback_enabled'] ?? false) && ! $url) {
            return response()->json([
                'message' => 'Add your Messenger link first.',
                'errors' => ['messenger_url' => ['Add your Messenger link first.']],
            ], 422);
        }

        $settings = $this->fallback->update($data);

        AuditLogger::log(
            'inbox_settings_updated',
            'Updated the inbox slow-response fallback.',
            null,
            null,
            'Inbox settings',
            $settings
        );

        return response()->json($settings);
    }
}
