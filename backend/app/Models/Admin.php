<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Admin extends Model
{
    protected $fillable = [
        'user_id',
        'department',
    ];
    
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function apporvedQuotations()
    {
        return $this->hasMany(Quotation::class, 'approved_by_admin_id');
    }

    public function faqs()
    {
        return $this->hasMany(Faq::class, 'created_by');
    }
}
