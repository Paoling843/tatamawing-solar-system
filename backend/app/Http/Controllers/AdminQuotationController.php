<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Admin;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class AdminQuotationController extends Controller
{
    public function index (Request $request)
    {
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
        $quotationRequest->load([
            'customer.user',
            'applianceItems',
            'solarComputation',
            'quotation',
        ]);

        return response()->json($quotationRequest);
    }

    public function approve(Request $request, QuotationRequest $quotationRequest)
    {
        $validator = Validator::make($request->all(), [
            'adjusted_cost' => ['nullable', 'numeric', 'min:0'],
            'labor_fee' => ['nullable', 'numeric', 'min:0'],
            'transportation_fee' => ['nullable', 'numeric', 'min:0'],
        ]);

        if($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        if($quotationRequest->status !== 'pending') {
            return response()->json([
                'message' => 'Only pending quotation requests can be approved.',
            ], 422);
        }

        $admin = $request->user()->admin;

        $computedCost = $quotationRequest->solarComputation->estimated_cost;
        $adjustedCost = $request->adjusted_cost ?? $computedCost;
        $laborFee = $request->labor_fee ?? 0;
        $transportationFee = $request->transportation_fee ?? 0;
        $totalAmount = $adjustedCost + $laborFee + $transportationFee;

        $quotation = DB::transaction(function () use (
            $quotationRequest,
            $admin,
            $adjustedCost,
            $laborFee,
            $transportationFee,
            $totalAmount,
        ) {

            $quotationRequest->update(['status' => 'approved']);

            return Quotation::create([
                'quotation_request_id' => $quotationRequest->id,
                'approved_by_admin_id' => $admin->id,
                'approval_date' => now(),
                'adjusted_cost' => $adjustedCost,
                'labor_fee' => $laborFee,
                'transportation_fee' => $transportationFee,
                'total_amount' => $totalAmount,
            ]);
        });

        return response()->json([
            'message' => 'Quotation request approved successfully!',
            'quotation_request' => $quotationRequest->load([
                'customer.user',
                'applianceItems',
                'solarComputation',
                'quotation',
            ]),
        ]);
    }

    public function reject(Request $request, QuotationRequest $quotationRequest) 
    {
        $validator = Validator::make($request->all(), [
            'rejection_reason' => 'required|string|max:500',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Only pending quotation requests can be rejected.',
            ], 422);    
        }

        $quotationRequest->update([
            'status' => 'rejected',
            'notes' => $request->rejection_reason,
        ]);

        return response()->json([
            'message' => 'Quotation rejected.',
            'quotation_request' => $quotationRequest,
        ]);

    }
}
