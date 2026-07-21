<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialItem extends Model
{
    protected $fillable = [
        'purchase_request_id',
        'material_name',
        'quantity',
        'unit',
        'unit_price',
        'availability',
    ];

    public function purchaseRequest()
    {
        return $this->belongsTo(PurchaseRequest::class);
    }
}
