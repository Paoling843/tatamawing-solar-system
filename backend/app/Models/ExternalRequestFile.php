<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

// The quotation file uploaded with an external installation request
class ExternalRequestFile extends Model
{
    protected $fillable = [
        'external_installation_request_id',
        'original_name',
        'mime_type',
        'size',
        'content',
    ];

    // Never sent to the browser as JSON; only through the download route
    protected $hidden = ['content'];
}
