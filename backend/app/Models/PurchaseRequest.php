<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PurchaseRequest extends Model
{
    protected $fillable = [
        'quotation_id',
        'request_date',
        'procurement_status',
        'total_amount',
    ];

    protected function casts()
    {
        return [
            'request_date' => 'date',
        ];
    }

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function materialItems()
    {
        return $this->hasMany(MaterialItem::class);
    }
}
