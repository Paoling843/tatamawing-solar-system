<?php

namespace App\Http\Controllers;

use App\Http\Requests\ConfirmExternalInstallationRequest;
use App\Http\Requests\RejectExternalInstallationRequest;
use App\Http\Requests\StoreExternalInstallationRequest;
use App\Mail\ExternalInstallationRequestSubmitted;
use App\Mail\ExternalInstallationRequestStatusUpdated;
use App\Models\ExternalInstallationRequest;
use App\Models\InstallationSchedule;
use App\Services\AuditLogger;
use App\Services\Notifier;
use App\Support\BulanBarangays;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class ExternalInstallationRequestController extends Controller
{
    public function store(StoreExternalInstallationRequest $request)
    {
        // Same location inputs as the quote builder; the barangay is saved
        // with its official spelling and `address` is built from the parts
        $barangay = BulanBarangays::canonical($request->barangay);
        $purok = $request->purok ?: null;

        $file = $request->file('quotation_file');

        // The request and its file are saved together, or not at all
        $requestRecord = DB::transaction(function () use ($request, $barangay, $purok, $file) {
            $record = ExternalInstallationRequest::create([
                'name' => trim($request->name),
                'email' => strtolower(trim($request->email)),
                'phone' => preg_replace('/\s+/', '', trim($request->phone)),
                'address' => collect([$purok, "Brgy. {$barangay}", BulanBarangays::MUNICIPALITY, BulanBarangays::PROVINCE])->filter()->implode(', '),
                'install_purok' => $purok,
                'install_barangay' => $barangay,
                'install_municipality' => BulanBarangays::MUNICIPALITY,
                'install_province' => BulanBarangays::PROVINCE,
                'site_description' => trim((string) $request->site_description) ?: null,
                'preferred_installation_date' => $request->preferred_installation_date,
                'other_company_name' => trim($request->other_company_name),
                'status' => 'pending_review',
            ]);

            // Kept in the database: Render's disk is wiped on every restart
            $record->quotationFile()->create([
                'original_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
                'content' => base64_encode($file->get()),
            ]);

            return $record;
        });
    
        try{
             Mail::to($requestRecord->email)->send(new ExternalInstallationRequestSubmitted($requestRecord));
        } catch (\Throwable $e) {
            report($e);
        }

        Notifier::newExternalRequest($requestRecord);
            return response()->json([
                'message' => 'Your installation request was submitted and is pending review.',
                'request' => [
                    'id' => $requestRecord->id,
                    'status' => $requestRecord->status,
                    'status_url' => $requestRecord->statusPageUrl(),
                ],
            ], 201);
    }

    /**
     * Data for the website's status page (signed link, no login).
     * Emails sent before the status page existed link here directly; a
     * browser opening one is sent on to the page instead of seeing JSON.
     */
    public function status(Request $request, ExternalInstallationRequest $externalInstallationRequest)
    {
        if (! $request->expectsJson()) {
            return redirect()->away(ExternalInstallationRequest::statusPage(
                $externalInstallationRequest->id,
                $request->only(['expires', 'signature'])
            ));
        }

        $schedule = $externalInstallationRequest->installationSchedule;

        return response()->json([
            'id' => $externalInstallationRequest->id,
            'name' => $externalInstallationRequest->name,
            'address' => $externalInstallationRequest->address,
            'preferred_installation_date' => $externalInstallationRequest->preferred_installation_date,
            'other_company_name' => $externalInstallationRequest->other_company_name,
            'status' => $externalInstallationRequest->status,
            'rejection_reason' => $externalInstallationRequest->rejection_reason,
            'reviewed_at' => $externalInstallationRequest->reviewed_at,
            'submitted_at' => $externalInstallationRequest->created_at,
            'scheduled_date' => $schedule?->scheduled_date?->toDateString(),
            'scheduled_time' => $schedule?->scheduled_time,
        ]);
    }

    public function adminIndex()
    {
        $this->authorize('viewAny', ExternalInstallationRequest::class);

        return response()->json(
            ExternalInstallationRequest::with('installationSchedule')
                ->latest()
                ->get()
        );
    }

    public function downloadQuotation(ExternalInstallationRequest $externalInstallationRequest)
    {
        $this->authorize('view', $externalInstallationRequest);

        $file = $externalInstallationRequest->quotationFile;

        if ($file) {
            $extension = match ($file->mime_type) {
                'application/pdf' => 'pdf',
                'image/png' => 'png',
                default => 'jpg',
            };

            return response(base64_decode($file->content), 200, [
                'Content-Type' => $file->mime_type,
                'Content-Disposition' => 'attachment; filename="quotation-'.$externalInstallationRequest->id.'.'.$extension.'"',
            ]);
        }

        // Requests sent before files moved into the database
        $path = $externalInstallationRequest->quotation_file_path;
        if ($path && Storage::exists($path)) {
            return Storage::download($path);
        }

        return response()->json([
            'message' => 'The file for this request is no longer available. Ask the customer to send it again.',
        ], 404);
    }

    public function confirm(ConfirmExternalInstallationRequest $request, ExternalInstallationRequest $externalInstallationRequest)
    {
        $this->authorize('confirm', $externalInstallationRequest);

        if ($externalInstallationRequest->status !== 'pending_review') {
            return response()->json([
                'message' => 'Only pending external installation requests can be confirmed.',
            ], 422);
        }

        $admin = $request->user()->admin()->firstOrCreate([
            'user_id' => $request->user()->id,
        ], [
            'department' => 'Operations',
        ]);

        $schedule = DB::transaction(function () use ($request, $externalInstallationRequest, $admin) {
            $schedule = InstallationSchedule::create([
                'scheduled_date' => $request->scheduled_date ?: $externalInstallationRequest->preferred_installation_date,
                'scheduled_time' => $request->scheduled_time,
                'assigned_technician' => $request->assigned_technician,
                'notes' => $request->notes,
            ]);

            $externalInstallationRequest->update([
                'status' => 'confirmed',
                'reviewed_by_admin_id' => $admin->id,
                'reviewed_at' => now(),
                'installation_schedule_id' => $schedule->id,
            ]);

            return $schedule;
        });

        $updatedRequest = $externalInstallationRequest->fresh()->load('installationSchedule');
        AuditLogger::log(
            'external_installation_confirmed',
            'Confirmed external installation request.',
            ExternalInstallationRequest::class,
            $updatedRequest->id,
            'External Installation Request #' . $updatedRequest->id,
            ['scheduled_date' => $schedule->scheduled_date, 'scheduled_time' => $schedule->scheduled_time]
        );
        try{
            Mail::to($updatedRequest->email)->send(new ExternalInstallationRequestStatusUpdated($updatedRequest));
        } catch (\Throwable $e) {
            report($e);
        }
        

        return response()->json([
            'message' => 'External installation request confirmed.',
            'request' => $updatedRequest,
            'schedule' => $schedule,
        ]);
    }

    public function reject(RejectExternalInstallationRequest $request, ExternalInstallationRequest $externalInstallationRequest)
    {
        $this->authorize('reject', $externalInstallationRequest);

        if ($externalInstallationRequest->status !== 'pending_review') {
            return response()->json([
                'message' => 'Only pending external installation requests can be rejected.',
            ], 422);
        }

        $admin = $request->user()->admin()->firstOrCreate([
            'user_id' => $request->user()->id,
        ], [
            'department' => 'Operations',
        ]);

        $externalInstallationRequest->update([
            'status' => 'rejected',
            'reviewed_by_admin_id' => $admin->id,
            'reviewed_at' => now(),
            'rejection_reason' => $request->rejection_reason,
        ]);

        $updatedRequest = $externalInstallationRequest->fresh();
        AuditLogger::log(
            'external_installation_rejected',
            'Rejected external installation request.',
            ExternalInstallationRequest::class,
            $updatedRequest->id,
            'External Installation Request #' . $updatedRequest->id,
            ['rejection_reason' => $updatedRequest->rejection_reason]
        );

        try {
            Mail::to($updatedRequest->email)->send(new ExternalInstallationRequestStatusUpdated($updatedRequest));
        } catch (\Throwable $e) {
            // The rejection is already saved — log the mail failure instead of returning a 500
            report($e);
        }

        return response()->json([
            'message' => 'External installation request rejected.',
            'request' => $updatedRequest,
        ]);
    }
}
