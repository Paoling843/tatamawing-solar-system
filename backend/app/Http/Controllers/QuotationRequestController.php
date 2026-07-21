<?php

namespace App\Http\Controllers;

use App\Models\ApplianceItem;
use App\Models\QuotationRequest;
use App\Services\SolarComputationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class QuotationRequestController extends Controller
{
    public function __construct(
        protected SolarComputationService $solarComputationService
    ) {}

    /**
     * Customer submits a new quotation request kasama nag appliance data.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'solar_system_type' => 'required|in:on-grid,off-grid,hybrid',
            'monthly_bill' => 'nullable|numeric|min:0',
            'appliances' => 'required|array|min:1',
            'appliances.*.appliance_name' => 'required|string|max:255',
            'appliances.*.wattage' => 'required|numeric|min:0',
            'appliances.*.quantity' => 'required|integer|min:1',
            'appliances.*.usage_hours_per_day' => 'required|numeric|min:0|max:24',
        ]);

        if($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $customer = $request->user()->customer;

        if (! $customer) {
            return response()->json([
                'message' => 'Unautorized. Only customers can create quotation requests.',
            ], 403);
        }

        $quotationRequest = DB::transaction(function () use ($request, $customer) {
            $quotationRequest = QuotationRequest::create([
                'customer_id' => $customer->id,
                'solar_system_type' => $request->solar_system_type,
                'monthly_bill' =>$request->monthly_bill,
                'submission_date' => now(),
                'status' => 'draft',
            ]);

            foreach ($request->appliances as $appliance) {
                ApplianceItem::create([
                    'quotation_request_id' => $quotationRequest->id,
                    'appliance_name' => $appliance['appliance_name'],
                    'wattage' => $appliance['wattage'],
                    'quantity' => $appliance['quantity'],
                    'usage_hours_per_day' => $appliance['usage_hours_per_day'],
                ]);
            }

            return $quotationRequest;
        });

        $quotationRequest->load('applianceItems');

        $computation = $this->solarComputationService->compute($quotationRequest);

        return response()->json([
            'message' => 'Quotation computed successfully',
            'quotation_request' => $quotationRequest,
            'computation' => $computation,
        ], 201);
    }

    /**
     * Customer confirms the quotation request, and ma change ang status to pending for admin review. 
     */

    public function submit(Request $request, QuotationRequest $quotationRequest)
    {
        $customer = $request->user()->customer;

        if(! $customer || $quotationRequest->customer_id !== $customer->id) {
            return response()->json([
                'message' => 'Forbidden.'
            ], 403);
        }

        $quotationRequest->update([
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Quotation submitted for admin review.',
            'quotation_request' => $quotationRequest,
        ]);
    }

    /**
     * List the quotation requests of the authenticated customer.
     */

    public function index(Request $request)
    {
        $customer = $request->user()->customer;

        $quotations = QuotationRequest::where('customer_id', $customer->id)
            ->with(['applianceItems', 'solarComputation', 'quotation'])
            ->latest()
            ->get();

        return response()->json($quotations);
    }

    /**
     * Mag show ng isang quotation requst na may details.
     */

    public function show(Request $request, QuotationRequest $quotationRequest)
    {
        $customer = $request->user()->customer;

        if (! $customer || $quotationRequest->customer_id !== $customer->id) {
            return response()->json([
                'message' => 'Forbidden.'
            ], 403);
        }

        $quotationRequest->load(['applianceItems', 'solarComputation', 'quotation']);

        return response()->json($quotationRequest);
    }
}
