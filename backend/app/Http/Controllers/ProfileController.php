<?php

namespace App\Http\Controllers;

use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Models\AuditLog;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * My Profile, for customers and the admin: a summary for the page header
 * (counts and recent activity), change the name (and a customer's mobile
 * number), and change the password.
 */
class ProfileController extends Controller
{
    private const ACTIVITY_LIMIT = 5;

    /**
     * The three numbers in the profile header and the "Recent activity" list.
     *   admin:    quotes they approved, installations scheduled and completed;
     *             activity from the audit log (their own actions)
     *   customer: their quotation requests, approved ones and installations;
     *             activity from their notifications
     * Each activity item: { label, tone, at } — tone colours the dot.
     */
    public function summary(Request $request)
    {
        $user = $request->user();

        return response()->json($user->role === 'admin'
            ? $this->adminSummary($user)
            : $this->customerSummary($user));
    }

    private function adminSummary(User $user): array
    {
        $adminId = $user->admin?->id;

        $activity = AuditLog::query()
            ->where('actor_type', User::class)
            ->where('actor_id', $user->id)
            ->latest()
            ->limit(self::ACTIVITY_LIMIT)
            ->get()
            ->map(fn (AuditLog $log) => [
                'label' => trim(rtrim($log->description, '.').($log->target_label ? ' · '.$log->target_label : '')),
                'tone' => match (true) {
                    str_contains($log->action, 'approved'), str_contains($log->action, 'confirmed') => 'approved',
                    str_contains($log->action, 'rejected'), str_contains($log->action, 'deleted') => 'rejected',
                    str_contains($log->action, 'schedule') => 'scheduled',
                    default => 'other',
                },
                'at' => $log->created_at,
            ]);

        return [
            'stats' => [
                ['label' => 'Quotes approved', 'value' => $adminId ? Quotation::where('approved_by_admin_id', $adminId)->count() : 0],
                ['label' => 'Installations scheduled', 'value' => InstallationSchedule::count()],
                ['label' => 'Installations completed', 'value' => InstallationSchedule::where('status', 'completed')->count()],
            ],
            'activity' => $activity,
        ];
    }

    private function customerSummary(User $user): array
    {
        $customer = $user->customer;

        $requests = $customer ? $customer->quotationRequests() : null;
        $installations = $customer
            ? InstallationSchedule::query()
                ->where(function ($query) use ($customer) {
                    $query->where('customer_id', $customer->id)
                        ->orWhereHas('quotation.quotationRequest', fn ($q) => $q->where('customer_id', $customer->id));
                })
                ->count()
            : 0;

        $activity = $user->notifications()
            ->latest()
            ->limit(self::ACTIVITY_LIMIT)
            ->get()
            ->map(fn ($notification) => [
                'label' => $notification->data['title'] ?? '',
                'tone' => $notification->data['tone'] ?? 'other',
                'at' => $notification->created_at,
            ]);

        return [
            'stats' => [
                ['label' => 'Quotation requests', 'value' => $requests ? (clone $requests)->count() : 0],
                ['label' => 'Approved quotations', 'value' => $requests ? (clone $requests)->where('status', 'approved')->count() : 0],
                ['label' => 'Installations', 'value' => $installations],
            ],
            'activity' => $activity,
        ];
    }

    public function update(UpdateProfileRequest $request)
    {
        $user = $request->user();

        DB::transaction(function () use ($request, $user) {
            $user->update(['name' => $request->name]);

            if ($user->role === 'customer') {
                $user->customer()->updateOrCreate(
                    ['user_id' => $user->id],
                    ['contact_number' => $request->contact_number],
                );
            }
        });

        return response()->json([
            'message' => 'Your details were saved.',
            // Same shape as /api/me, so the page can refresh the signed-in user
            'user' => $user->fresh()->load($user->role),
        ]);
    }

    public function changePassword(ChangePasswordRequest $request)
    {
        $user = $request->user();

        $user->forceFill(['password' => Hash::make($request->password)])->save();

        // Keep this device signed in; sign out the others when asked
        $signedOut = 0;
        if ($request->boolean('sign_out_others', true)) {
            $signedOut = $user->tokens()
                ->where('id', '!=', $user->currentAccessToken()->id)
                ->delete();
        }

        return response()->json([
            'message' => $signedOut > 0
                ? 'Your password was changed, and your other devices were signed out.'
                : 'Your password was changed.',
        ]);
    }
}
