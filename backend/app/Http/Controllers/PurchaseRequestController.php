<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePurchaseRequest;
use App\Http\Requests\UpdateMaterialItemsRequest;
use App\Http\Requests\UpdatePurchaseRequestStatus;
use App\Models\MaterialItem;
use App\Models\PurchaseRequest;
use App\Models\Quotation;
use App\Services\AuditLogger;
use Illuminate\Support\Facades\DB;

class PurchaseRequestController extends Controller
{
    public function store(StorePurchaseRequest $request)
    {
        $this->authorize('create', PurchaseRequest::class);

        $quotation = Quotation::find($request->quotation_id);

        if ($quotation->quotationRequest->status !== 'approved') {
            return response()->json([
                'message' => 'Purchase requests can only be generated for approved quotation requests.'
            ], 422);
        }

        if (PurchaseRequest::where('quotation_id', $request->quotation_id)->exists()) {
                return response()->json([
                    'message' => 'A purchase request already exists for this quotation.'
                ], 422);
        }

        $purchaseRequest = DB::transaction(function () use ($request) {
            $purchaseRequest = PurchaseRequest::create([
                'quotation_id' => $request->quotation_id,
                'request_date' => now(),
                'procurement_status' => 'pending',
            ]);

            foreach ($request->materials as $material) {
                MaterialItem::create([
                    'purchase_request_id' => $purchaseRequest->id,
                    'material_name' => trim($material['material_name']),
                    'quantity' => (int) $material['quantity'],
                    'unit' => $material['unit'] ? trim($material['unit']) : null,
                    'unit_price' => $material['unit_price'] !== null && $material['unit_price'] !== '' ? (float) $material['unit_price'] : null,
                    'availability' => 'available',
                ]);
            }

            return $purchaseRequest;

        });

        AuditLogger::log(
            'purchase_request_created',
            'Created a purchase request.',
            PurchaseRequest::class,
            $purchaseRequest->id,
            'Purchase Request #' . $purchaseRequest->id
        );

        return response()->json([
            'message' => 'Purchase request generated successfully.',
            'purchase_request' => $purchaseRequest->load([
                'materialItems',
                'quotation.quotationRequest.customer.user',
            ]),
        ], 201);
    }

    public function adminIndex()
    {
        $this->authorize('viewAny', PurchaseRequest::class);

        $purchaseRequests = PurchaseRequest::with([
            'materialItems',
            'quotation.quotationRequest.customer.user',
        ])
        ->latest()
        ->get();

        return response()->json($purchaseRequests);
    }

    public function show(PurchaseRequest $purchaseRequest)
    {
        $this->authorize('view', $purchaseRequest);

        return response()->json($purchaseRequest->load([
            'materialItems',
            'quotation.quotationRequest.customer.user',
        ]));
    }

    public function confirm(UpdatePurchaseRequestStatus $request, PurchaseRequest $purchaseRequest)
    {
        $this->authorize('confirm', $purchaseRequest);

        $purchaseRequest->update([
            'procurement_status' => $request->procurement_status,
        ]);

        AuditLogger::log(
            'purchase_request_status_updated',
            'Updated purchase request procurement status.',
            PurchaseRequest::class,
            $purchaseRequest->id,
            'Purchase Request #' . $purchaseRequest->id,
            ['procurement_status' => $purchaseRequest->procurement_status]
        );

        return response()->json([
            'message' => 'Purchase request status updated.',
            'purchase_request' => $purchaseRequest->load('materialItems'),
        ]);
    }

    public function updateItems(UpdateMaterialItemsRequest $request, PurchaseRequest $purchaseRequest)
    {
        $this->authorize('updateItems', $purchaseRequest);

        foreach ($request->items as $itemData) {
            $materialItem = MaterialItem::find($itemData['id']);

            if ($materialItem->purchase_request_id === $purchaseRequest->id) {
                $materialItem->update([
                    'availability' => $itemData['availability'],
                    'unit_price' => $itemData['unit_price'] ?? $materialItem->unit_price,
                ]);
            }
        }

        AuditLogger::log(
            'purchase_request_items_updated',
            'Updated purchase request material items.',
            PurchaseRequest::class,
            $purchaseRequest->id,
            'Purchase Request #' . $purchaseRequest->id,
            ['item_count' => count($request->items)]
        );

        return response()->json([
            'message' => 'Material items updated successfully.',
            'puchase_request' => $purchaseRequest->load('materialItems'),
        ]);
    }
}
