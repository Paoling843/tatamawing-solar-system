<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstallationSchedule extends Model
{
    protected $fillable = [
        'quotation_id',
        'customer_id',
        'scheduled_date',
        'scheduled_time',
        'status',
        'assigned_technician',
        'notes',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class);
    }

    public function externalInstallationRequest()
    {
        return $this->hasOne(ExternalInstallationRequest::class);
    }
}
