<?php

namespace App\Services;

use App\Models\ExternalInstallationRequest;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use App\Models\User;
use App\Notifications\AppNotification;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Sends the in-app notifications shown under the bell. Every method is safe
 * to call after the main action is saved: a failure here is reported, never
 * thrown, so it can't undo an approval or a schedule.
 *
 * Reminders ("waiting 3+ days", "installation tomorrow") are created when
 * someone opens their notifications (see remindersFor), so no scheduled job
 * is needed on the hosting plan.
 */
class Notifier
{
    public const WAITING_DAYS = 3;

    // ----- Customers --------------------------------------------------

    public static function quotationApproved(Quotation $quotation): void
    {
        $request = $quotation->quotationRequest;
        self::toCustomerOf($request, new AppNotification(
            kind: 'quotation_approved',
            title: self::reference($request) . ' approved',
            body: 'Total ' . self::peso($quotation->total_amount),
            link: '/customer/my-quotations',
            tone: 'approved',
            subject: 'quotation_request:' . $request->id,
        ));
    }

    public static function quotationRejected(QuotationRequest $request): void
    {
        self::toCustomerOf($request, new AppNotification(
            kind: 'quotation_rejected',
            title: self::reference($request) . ' not approved',
            body: self::short($request->notes ?: 'Contact us to revise this request.'),
            link: '/customer/my-quotations',
            tone: 'rejected',
            subject: 'quotation_request:' . $request->id,
        ));
    }

    // created: true for a new schedule, false when its date or time changed
    public static function installationScheduled(InstallationSchedule $schedule, bool $created): void
    {
        self::toScheduleCustomer($schedule, new AppNotification(
            kind: $created ? 'installation_scheduled' : 'installation_rescheduled',
            title: ($created ? 'Installation set for ' : 'Installation moved to ') . $schedule->scheduled_date->format('M j'),
            body: self::scheduleDetail($schedule),
            link: '/customer/schedule',
            tone: 'scheduled',
            subject: 'installation_schedule:' . $schedule->id,
        ));
    }

    public static function installationStatusChanged(InstallationSchedule $schedule): void
    {
        $titles = [
            'scheduled' => 'Installation back on schedule',
            'in_progress' => 'Installation in progress',
            'completed' => 'Installation completed',
            'delayed' => 'Installation delayed',
        ];

        self::toScheduleCustomer($schedule, new AppNotification(
            kind: 'installation_' . $schedule->status,
            title: $titles[$schedule->status] ?? 'Installation updated',
            body: $schedule->status === 'delayed'
                ? 'We will contact you with a new date.'
                : self::scheduleDetail($schedule),
            link: '/customer/schedule',
            tone: $schedule->status,
            subject: 'installation_schedule:' . $schedule->id,
        ));
    }

    // ----- Admins -----------------------------------------------------

    public static function newQuotationRequest(QuotationRequest $request): void
    {
        $request->loadMissing(['customer.user', 'solarComputation']);
        $kw = $request->solarComputation?->package_kw;

        self::toAdmins(new AppNotification(
            kind: 'quotation_new',
            title: 'New request from ' . ($request->customer?->user?->name ?? 'a customer'),
            body: self::reference($request) . ($kw ? " · {$kw} kW hybrid" : ''),
            link: '/admin/quotation-requests/' . $request->id,
            tone: 'pending',
            subject: 'quotation_request:' . $request->id,
        ));
    }

    public static function newExternalRequest(ExternalInstallationRequest $request): void
    {
        self::toAdmins(new AppNotification(
            kind: 'external_new',
            title: 'External request #EXT-' . str_pad($request->id, 3, '0', STR_PAD_LEFT),
            body: $request->name . ' · preferred ' . Carbon::parse($request->preferred_installation_date)->format('M j'),
            link: '/admin/dashboard',
            tone: 'pending',
            subject: 'external_installation_request:' . $request->id,
        ));
    }

    // ----- Reminders --------------------------------------------------

    // Creates any reminders this user is due, once each
    public static function remindersFor(User $user): void
    {
        try {
            $tomorrow = now()->addDay()->toDateString();

            if ($user->role === 'admin') {
                QuotationRequest::with('customer.user')
                    ->where('status', 'pending')
                    ->where('created_at', '<=', now()->subDays(self::WAITING_DAYS))
                    ->get()
                    ->each(function ($request) use ($user) {
                        $days = (int) $request->created_at->diffInDays(now());
                        self::once($user, new AppNotification(
                            kind: 'quotation_waiting',
                            title: self::reference($request) . " waiting {$days} days",
                            body: 'From ' . ($request->customer?->user?->name ?? 'a customer') . ' · needs a decision',
                            link: '/admin/quotation-requests/' . $request->id,
                            tone: 'pending',
                            subject: 'quotation_request:' . $request->id,
                        ));
                    });

                InstallationSchedule::with('quotation.quotationRequest')
                    ->whereDate('scheduled_date', $tomorrow)
                    ->where('status', 'scheduled')
                    ->get()
                    ->each(fn ($schedule) => self::once($user, self::tomorrowReminder($schedule, '/admin/schedule')));

                return;
            }

            $customer = $user->customer;
            if (! $customer) {
                return;
            }

            InstallationSchedule::with('quotation.quotationRequest')
                ->whereDate('scheduled_date', $tomorrow)
                ->where('status', 'scheduled')
                ->where(function ($query) use ($customer) {
                    $query->where('customer_id', $customer->id)
                        ->orWhereHas('quotation.quotationRequest', fn ($q) => $q->where('customer_id', $customer->id));
                })
                ->get()
                ->each(fn ($schedule) => self::once($user, self::tomorrowReminder($schedule, '/customer/schedule')));
        } catch (\Throwable $e) {
            report($e);
        }
    }

    // ----- Helpers ----------------------------------------------------

    // Same reference the pages show, e.g. #Q-2026-049
    public static function reference(QuotationRequest $request): string
    {
        return '#Q-' . $request->created_at->format('Y') . '-' . str_pad($request->id, 3, '0', STR_PAD_LEFT);
    }

    private static function tomorrowReminder(InstallationSchedule $schedule, string $link): AppNotification
    {
        return new AppNotification(
            kind: 'installation_tomorrow',
            title: 'Installation tomorrow',
            body: self::scheduleDetail($schedule),
            link: $link,
            tone: 'scheduled',
            subject: 'installation_schedule:' . $schedule->id . ':' . $schedule->scheduled_date->toDateString(),
        );
    }

    // "8:00 AM · Purok 2, Brgy. Bical, Bulan, Sorsogon"
    private static function scheduleDetail(InstallationSchedule $schedule): string
    {
        $schedule->loadMissing('quotation.quotationRequest');
        $parts = [];
        if ($schedule->scheduled_time) {
            $parts[] = Carbon::parse($schedule->scheduled_time)->format('g:i A');
        }
        $address = $schedule->quotation?->quotationRequest?->installation_address;
        if ($address) {
            $parts[] = $address;
        }

        return $parts ? implode(' · ', $parts) : $schedule->scheduled_date->format('F j, Y');
    }

    private static function toCustomerOf(QuotationRequest $request, AppNotification $notification): void
    {
        self::send(fn () => $request->loadMissing('customer.user')->customer?->user?->notify($notification));
    }

    // Schedules belong to a customer through their quotation, or directly.
    // Schedules for external requests have no account, so nobody is notified.
    private static function toScheduleCustomer(InstallationSchedule $schedule, AppNotification $notification): void
    {
        self::send(function () use ($schedule, $notification) {
            $schedule->loadMissing(['quotation.quotationRequest.customer.user', 'customer.user']);
            $user = $schedule->quotation?->quotationRequest?->customer?->user ?? $schedule->customer?->user;
            $user?->notify($notification);
        });
    }

    private static function toAdmins(AppNotification $notification): void
    {
        self::send(fn () => User::where('role', 'admin')->get()->each->notify($notification));
    }

    // Sends a reminder unless this user already has one for the same thing
    private static function once(User $user, AppNotification $notification): void
    {
        $exists = DB::table('notifications')
            ->where('notifiable_type', User::class)
            ->where('notifiable_id', $user->id)
            ->where('data->kind', $notification->kind)
            ->where('data->subject', $notification->subject)
            ->exists();

        if (! $exists) {
            $user->notify($notification);
        }
    }

    private static function send(callable $callback): void
    {
        try {
            $callback();
        } catch (\Throwable $e) {
            report($e);
        }
    }

    private static function peso($amount): string
    {
        return '₱' . number_format((float) $amount, 2);
    }

    private static function short(string $text): string
    {
        $text = trim(preg_replace('/\s+/', ' ', $text));

        return mb_strlen($text) > 90 ? mb_substr($text, 0, 87) . '…' : $text;
    }
}
