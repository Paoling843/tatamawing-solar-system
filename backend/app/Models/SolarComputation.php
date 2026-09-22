<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SolarComputation extends Model
{
    protected $fillable = [
        'quotation_request_id',

        // Older summary columns — still filled so existing pages keep working
        'total_load_watts',
        'panel_capacity_kw',
        'inverter_specification',
        'battery_capacity_ah',
        'estimated_cost',

        // Solar Computation Engine results
        'total_day_wh',
        'total_night_wh',
        'grand_total_wh',
        'adjusted_total_wh',
        'recommended_package_kw',
        'package_kw',
        'inverter_sku',
        'inverter_brand',
        'exceeds_max_package',
        'panel_count',
        'recommended_battery_ah',
        'battery_ah',
        'battery_wh',
        'battery_sku',
        'line_items',
    ];

    protected function casts()
    {
        return [
            // line_items is JSON in the database but a normal PHP array in code
            'line_items' => 'array',
            'exceeds_max_package' => 'boolean',
        ];
    }

    public function quotationRequest()
    {
        return $this->belongsTo(QuotationRequest::class);
    }
}
