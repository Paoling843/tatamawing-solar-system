<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InstallationSchedule extends Model
{
    protected $fillable = [
        'quotation_id',
        'scheduled_date',
        'scheduled_time',
        'status',
        'assigned_technician',
    ];

    protected $casts = [
        'scheduled_date' => 'date',
    ];

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }
}
