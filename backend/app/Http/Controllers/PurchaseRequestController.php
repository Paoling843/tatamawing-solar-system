<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreMaterialsPdfRequest;
use App\Models\PurchaseRequest;
use App\Models\Quotation;
use App\Services\AuditLogger;
use App\Services\PurchaseRequestRecorder;
use Illuminate\Support\Facades\DB;

/**
 * Purchase requests: the materials lists sent to suppliers on Messenger
 * (as the PDF or a copied message). Listed and deleted on the quotation page;
 * all of them appear in the Procurement report.
 */
class PurchaseRequestController extends Controller
{
    /** The purchase requests sent for one quotation, newest first */
    public function index(Quotation $quotation)
    {
        return response()->json([
            'purchase_requests' => $quotation->purchaseRequests()
                ->with(['items', 'sentBy:id,name'])
                ->latest('request_date')
                ->latest('id')
                ->get(),
        ]);
    }

    /**
     * "Copy & save" on the materials form: the admin pastes the list into
     * Messenger instead of sending the PDF, so only the record is saved here.
     * Same checks and same record as the "Download PDF" button.
     */
    public function store(StoreMaterialsPdfRequest $request, Quotation $quotation, PurchaseRequestRecorder $recorder)
    {
        $quotation->load('quotationRequest');
        $recorder->ensureApproved($quotation);

        $purchaseRequest = $recorder->record($quotation, $request->validated(), $request->user()?->id);

        return response()->json([
            'message' => 'Purchase request saved.',
            'purchase_request' => $purchaseRequest->load('items'),
        ]);
    }

    /** Removes one sent by mistake (or replaced by a corrected list), so the report stays right */
    public function destroy(PurchaseRequest $purchaseRequest)
    {
        $purchaseRequest->load('quotation.quotationRequest', 'items');
        $reference = $purchaseRequest->quotation?->quotationRequest?->reference;

        DB::transaction(function () use ($purchaseRequest) {
            $purchaseRequest->items()->delete();
            $purchaseRequest->delete();
        });

        AuditLogger::log(
            'purchase_request_deleted',
            'Deleted a purchase request.',
            PurchaseRequest::class,
            $purchaseRequest->id,
            'Purchase request for ' . ($reference ?? 'quotation #' . $purchaseRequest->quotation_id),
            [
                'request_date' => $purchaseRequest->request_date?->toDateString(),
                'items' => $purchaseRequest->items->map(fn ($item) => "{$item->quantity} {$item->unit} {$item->material_name}")->all(),
            ]
        );

        return response()->json(['message' => 'Purchase request deleted.']);
    }
}
