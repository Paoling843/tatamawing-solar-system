<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One of the two reference electricity bills attached to a quotation request.
 * Reference only — nothing here feeds into the solar computation.
 */
class ElectricityBill extends Model
{
    protected $fillable = [
        'quotation_request_id',
        'sequence',
        'billing_month',
        'amount',
        'kwh',
    ];

    protected function casts()
    {
        return [
            'billing_month' => 'date:Y-m',
        ];
    }

    public function quotationRequest()
    {
        return $this->belongsTo(QuotationRequest::class);
    }
}
