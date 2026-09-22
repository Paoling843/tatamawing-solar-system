<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApplianceItem extends Model
{
    protected $fillable = [
        'quotation_request_id',
        'appliance_name',
        'appliance_type',
        'hp',
        'wattage',
        'quantity',
        'usage_hours_per_day',
        'day_from',
        'day_to',
        'night_from',
        'night_to',
        'day_wh',
        'night_wh',
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
