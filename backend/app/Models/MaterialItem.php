<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One line of a purchase request.
 */
class MaterialItem extends Model
{
    protected $fillable = [
        'purchase_request_id',
        'category',
        'material_name',
        'quantity',
        'unit',
    ];

    public function purchaseRequest()
    {
        return $this->belongsTo(PurchaseRequest::class);
    }
}
