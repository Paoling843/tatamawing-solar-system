<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public $timestamps = true;

    protected $fillable = [
        'action',
        'actor_type',
        'actor_id',
        'target_type',
        'target_id',
        'target_label',
        'description',
        'metadata',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function actor()
    {
        return $this->morphTo();
    }

    public function target()
    {
        return $this->morphTo();
    }
}
