<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $logs = AuditLog::query()
            ->latest()
            ->limit(200)
            ->get();

        // Who did it, by name (a deleted account shows "Deleted admin" etc.)
        $actors = User::whereIn('id', $logs->where('actor_type', User::class)->pluck('actor_id')->unique())
            ->get(['id', 'name', 'role'])
            ->keyBy('id');

        return response()->json($logs->map(function (AuditLog $log) use ($actors) {
            $actor = $log->actor_type === User::class ? $actors->get($log->actor_id) : null;

            return $log->toArray() + [
                'actor_name' => $actor?->name,
                'actor_role' => $actor?->role,
            ];
        }));
    }
}
