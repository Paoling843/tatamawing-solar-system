<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmExternalInstallationRequest;
use App\Http\Requests\RejectExternalInstallationRequest;
use App\Http\Requests\StoreExternalInstallationRequest;
use App\Mail\ExternalInstallationRequestSubmitted;
use App\Mail\ExternalInstallationRequestStatusUpdated;
use App\Models\ExternalInstallationRequest;
use App\Models\InstallationSchedule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;

class ExternalInstallationRequestController extends Controller
{
    public function store(StoreExternalInstallationRequest $request)
    {
        $requestRecord = ExternalInstallationRequest::create([
            'name' => trim($request->name),
            'email' => strtolower(trim($request->email)),
            'phone' => preg_replace('/\s+/', '', trim($request->phone)),
            'address' => trim($request->address),
            'preferred_installation_date' => $request->preferred_installation_date,
            'other_company_name' => trim($request->other_company_name),
            'quotation_file_path' => $request->file('quotation_file')->store('external-installation-quotations'),
            'status' => 'pending_review',
        ]);

        Mail::to($requestRecord->email)->send(new ExternalInstallationRequestSubmitted($requestRecord));

        return response()->json([
            'message' => 'Your installation request was submitted and is pending review.',
            'request' => [
                'id' => $requestRecord->id,
                'status' => $requestRecord->status,
                'status_url' => URL::temporarySignedRoute(
                    'external-installation-requests.status',
                    now()->addDays(30),
                    ['externalInstallationRequest' => $requestRecord->id]
                ),
            ],
        ], 201);
    }

    public function status(Request $request, ExternalInstallationRequest $externalInstallationRequest)
    {
        return response()->json([
            'id' => $externalInstallationRequest->id,
            'name' => $externalInstallationRequest->name,
            'preferred_installation_date' => $externalInstallationRequest->preferred_installation_date,
            'other_company_name' => $externalInstallationRequest->other_company_name,
            'status' => $externalInstallationRequest->status,
            'rejection_reason' => $externalInstallationRequest->rejection_reason,
            'reviewed_at' => $externalInstallationRequest->reviewed_at,
        ]);
    }

    public function adminIndex()
    {
        return response()->json(
            ExternalInstallationRequest::with('installationSchedule')
                ->latest()
                ->get()
        );
    }

    public function downloadQuotation(ExternalInstallationRequest $externalInstallationRequest)
    {
        if (!Storage::exists($externalInstallationRequest->quotation_file_path)) {
            return response()->json(['message' => 'Quotation file not found.'], 404);
        }

        return Storage::download($externalInstallationRequest->quotation_file_path);
    }

    public function confirm(ConfirmExternalInstallationRequest $request, ExternalInstallationRequest $externalInstallationRequest)
    {
        if ($externalInstallationRequest->status !== 'pending_review') {
            return response()->json([
                'message' => 'Only pending external installation requests can be confirmed.',
            ], 422);
        }

        $schedule = DB::transaction(function () use ($request, $externalInstallationRequest) {
            $schedule = InstallationSchedule::create([
                'scheduled_date' => $request->scheduled_date ?: $externalInstallationRequest->preferred_installation_date,
                'scheduled_time' => $request->scheduled_time,
                'assigned_technician' => $request->assigned_technician,
                'notes' => $request->notes,
            ]);

            $externalInstallationRequest->update([
                'status' => 'confirmed',
                'reviewed_by_admin_id' => $request->user()->admin->id,
                'reviewed_at' => now(),
                'installation_schedule_id' => $schedule->id,
            ]);

            return $schedule;
        });

        $updatedRequest = $externalInstallationRequest->fresh()->load('installationSchedule');
        Mail::to($updatedRequest->email)->send(new ExternalInstallationRequestStatusUpdated($updatedRequest));

        return response()->json([
            'message' => 'External installation request confirmed.',
            'request' => $updatedRequest,
            'schedule' => $schedule,
        ]);
    }

    public function reject(RejectExternalInstallationRequest $request, ExternalInstallationRequest $externalInstallationRequest)
    {
        if ($externalInstallationRequest->status !== 'pending_review') {
            return response()->json([
                'message' => 'Only pending external installation requests can be rejected.',
            ], 422);
        }

        $externalInstallationRequest->update([
            'status' => 'rejected',
            'reviewed_by_admin_id' => $request->user()->admin->id,
            'reviewed_at' => now(),
            'rejection_reason' => $request->rejection_reason,
        ]);

        $updatedRequest = $externalInstallationRequest->fresh();
        Mail::to($updatedRequest->email)->send(new ExternalInstallationRequestStatusUpdated($updatedRequest));

        return response()->json([
            'message' => 'External installation request rejected.',
            'request' => $updatedRequest,
        ]);
    }
}
