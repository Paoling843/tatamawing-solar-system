<?php

namespace App\Models;

use App\Models\Concerns\HasYearlyReference;
use Illuminate\Database\Eloquent\Model;

class InstallationSchedule extends Model
{
    use HasYearlyReference;

    // Reference numbers like TMS-INS-2026-0003, restarting every January
    public const REFERENCE_KIND = 'INS';

    protected $fillable = [
        'quotation_id',
        'customer_id',
        'scheduled_date',
        'scheduled_time',
        'status',
        'assigned_technician',
        'notes',
    ];

    // Sent as a plain "2026-10-31". A bare 'date' cast is sent as midnight in
    // UTC ("2026-10-30T16:00:00Z" for Oct 31 in Manila), so pages that read
    // the first 10 characters showed and booked the day before.
    protected $casts = [
        'scheduled_date' => 'date:Y-m-d',
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
