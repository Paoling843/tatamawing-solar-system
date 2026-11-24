<?php

namespace App\Services;

use App\Models\AuditLog;
use DateTimeInterface;
use Illuminate\Support\Facades\Auth;

class AuditLogger
{
    public static function log(string $action, string $description, ?string $targetType = null, ?int $targetId = null, ?string $targetLabel = null, array $metadata = []): void
    {
        $user = Auth::user();
        $request = request();

        if (! $user) {
            return;
        }

        AuditLog::create([
            'action' => $action,
            'actor_type' => $user::class,
            'actor_id' => $user->id,
            'target_type' => $targetType,
            'target_id' => $targetId,
            'target_label' => $targetLabel,
            'description' => $description,
            'metadata' => self::localDates($metadata),
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }

    /**
     * Dates are written in the app's own timezone. Left as objects, they would
     * be saved in UTC, and in Manila a midnight date would become the day before.
     */
    private static function localDates(array $metadata): array
    {
        return array_map(function ($value) {
            if (is_array($value)) {
                return self::localDates($value);
            }

            if ($value instanceof DateTimeInterface) {
                return $value->format('H:i:s') === '00:00:00'
                    ? $value->format('Y-m-d')
                    : $value->format('Y-m-d H:i:s');
            }

            return $value;
        }, $metadata);
    }
}
