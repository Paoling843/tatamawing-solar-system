<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePurchaseRequest;
use App\Http\Requests\UpdateMaterialItemsRequest;
use App\Http\Requests\UpdatePurchaseRequestStatus;
use Illuminate\Http\Request;
use App\Models\ApplianceItem;
use App\Models\MaterialItem;
use App\Models\PurchaseRequest;
use App\Models\Quotation;
use App\Models\QuotationRequest;
use Illuminate\Support\Facades\DB;

class PurchaseRequestController extends Controller
{
    public function store(StorePurchaseRequest $request)
    {
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
        return response()->json($purchaseRequest->load([
            'materialItems',
            'quotation.quotationRequest.customer.user',
        ]));
    }

    public function confirm(UpdatePurchaseRequestStatus $request, PurchaseRequest $purchaseRequest)
    {
        $purchaseRequest->update([
            'procurement_status' => $request->procurement_status,
        ]);

        return response()->json([
            'message' => 'Purchase request status updated.',
            'purchase_request' => $purchaseRequest->load('materialItems'),
        ]);
    }

    public function updateItems(UpdateMaterialItemsRequest $request, PurchaseRequest $purchaseRequest)
    {
        foreach ($request->items as $itemData) {
            $materialItem = MaterialItem::find($itemData['id']);

            if ($materialItem->purchase_request_id === $purchaseRequest->id) {
                $materialItem->update([
                    'availability' => $itemData['availability'],
                    'unit_price' => $itemData['unit_price'] ?? $materialItem->unit_price,
                ]);
            }
        }

        return response()->json([
            'message' => 'Material items updated successfully.',
            'puchase_request' => $purchaseRequest->load('materialItems'),
        ]);
    }
}
