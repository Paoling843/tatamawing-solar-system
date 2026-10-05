<?php

namespace App\Http\Controllers;

use App\Models\ApplianceItem;
use App\Models\ElectricityBill;
use App\Models\QuotationRequest;
use App\Services\SolarComputationService;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class QuotationRequestController extends Controller
{
    public function __construct(
        protected SolarComputationService $solarComputationService
    ) {}

    /**
     * Customer submits a quotation request from the Solar Computation Engine.
     *
     * The browser sends only the raw inputs (appliances, hours, bills) and the
     * customer's choices (package, panel count, battery). All totals and prices
     * are recomputed here by SolarComputationService so they can't be tampered
     * with. The request goes straight to "pending" for admin review.
     */
    public function store(Request $request)
    {
        $this->authorize('create', QuotationRequest::class);

        $engine = $this->solarComputationService;
        $applianceTypes = implode(',', array_keys(SolarComputationService::APPLIANCES));
        $hpOptions = implode(',', SolarComputationService::HP_OPTIONS);

        $validator = Validator::make($request->all(), [
            // ----- Step 1: appliance rows -----
            'appliances' => 'required|array|min:1',
            'appliances.*.appliance_type' => "required|in:{$applianceTypes}",
            'appliances.*.custom_name' => 'nullable|string|max:255',
            // HP is only needed for aircon and water pump
            'appliances.*.hp' => "required_if:appliances.*.appliance_type,aircon,water_pump|nullable|numeric|in:{$hpOptions}",
            // Watts is typed in for every appliance that doesn't use HP
            'appliances.*.watts' => 'required_unless:appliances.*.appliance_type,aircon,water_pump|nullable|integer|min:1',
            'appliances.*.qty' => 'required|integer|min:1',
            // Daytime hours must sit inside 08:00–16:00
            'appliances.*.day_from' => 'nullable|integer|between:' . SolarComputationService::DAY_START . ',' . (SolarComputationService::DAY_END - 1),
            'appliances.*.day_to' => 'nullable|integer|between:' . (SolarComputationService::DAY_START + 1) . ',' . SolarComputationService::DAY_END,
            // Nighttime hours must sit inside 16:00–08:00 (16 → 32, see the service)
            'appliances.*.night_from' => 'nullable|integer|between:' . SolarComputationService::NIGHT_START . ',' . (SolarComputationService::NIGHT_END - 1),
            'appliances.*.night_to' => 'nullable|integer|between:' . (SolarComputationService::NIGHT_START + 1) . ',' . SolarComputationService::NIGHT_END,

            // ----- Monthly bills (reference only) -----
            'bills' => 'nullable|array|max:2',
            'bills.*.billing_month' => 'nullable|date_format:Y-m',
            'bills.*.amount' => 'nullable|numeric|min:0',
            'bills.*.kwh' => 'nullable|numeric|min:0',

            // ----- Step 3: the customer's selection -----
            'package_kw' => 'required|integer',
            'panel_count' => 'required|integer',
            'battery_ah' => 'required|integer',
        ], [
            'appliances.*.watts.required_unless' => 'Wattage is required for appliance #:position.',
            'appliances.*.qty.required' => 'Quantity is required for appliance #:position.',
            'appliances.*.hp.required_if' => 'Horsepower is required for appliance #:position.',
            'appliances.*.hp.in' => 'Choose a horsepower from the list for appliance #:position.',
            'appliances.*.day_from.between' => 'Daytime hours for appliance #:position must be between 08:00 and 16:00.',
            'appliances.*.day_to.between' => 'Daytime hours for appliance #:position must be between 08:00 and 16:00.',
            'appliances.*.night_from.between' => 'Nighttime hours for appliance #:position must be between 16:00 and 08:00.',
            'appliances.*.night_to.between' => 'Nighttime hours for appliance #:position must be between 16:00 and 08:00.',
        ]);

        // Extra checks that need to compare two fields with each other
        $validator->after(function ($validator) use ($request) {
            foreach ((array) $request->appliances as $i => $row) {
                foreach (['day', 'night'] as $window) {
                    $from = $row["{$window}_from"] ?? null;
                    $to = $row["{$window}_to"] ?? null;

                    if (is_numeric($from) && is_numeric($to) && $to <= $from) {
                        $validator->errors()->add(
                            "appliances.{$i}.{$window}_to",
                            'The ' . ($window === 'day' ? 'daytime' : 'nighttime') . ' end time must be after the start time for appliance #' . ($i + 1) . '.'
                        );
                    }
                }
            }

            // The earlier bill must be from a month before the most recent bill
            $recentMonth = $request->input('bills.0.billing_month');
            $earlierMonth = $request->input('bills.1.billing_month');

            if ($earlierMonth && ! $recentMonth) {
                $validator->errors()->add('bills.1.billing_month', 'Set the most recent bill first.');
            } elseif ($earlierMonth && $recentMonth && $earlierMonth >= $recentMonth) {
                // 'YYYY-MM' strings sort the same way as the dates they stand for
                $validator->errors()->add('bills.1.billing_month', 'The earlier bill must be from before the most recent bill.');
            }
        });

        if ($validator->fails()) {
            return response()->json([
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $customer = $request->user()->customer;

        if (! $customer) {
            return response()->json([
                'message' => 'Unauthorized. Only customers can create quotation requests.',
            ], 403);
        }

        $bills = array_values((array) $request->input('bills', []));

        // Run the engine. If the selection isn't allowed (e.g. a package below
        // the recommended one), this throws and Laravel returns a 422.
        // The bills are only used for the savings estimate.
        $result = $engine->evaluate(
            $request->appliances,
            (int) $request->package_kw,
            (int) $request->panel_count,
            (int) $request->battery_ah,
            $bills,
        );

        $quotationRequest = DB::transaction(function () use ($request, $customer, $engine, $result, $bills) {
            $quotationRequest = QuotationRequest::create([
                'customer_id' => $customer->id,
                // Every package offered by the engine is a hybrid system
                'solar_system_type' => 'hybrid',
                // Older single-bill column: filled with the most recent bill
                'monthly_bill' => $bills[0]['amount'] ?? null,
                'submission_date' => now(),
                'status' => 'pending',
            ]);

            foreach ($request->appliances as $i => $appliance) {
                // The computed numbers for this row, from the engine
                $row = $result['load']['rows'][$i];

                ApplianceItem::create([
                    'quotation_request_id' => $quotationRequest->id,
                    'appliance_name' => $row['name'],
                    'appliance_type' => $appliance['appliance_type'],
                    'hp' => $row['uses_hp'] ? $appliance['hp'] : null,
                    'wattage' => (int) round($row['watts']),
                    'quantity' => $row['qty'],
                    // Older column: total hours per day (day + night)
                    'usage_hours_per_day' => $row['day_hours'] + $row['night_hours'],
                    'day_from' => $appliance['day_from'] ?? null,
                    'day_to' => $appliance['day_to'] ?? null,
                    'night_from' => $appliance['night_from'] ?? null,
                    'night_to' => $appliance['night_to'] ?? null,
                    'day_wh' => $row['day_wh'],
                    'night_wh' => $row['night_wh'],
                ]);
            }

            foreach ($bills as $i => $bill) {
                $month = $bill['billing_month'] ?? null;
                $amount = $bill['amount'] ?? null;
                $kwh = $bill['kwh'] ?? null;

                // Skip a bill the customer left completely empty
                if (! $month && ($amount === null || $amount === '') && ($kwh === null || $kwh === '')) {
                    continue;
                }

                ElectricityBill::create([
                    'quotation_request_id' => $quotationRequest->id,
                    'sequence' => $i + 1,
                    'billing_month' => $month ? $month . '-01' : null,
                    'amount' => $amount === '' ? null : $amount,
                    'kwh' => $kwh === '' ? null : $kwh,
                ]);
            }

            $engine->save($quotationRequest, $result);

            return $quotationRequest;
        });

        AuditLogger::log(
            'quotation_created',
            'Created a quotation request for admin review.',
            QuotationRequest::class,
            $quotationRequest->id,
            'Quotation Request #' . $quotationRequest->id
        );

        return response()->json([
            'message' => 'Quotation request submitted for review.',
            'quotation_request' => $quotationRequest->load([
                'applianceItems',
                'solarComputation',
                'electricityBills',
            ]),
        ], 201);
    }

    /**
     * Customer confirms the quotation request, and ma change ang status to pending for admin review. 
     */

    public function submit(Request $request, QuotationRequest $quotationRequest)
    {
        $this->authorize('submit', $quotationRequest);

        $customer = $request->user()->customer;

        if(! $customer || $quotationRequest->customer_id !== $customer->id) {
            return response()->json([
                'message' => 'Forbidden.'
            ], 403);
        }

        $quotationRequest->update([
            'status' => 'pending',
        ]);

        AuditLogger::log(
            'quotation_submitted',
            'Submitted quotation request for admin review.',
            QuotationRequest::class,
            $quotationRequest->id,
            'Quotation Request #' . $quotationRequest->id
        );

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
        $this->authorize('viewAny', QuotationRequest::class);

        $customer = $request->user()->customer;

        $quotations = QuotationRequest::where('customer_id', $customer->id)
            ->with(['applianceItems', 'solarComputation', 'electricityBills', 'quotation'])
            ->latest()
            ->get();

        return response()->json($quotations);
    }

    /**
     * Mag show ng isang quotation requst na may details.
     */

    public function show(Request $request, QuotationRequest $quotationRequest)
    {
        $this->authorize('view', $quotationRequest);

        $customer = $request->user()->customer;

        if (! $customer || $quotationRequest->customer_id !== $customer->id) {
            return response()->json([
                'message' => 'Forbidden.'
            ], 403);
        }

        $quotationRequest->load(['applianceItems', 'solarComputation', 'electricityBills', 'quotation']);

        return response()->json($quotationRequest);
    }
}
