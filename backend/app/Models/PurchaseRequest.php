<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * One purchase request: a materials list the admin sent to a supplier on
 * Messenger (as the PDF or a copied message). Saved for the quotation page
 * and the Procurement report; availability, prices and confirmation are
 * agreed on Messenger, not stored here.
 */
class PurchaseRequest extends Model
{
    protected $fillable = [
        'quotation_id',
        'request_date',
        'deliver_to',
        'delivery_address',
        'needed_by',
        'notes',
        'sent_by_user_id',
    ];

    protected function casts()
    {
        return [
            'request_date' => 'date:Y-m-d',
            'needed_by' => 'date:Y-m-d',
        ];
    }

    public function quotation()
    {
        return $this->belongsTo(Quotation::class);
    }

    public function items()
    {
        return $this->hasMany(MaterialItem::class);
    }

    public function sentBy()
    {
        return $this->belongsTo(User::class, 'sent_by_user_id');
    }
}
