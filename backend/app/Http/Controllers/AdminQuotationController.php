<?php

namespace App\Http\Controllers;

use App\Http\Requests\RejectQuotationRequest;
use App\Mail\QuotationApproved;
use App\Mail\QuotationRejected;
use App\Services\AuditLogger;
use App\Services\Notifier;
use Illuminate\Http\Request;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;

class AdminQuotationController extends Controller
{
    public function index (Request $request)
    {
        $this->authorize('viewAny', QuotationRequest::class);

        $status = $request->query('status');

        $query = QuotationRequest::with([
                'customer.user',
                'applianceItems',
                'solarComputation',
                'quotation',
        ])
        ->latest();

        if($status) {
            $query->where('status', $status);
        }

        $quotation = $query->get();

        return response()->json($quotation);
    }

    public function show(QuotationRequest $quotationRequest)
    {
        $this->authorize('view', $quotationRequest);

        $quotationRequest->load([
            'customer.user',
            'applianceItems',
            'solarComputation',
            // So the detail page can tell an averaged bill from a single one
            'electricityBills',
            'quotation.installationSchedule',
        ]);

        return response()->json($quotationRequest);
    }

    public function approve(Request $request, QuotationRequest $quotationRequest)
    {
        $this->authorize('approve', $quotationRequest);

        $validator = $request->validate([
            // Always sent by the approve form (it starts at the estimate), so
            // nothing can be approved without the admin seeing the price
            'adjusted_cost' => ['required', 'numeric', 'min:0', 'max:100000000'],
            'labor_fee' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            'transportation_fee' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
            // Why the total differs from the estimate; shown to the customer
            'price_note' => ['nullable', 'string', 'max:500'],
        ], [
            'adjusted_cost.required' => 'Enter the base cost to approve this quotation.',
        ]);

        if($quotationRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending quotation requests can be approved.',
            ], 422);
        }

        $admin = $request->user()->admin()->firstOrCreate([
            'user_id' => $request->user()->id,
        ], [
            'department' => 'Operations',
        ]);

        $adjustedCost = $request->adjusted_cost;
        $laborFee = $request->labor_fee ?? 0;
        $transportationFee = $request->transportation_fee ?? 0;
        $totalAmount = $adjustedCost + $laborFee + $transportationFee;
        $priceNote = trim((string) $request->price_note) ?: null;

        $quotation = DB::transaction(function () use (
            $quotationRequest,
            $admin,
            $adjustedCost,
            $laborFee,
            $transportationFee,
            $totalAmount,
            $priceNote,
        ) {
            $lockedQuotationRequest = QuotationRequest::query()
                ->lockForUpdate()
                ->findOrFail($quotationRequest->id);

            if ($lockedQuotationRequest->status !== 'pending' || $lockedQuotationRequest->quotation()->exists()) {
                return null;
            }

            $lockedQuotationRequest->update(['status' => 'approved']);

            return Quotation::create([
                'quotation_request_id' => $lockedQuotationRequest->id,
                'approved_by_admin_id' => $admin->id,
                'approval_date' => now(),
                'adjusted_cost' => $adjustedCost,
                'labor_fee' => $laborFee,
                'transportation_fee' => $transportationFee,
                'total_amount' => $totalAmount,
                'price_note' => $priceNote,
            ]);
        });

        if (! $quotation) {
            return response()->json([
                'message' => 'Only pending quotation requests can be approved.',
            ], 422);
        }

        $quotationRequest->refresh();
        $quotation->load('quotationRequest.customer.user', 'quotationRequest.solarComputation');
        $emailSent = $this->emailCustomer(
            $quotation->quotationRequest->customer->user->email ?? null,
            new QuotationApproved($quotation),
        );

        Notifier::quotationApproved($quotation);


        AuditLogger::log(
            'quotation_approved',
            'Approved quotation request.',
            QuotationRequest::class,
            $quotationRequest->id,
            'Quotation Request ' . $quotationRequest->reference,
            [
                'adjusted_cost' => $adjustedCost,
                'labor_fee' => $laborFee,
                'transportation_fee' => $transportationFee,
                'total_amount' => $totalAmount,
                'estimated_cost' => $quotation->estimatedCost(),
                'price_note' => $priceNote,
                'email_sent' => $emailSent,
            ]
        );

        return response()->json([
            'message' => 'Quotation request approved successfully!',
            'email_sent' => $emailSent,
            'email_warning' => $emailSent ? null : self::EMAIL_WARNING,
            'quotation_request' => $quotationRequest->load([
                'customer.user',
                'applianceItems',
                'solarComputation',
                'quotation',
            ]),
        ]);
    }

    // Shown to the admin when the decision was saved but the email didn't go out
    private const EMAIL_WARNING = "The email to the customer couldn't be sent.";

    /**
     * Emails the customer about a decision. The decision is already saved,
     * so a mail problem is logged and reported back (false) instead of
     * failing the request.
     */
    private function emailCustomer(?string $email, Mailable $mail): bool
    {
        if (! $email) {
            return false;
        }

        try {
            Mail::to($email)->send($mail);

            return true;
        } catch (\Throwable $e) {
            report($e);

            return false;
        }
    }

    public function reject(RejectQuotationRequest $request, QuotationRequest $quotationRequest) 
    {
        $this->authorize('reject', $quotationRequest);

        $quotationRequest->update([
            'status' => 'rejected',
            'notes' => trim($request->rejection_reason),
        ]);

        $quotationRequest->loadMissing('customer.user');
        $emailSent = $this->emailCustomer(
            $quotationRequest->customer->user->email ?? null,
            new QuotationRejected($quotationRequest),
        );

        Notifier::quotationRejected($quotationRequest);

        AuditLogger::log(
            'quotation_rejected',
            'Rejected quotation request.',
            QuotationRequest::class,
            $quotationRequest->id,
            'Quotation Request ' . $quotationRequest->reference,
            [
                'rejection_reason' => trim($request->rejection_reason),
                'email_sent' => $emailSent,
            ]
        );

        return response()->json([
            'message' => 'Quotation rejected.',
            'email_sent' => $emailSent,
            'email_warning' => $emailSent ? null : self::EMAIL_WARNING,
            'quotation_request' => $quotationRequest,
        ]);

    }
}
