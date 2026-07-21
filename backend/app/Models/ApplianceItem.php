<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApplianceItem extends Model
{
    protected $fillable = [
        'quotation_request_id',
        'appliance_name',
        'wattage',
        'quantity',
        'usage_hours_per_day',
    ];

    public function quotationRequest()
    {
        return $this->belongsTo(QuotationRequest::class);
    }

    public function getDailyUsageWattHoursAttribute()
    {
        return $this->wattage * $this->quantity * $this->usage_hours_per_day;
    }
}
