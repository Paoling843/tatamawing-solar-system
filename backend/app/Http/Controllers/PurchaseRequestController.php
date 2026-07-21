<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ApplianceItem;
use App\Models\MaterialItem;
use App\Models\PurchaseRequest;
use App\Models\Quotation;
use App\Models\Supplier;
use App\Models\QuotationRequest;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class PurchaseRequestController extends Controller
{
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'quotation_id' => 'required|exists:quotations,id',
            'supplier_id' => 'required|exists:suppliers,id',
            'materials' => 'required|array|min:1',
            'materials.*.material_name' => 'required|string|max:255',
            'materials.*.quantity' => 'required|integer|min:1',
            'materials.*.unit' => 'nullable|string|max:50',
            'materials.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        } 

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
                'supplier_id' => $request->supplier_id,
                'request_date' => now(),
                'procurement_status' => 'pending',
            ]);

            foreach ($request->materials as $material) {
                MaterialItem::create([
                    'purchase_request_id' => $purchaseRequest->id,
                    'material_name' => $material['material_name'],
                    'quantity' => $material['quantity'],
                    'unit' => $material['unit'] ?? null,
                    'unit_price' => $material['unit_price'] ?? null,
                    'availability' => 'available',
                ]);
            }

            return $purchaseRequest;

        });

        return response()->json([
            'message' => 'Purchase request generated successfully.',
            'purchase_request' => $purchaseRequest->load([
                'supplier.user',
                'materialItems',
                'quotation.quotationRequest.customer.user',
            ]),
        ], 201);    
    }

    public function adminIndex()
    {
        $purchaseRequests = PurchaseRequest::with([
            'supplier.user',
            'materialItems',
            'quotation.quotationRequest.customer.user',
        ])
        ->latest()
        ->get();

        return response()->json($purchaseRequests);
    }

    public function supplierIndex(Request $request)
    {
        $supplier = $request->user()->supplier;

        $purchaseRequests = PurchaseRequest::where('supplier_id', $supplier->id)
        ->with([
            'materialItems',
            'quotation.quotationRequest.customer.user',
        ])

        ->latest()
        ->get();

        return response()->json($purchaseRequests);
    }

    public function confirm(Request $request, PurchaseRequest $purchaseRequest)
    {
        $supplier = $request->user()->supplier;

        if ($purchaseRequest->supplier_id !== $supplier->id) {
            return response()->json([
                'message' =>  'Forbidden.'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'procurement_status' => 'required|in:confirmed,partially_available,unavailable',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $purchaseRequest->update([
            'procurement_status' => $request->procurement_status,
        ]);

        return response()->json([
            'message' => 'Purchase request status updated.',
            'purchase_request' => $purchaseRequest->load(['materialItems', 'supplier.user']),
        ]);
    }

    public function updateItems(Request $request, PurchaseRequest $purchaseRequest)
    {
        $supplier = $request->user()->supplier;

        if ($purchaseRequest->supplier_id !== $supplier->id) {
            return response()->json([ 'message' => 'Forbidden.'], 403);
        }

        $validator = Validator::make($request->all(), [
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:material_items,id',
            'items.*.availability' => 'required|in:available,limited,out_of_stock',
            'items.*.unit_price' => 'nullable|numeric|min:0',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

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

    public function getSuppliers()
    {
        $suppliers = Supplier::with('user')->get();

        return response()->json($suppliers);
    }

}
