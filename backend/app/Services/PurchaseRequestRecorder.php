<?php

namespace App\Services;

use App\Models\PurchaseRequest;
use App\Models\Quotation;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Support\Facades\DB;

/**
 * Saves the materials list the admin sends to a supplier (as a PDF or a
 * copied Messenger message) as a purchase request, for the Procurement
 * report. Used by both the "Download PDF" and "Copy & save" buttons.
 *
 * One purchase request per quotation per day: sending the list again on the
 * same day (copy then download, or a fixed list) replaces that day's record
 * instead of adding a duplicate.
 */
class PurchaseRequestRecorder
{
    /** Refuses (422) a quotation that isn't approved */
    public function ensureApproved(Quotation $quotation): void
    {
        if ($quotation->quotationRequest->status !== 'approved') {
            throw new HttpResponseException(
                response()->json(['message' => 'Only approved quotations have a materials list.'], 422)
            );
        }
    }

    /** TataMawing's own address, or the installation site */
    public function deliveryAddress(Quotation $quotation, string $deliverTo): ?string
    {
        return $deliverTo === 'site'
            ? ($quotation->quotationRequest->installation_address ?? 'Installation site (address to follow)')
            : config('app.business_address');
    }

    /**
     * @param  array  $data  validated StoreMaterialsPdfRequest data
     */
    public function record(Quotation $quotation, array $data, ?int $userId): PurchaseRequest
    {
        return DB::transaction(function () use ($quotation, $data, $userId) {
            // Lock the quotation so two quick clicks can't both create a record
            Quotation::whereKey($quotation->id)->lockForUpdate()->first();

            $purchaseRequest = $quotation->purchaseRequests()
                ->whereDate('request_date', now()->toDateString())
                ->latest('id')
                ->first() ?? $quotation->purchaseRequests()->make(['request_date' => now()->toDateString()]);

            $purchaseRequest->fill([
                'deliver_to' => $data['deliver_to'],
                'delivery_address' => $this->deliveryAddress($quotation, $data['deliver_to']),
                'needed_by' => $data['needed_by'] ?? null,
                'notes' => $data['notes'] ?? null,
                'sent_by_user_id' => $userId,
            ])->save();

            // The latest list replaces the earlier one from today
            $purchaseRequest->items()->delete();
            $purchaseRequest->items()->createMany(
                collect($data['items'])->map(fn ($item) => [
                    'category' => $item['category'] ?? null,
                    'material_name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'unit' => $item['unit'] ?? null,
                ])->all()
            );

            return $purchaseRequest;
        });
    }
}
