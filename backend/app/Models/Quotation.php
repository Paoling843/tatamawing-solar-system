<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Quotation extends Model
{
    protected $fillable = [
        'quotation_request_id',
        'approved_by_admin_id',
        'approval_date',
        'adjusted_cost',
        'labor_fee',
        'transportation_fee',
        'status',
        'total_amount',
        // Why the approved total differs from the estimate (shown to the customer)
        'price_note',
    ];

    protected function casts()
    {
        return [
            // Sent as "2026-10-31", not midnight UTC (see InstallationSchedule)
            'approval_date' => 'date:Y-m-d',
        ];
    }   
    
    /**
     * The customer's original estimate, if the request has one (requests
     * from before the Solar Computation Engine don't).
     */
    public function estimatedCost(): ?float
    {
        $estimate = $this->quotationRequest?->solarComputation?->estimated_cost;

        return $estimate === null ? null : (float) $estimate;
    }

    /**
     * How much the approved total differs from the estimate (+ more, - less),
     * or null when it's the same or there's no estimate to compare with.
     */
    public function priceChange(): ?float
    {
        $estimate = $this->estimatedCost();
        if ($estimate === null) {
            return null;
        }

        $change = round((float) $this->total_amount - $estimate, 2);

        return abs($change) < 0.01 ? null : $change;
    }

    public function quotationRequest()
    {
        return $this->belongsTo(QuotationRequest::class);
    }

    public function approvedByAdmin()
    {
        return $this->belongsTo(Admin::class, 'approved_by_admin_id');
    }

    public function installationSchedule()
    {
        return $this->hasOne(InstallationSchedule::class);
    }

    // Materials PDFs sent to suppliers for this quotation
    public function purchaseRequests()
    {
        return $this->hasMany(PurchaseRequest::class);
    }
}
