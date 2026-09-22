<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ExternalInstallationRequest extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        'preferred_installation_date',
        'other_company_name',
        'quotation_file_path',
        'status',
        'reviewed_by_admin_id',
        'reviewed_at',
        'rejection_reason',
        'installation_schedule_id',
    ];

    protected function casts()
    {
        return [
            'preferred_installation_date' => 'date',
            'reviewed_at' => 'datetime',
        ];
    }

    public function reviewer()
    {
        return $this->belongsTo(Admin::class, 'reviewed_by_admin_id');
    }

    public function installationSchedule()
    {
        return $this->belongsTo(InstallationSchedule::class);
    }
}
