<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class QuotationRequest extends Model
{
    protected $fillable = [
        'customer_id',
        'solar_system_type',
        'monthly_bill',
        'submission_date',
        'status',
        'notes',
    ];

    protected function casts()
    {
        return [
            'submission_date' => 'date',
        ];
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function applianceItems()
    {
        return $this->hasMany(ApplianceItem::class);
    }

    public function solarComputation()
    {
        return $this->hasOne(SolarComputation::class);
    }

    public function quotation()
    {
        return $this->hasOne(Quotation::class);
    }
}
