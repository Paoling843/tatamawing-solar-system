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
    ];

    protected function casts()
    {
        return [
            // Sent as "2026-10-31", not midnight UTC (see InstallationSchedule)
            'approval_date' => 'date:Y-m-d',
        ];
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
}
