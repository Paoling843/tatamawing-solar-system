<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\PurchaseRequest;
use Illuminate\Support\Facades\Validator;

class InstallationScheduleController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'quotation_id' => 'required|exists:quotations,id',
            'scheduled_date' => 'required|date|after:today',
            'scheduled_time' => 'required|date_format:H:i',
            'assigned_technician' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $quotation = Quotation::find($request->quotation_id);

        if ($quotation->quotationRequest->status !== 'approved') {
            return response()->json([
                'message' => 'Installation can only be scheduled for approved quotation requests.'
            ], 422);
        }

        $purchaseRequest = PurchaseRequest::where('quotation_id', $request->quotation_id)->first();

        if (!$purchaseRequest) {
            return response()->json([
                'message' => 'A purchase request must be generated before scheduling an installation.'
            ], 422);
        }

        if ($purchaseRequest->procurement_status !== 'confirmed') {
            return response()->json([
                'message' => 'Installation can only be scheduled after the supplier has confirmed the availability of all materials.'
            ], 422);
        }

        if (InstallationSchedule::where('quotation_id', $request->quotation_id)->exists()) {
            return response()->json([
                'message' => 'An installation schedule already exists for this quotation.'
            ], 422);
        }

        $schedule = InstallationSchedule::Create([
            'quotation_id' => $request->quotation_id,
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'assigned_technician' => $request->assigned_technician,
        ]);
        

        return response()->json([
            'message' => 'Installation schedule created successfully.',
            'schedule' => $schedule->load([
                'quotation.quotationRequest.customer.user',
                'quotation.quotationRequest.solarComputation',
            ]),
        ], 201);
    }

    public function adminIndex()
    {
        $schedules = InstallationSchedule::with([
            'quotation.quotationRequest.customer.user',
            'quotation.quotationRequest.solarComputation',
        ])
        ->orderBy('scheduled_date', 'asc')
        ->get();

        return response()->json($schedules);
    }

    public function update(Request $request, InstallationSchedule $installationSchedule)
    {
        $validator = Validator::make($request->all(), [
            'scheduled_date' => 'required|date|after:today',
            'scheduled_time' => 'required|date_format:H:i',
            'assigned_technician' => 'required|string|max:255',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        $installationSchedule->update([
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'assigned_technician' => $request->assigned_technician,
        ]);

        return response()->json([
            'message' => 'Installation schedule created successfully.',
            'schedule' => $installationSchedule->load([
                'quotation.quotationRequest.customer.user',
                'quotation.quotationRequest.solarComputation',
            ]),
        ]);
    }

    public function updateStatus(Request $request, InstallationSchedule $installationSchedule)
    {
        $validator = Validator::make($request->all(), [
            'status' => 'required|in:scheduled,in_progress,completed,delayed',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        $installationSchedule->update([
            'status' => $request->status,
        ]);

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
        $customer = $request->user()->customer;

        $schedules = InstallationSchedule::whereHas('quotation.quotationRequest', function ($query) use ($customer) {
            $query->where('customer_id', $customer->id);
        })
        ->with([
            'quotation.quotationRequest.customer.user',
            'quotation.quotationRequest.solarComputation',
        ])
        ->orderBy('scheduled_date', 'asc')
        ->get();

        return response()->json($schedules);
    }
}
