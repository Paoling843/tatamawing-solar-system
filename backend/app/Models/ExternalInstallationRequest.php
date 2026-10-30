<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\URL;

class ExternalInstallationRequest extends Model
{
    protected $fillable = [
        'name',
        'email',
        'phone',
        'address',
        // Installation site, asked like the quote builder's location card
        'install_purok',
        'install_barangay',
        'install_municipality',
        'install_province',
        'site_description',
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
            // Sent as "2026-10-31", not midnight UTC (see InstallationSchedule)
            'preferred_installation_date' => 'date:Y-m-d',
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

    public function quotationFile()
    {
        return $this->hasOne(ExternalRequestFile::class);
    }

    /**
     * The "Check request status" link in the emails: the website's status
     * page, carrying the signature of the API status route (valid 30 days).
     * The page passes expires and signature on to the API to load the data.
     */
    public function statusPageUrl(): string
    {
        $signed = URL::temporarySignedRoute(
            'external-installation-requests.status',
            now()->addDays(30),
            ['externalInstallationRequest' => $this->id]
        );
        parse_str((string) parse_url($signed, PHP_URL_QUERY), $query);

        return self::statusPage($this->id, $query);
    }

    /** Website address of the status page for the given signature query */
    public static function statusPage(int|string $id, array $query): string
    {
        return config('app.frontend_url')."/installation-request/{$id}/status?".http_build_query($query);
    }
}
