<?php

namespace App\Services;

use App\Models\AuditLog;
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
            'metadata' => $metadata,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
        ]);
    }
}
