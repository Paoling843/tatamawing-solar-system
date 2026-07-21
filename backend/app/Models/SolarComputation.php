<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SolarComputation extends Model
{
    protected $fillable = [
        'quotation_request_id',
        'total_load_watts',
        'panel_capacity_kw',
        'inverter_specification',
        'battery_capacity_ah',
        'estimated_cost',
    ];

    public function quotationRequest()
    {
        return $this->belongsTo(QuotationRequest::class);
    }
}
