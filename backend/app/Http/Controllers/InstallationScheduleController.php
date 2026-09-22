<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreScheduleRequest;
use App\Http\Requests\UpdateScheduleRequest;
use Illuminate\Http\Request;
use App\Models\InstallationSchedule;
use App\Models\Quotation;
use App\Models\Customer;
use App\Models\PurchaseRequest;

class InstallationScheduleController extends Controller
{
    public function store(StoreScheduleRequest $request)
    {
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

            $scheduleData['quotation_id'] = $request->quotation_id;
        } else {
            $scheduleData['customer_id'] = $request->customer_id;
        }

        $schedule = InstallationSchedule::create($scheduleData);

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
        $customers = Customer::with('user')
            ->get()
            ->sortBy(fn ($c) => $c->user->name ?? '')
            ->values();

        return response()->json($customers);
    }

    public function update(UpdateScheduleRequest $request, InstallationSchedule $installationSchedule)
    {
        $installationSchedule->update([
            'scheduled_date' => $request->scheduled_date,
            'scheduled_time' => $request->scheduled_time,
            'assigned_technician' => trim($request->assigned_technician),
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
