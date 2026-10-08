<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = [
        'user_id',
        'contact_number',
        'address',
        'install_location',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function quotationRequests()
    {
        return $this->hasMany(QuotationRequest::class);
    }

    // The newest request — the one the admin inbox links a conversation to
    public function latestQuotationRequest()
    {
        return $this->hasOne(QuotationRequest::class)->latestOfMany();
    }

    public function installationSchedules()
    {
        return $this->hasMany(InstallationSchedule::class);
    }
}
