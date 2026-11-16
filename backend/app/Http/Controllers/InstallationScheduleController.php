<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreScheduleRequest;
use App\Http\Requests\UpdateScheduleRequest;
use App\Mail\InstallationRescheduled;
use App\Mail\InstallationUpdate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\Customer;
use App\Services\AuditLogger;
use App\Services\Notifier;

class InstallationScheduleController extends Controller
{
    public function store(StoreScheduleRequest $request)
    {
        $this->authorize('create', InstallationSchedule::class);

        $scheduleData = [
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'assigned_technician' => trim($request->assigned_technician),
            'notes' => $request->notes ? trim($request->notes) : null,
        ];

        if ($request->filled('quotation_id')) {
            $quotation = Quotation::find($request->quotation_id);

            if ($quotation->quotationRequest->status !== 'approved') {
                return response()->json([
                    'message' => 'Installation can only be scheduled for approved quotation requests.'
                ], 422);
            }

            // No purchase-request step is required: materials are arranged with
            // the supplier over Messenger, outside the system

            if (InstallationSchedule::where('quotation_id', $request->quotation_id)->exists()) {
                return response()->json([
                    'message' => 'An installation schedule already exists for this quotation.'
                ], 422);
            }

            $scheduleData['quotation_id'] = $request->quotation_id;
        } else {
            $scheduleData['customer_id'] = $request->customer_id;
        }

        $schedule = InstallationSchedule::create($scheduleData);

        Notifier::installationScheduled($schedule, true);
        $this->emailUpdate($schedule, 'scheduled');

        AuditLogger::log(
            'installation_schedule_created',
            'Created an installation schedule.',
            InstallationSchedule::class,
            $schedule->id,
            'Installation Schedule #' . $schedule->id,
            ['scheduled_date' => $schedule->scheduled_date, 'scheduled_time' => $schedule->scheduled_time]
        );

        return response()->json([
            'message' => 'Installation schedule created successfully.',
            'schedule' => $schedule->load([
                'quotation.quotationRequest.customer.user',
                'quotation.quotationRequest.solarComputation',
                'customer.user',
            ]),
        ], 201);
    }

    public function adminIndex()
    {
        $this->authorize('viewAny', InstallationSchedule::class);

        $schedules = InstallationSchedule::with([
            'quotation.quotationRequest.customer.user',
            'quotation.quotationRequest.solarComputation',
            'customer.user',
            'externalInstallationRequest',
        ])
        ->orderBy('scheduled_date', 'asc')
        ->get();

        return response()->json($schedules);
    }

    public function customersIndex()
    {
        // Deleted accounts can't be booked
        $customers = Customer::with('user')
            ->whereHas('user', fn ($q) => $q->active())
            ->get()
            ->sortBy(fn ($c) => $c->user->name ?? '')
            ->values();

        return response()->json($customers);
    }

    public function update(UpdateScheduleRequest $request, InstallationSchedule $installationSchedule)
    {
        $this->authorize('update', $installationSchedule);

        if ($locked = $this->lockedIfCompleted($installationSchedule)) {
            return $locked;
        }

        // For the email: "Previously October 27, 2026 · 8:00 AM"
        $previous = InstallationRescheduled::formatWhen($installationSchedule->scheduled_date, $installationSchedule->scheduled_time);

        // Compared by hand: MySQL returns the time as "08:00:00" while the form
        // sends "08:00", so wasChanged() would call a technician-only edit a move
        $moved = $installationSchedule->scheduled_date->toDateString() !== $request->date('scheduled_date')->toDateString()
            || substr((string) $installationSchedule->scheduled_time, 0, 5) !== substr((string) $request->scheduled_time, 0, 5);

        $installationSchedule->update([
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'assigned_technician' => trim($request->assigned_technician),
        ]);

        // The customer only needs to know when the date or time moved
        if ($moved) {
            Notifier::installationScheduled($installationSchedule, false);
            $this->emailReschedule($installationSchedule, $previous);
        }

        AuditLogger::log(
            'installation_schedule_updated',
            'Updated an installation schedule.',
            InstallationSchedule::class,
            $installationSchedule->id,
            'Installation Schedule #' . $installationSchedule->id,
            ['scheduled_date' => $installationSchedule->scheduled_date, 'scheduled_time' => $installationSchedule->scheduled_time]
        );

        return response()->json([
            'message' => 'Installation schedule updated successfully.',
            'schedule' => $installationSchedule->load([
                'quotation.quotationRequest.customer.user',
                'quotation.quotationRequest.solarComputation',
            ]),
        ]);
    }

    /**
     * Emails the new date to whoever the installation is for: the customer's
     * account (through their quotation, or booked directly), or the visitor
     * who sent an external request (with their status-page link).
     */
    private function emailReschedule(InstallationSchedule $schedule, string $previous): void
    {
        $this->emailRecipient($schedule, fn (string $name, string $link) => new InstallationRescheduled($schedule, $name, $link, $previous));
    }

    /**
     * A completed installation is final: its status and date can't change.
     * Returns the 422 to send back, or null when it can still be edited.
     */
    private function lockedIfCompleted(InstallationSchedule $schedule): ?\Illuminate\Http\JsonResponse
    {
        if ($schedule->status !== 'completed') {
            return null;
        }

        return response()->json([
            'message' => "This installation is already completed, so it can't be changed.",
        ], 422);
    }

    /**
     * Emails a new booking or a status change (InstallationUpdate::KINDS) to
     * whoever the installation is for, the same way as a reschedule.
     */
    private function emailUpdate(InstallationSchedule $schedule, string $kind): void
    {
        $this->emailRecipient($schedule, fn (string $name, string $link) => new InstallationUpdate($schedule, $kind, $name, $link));
    }

    /**
     * Sends an installation email to the customer's account (through their
     * quotation, or booked directly), or to the visitor who sent an external
     * request (with their status-page link). $makeMail gets their name and the
     * link to their schedule.
     */
    private function emailRecipient(InstallationSchedule $schedule, callable $makeMail): void
    {
        try {
            $schedule->loadMissing(['quotation.quotationRequest.customer.user', 'customer.user', 'externalInstallationRequest']);

            $user = $schedule->quotation?->quotationRequest?->customer?->user ?? $schedule->customer?->user;
            $external = $schedule->externalInstallationRequest;

            if ($user?->account_deleted_at) {
                return; // a deleted account has no real email address
            }

            if ($user) {
                Mail::to($user->email)->send($makeMail($user->name, config('app.frontend_url') . '/customer/schedule'));
            } elseif ($external) {
                Mail::to($external->email)->send($makeMail($external->name, $external->statusPageUrl()));
            }
        } catch (\Throwable $e) {
            // The schedule is already saved — log the mail failure instead of returning a 500
            report($e);
        }
    }

    public function updateStatus(Request $request, InstallationSchedule $installationSchedule)
    {
        $this->authorize('updateStatus', $installationSchedule);

        if ($locked = $this->lockedIfCompleted($installationSchedule)) {
            return $locked;
        }

        // Returns a 422 with both "message" (shown by the admin page) and "errors"
        $request->validate([
            'status' => 'required|in:scheduled,in_progress,completed,delayed',
        ], [
            'status.in' => 'Choose a valid status: scheduled, in progress, completed or delayed.',
        ]);

        $installationSchedule->update([
            'status' => $request->status,
        ]);

        if ($installationSchedule->wasChanged('status')) {
            Notifier::installationStatusChanged($installationSchedule);
            // Back to "scheduled" (after a delay, say) reads as "back on schedule"
            $this->emailUpdate(
                $installationSchedule,
                $installationSchedule->status === 'scheduled' ? 'back_on_schedule' : $installationSchedule->status,
            );
        }

        AuditLogger::log(
            'installation_schedule_status_updated',
            'Updated an installation schedule status.',
            InstallationSchedule::class,
            $installationSchedule->id,
            'Installation Schedule #' . $installationSchedule->id,
            ['status' => $installationSchedule->status]
        );

        return response()->json([
            'message' => 'Installation schedule updated successfully.',
            'schedule' => $installationSchedule->load([
                'quotation.quotationRequest.customer.user',
                'quotation.quotationRequest.solarComputation',
            ]),
        ]);
    }

    public function customerSchedule(Request $request)
    {
        $this->authorize('viewAny', InstallationSchedule::class);

        $customer = $request->user()->customer;

        $schedules = InstallationSchedule::where(function ($query) use ($customer) {
            $query->where('customer_id', $customer->id)
                ->orWhereHas('quotation.quotationRequest', function ($q) use ($customer) {
                    $q->where('customer_id', $customer->id);
                });
        })
        ->with([
            'quotation.quotationRequest.customer.user',
            'quotation.quotationRequest.solarComputation',
            'customer.user',
        ])
        ->orderBy('scheduled_date', 'asc')
        ->get();

        return response()->json($schedules);
    }
}
