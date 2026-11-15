<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditLogController extends Controller
{
    private const PER_PAGE = 25;

    // The Audit log page's filter groups, in the order its tiles show them
    public const GROUPS = ['approved', 'rejected', 'scheduling', 'customer', 'deleted', 'content'];

    // Every action the backend logs (AuditLogger::log calls). Actions added
    // later fall back to a group guessed from their name, see groupOf().
    private const ACTION_GROUP = [
        'quotation_approved' => 'approved',
        'external_installation_confirmed' => 'approved',
        'quotation_rejected' => 'rejected',
        'quotation_cancelled' => 'rejected',
        'external_installation_rejected' => 'rejected',
        'installation_schedule_created' => 'scheduling',
        'installation_schedule_updated' => 'scheduling',
        'installation_schedule_status_updated' => 'scheduling',
        'quotation_created' => 'customer',
        'quotation_submitted' => 'customer',
        'faq_deleted' => 'deleted',
        'user_deleted' => 'deleted',
        'user_created' => 'content',
        'faq_created' => 'content',
        'faq_updated' => 'content',
        'inbox_settings_updated' => 'content',
        'prices_updated' => 'content',
    ];

    public static function groupOf(string $action): string
    {
        return self::ACTION_GROUP[$action] ?? match (true) {
            (bool) preg_match('/approved|confirmed/', $action) => 'approved',
            (bool) preg_match('/rejected|cancelled/', $action) => 'rejected',
            (bool) preg_match('/schedule/', $action) => 'scheduling',
            (bool) preg_match('/deleted/', $action) => 'deleted',
            default => 'content',
        };
    }

    /**
     * Newest first, one page at a time (?page=2). The log only grows, so it
     * is paginated here instead of sending every row to the browser.
     * ?group=approved (one of GROUPS) shows only that kind of entry.
     *
     * Response: Laravel's paginator — data, current_page, last_page, from,
     * to, total, per_page — plus `counts`: entries per group and in total,
     * for the filter tiles.
     */
    public function index(Request $request)
    {
        $request->validate([
            'group' => ['nullable', 'string', 'in:all,' . implode(',', self::GROUPS)],
        ]);
        $group = $request->query('group', 'all');

        // One row per distinct action; there are only a few dozen at most
        $perAction = AuditLog::query()
            ->select('action', DB::raw('COUNT(*) as total'))
            ->groupBy('action')
            ->pluck('total', 'action');

        $counts = array_fill_keys(self::GROUPS, 0);
        $actionsInGroup = [];
        foreach ($perAction as $action => $total) {
            $key = self::groupOf($action);
            $counts[$key] += (int) $total;
            $actionsInGroup[$key][] = $action;
        }
        $counts['all'] = array_sum($counts);

        $page = AuditLog::query()
            ->when($group !== 'all', fn ($query) => $query->whereIn('action', $actionsInGroup[$group] ?? []))
            ->latest()
            ->orderByDesc('id') // same-second rows keep a stable order across pages
            ->paginate(self::PER_PAGE);

        // Who did it, by name (a deleted account shows "Deleted admin" etc.)
        $logs = $page->getCollection();
        $actors = User::whereIn('id', $logs->where('actor_type', User::class)->pluck('actor_id')->unique())
            ->get(['id', 'name', 'role'])
            ->keyBy('id');

        $page->through(function (AuditLog $log) use ($actors) {
            $actor = $log->actor_type === User::class ? $actors->get($log->actor_id) : null;

            return $log->toArray() + [
                'actor_name' => $actor?->name,
                'actor_role' => $actor?->role,
                'group' => self::groupOf($log->action),
            ];
        });

        return response()->json($page->toArray() + ['counts' => $counts]);
    }
}
