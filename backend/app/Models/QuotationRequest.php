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

        // Installation site (asked at the top of the quote builder)
        'install_purok',
        'install_barangay',
        'install_municipality',
        'install_province',

        // The customer's own description of the house / site (optional)
        'site_description',
    ];

    // Sent with every quotation request, so pages can show the site directly
    protected $appends = ['installation_address'];

    protected function casts()
    {
        return [
            'submission_date' => 'date',
        ];
    }

    /**
     * "Purok 3, Brgy. Bical, Bulan, Sorsogon", or null for requests made
     * before the quote builder asked for a location.
     */
    public function getInstallationAddressAttribute(): ?string
    {
        if (! $this->install_barangay) {
            return null;
        }

        return collect([
            $this->install_purok,
            'Brgy. ' . $this->install_barangay,
            $this->install_municipality,
            $this->install_province,
        ])->filter()->implode(', ');
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

    // The (up to) two reference bills, most recent first
    public function electricityBills()
    {
        return $this->hasMany(ElectricityBill::class)->orderBy('sequence');
    }

    public function quotation()
    {
        return $this->hasOne(Quotation::class);
    }
}
