<?php

namespace App\Policies;

use App\Models\PurchaseRequest;
use App\Models\User;

class PurchaseRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function create(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function view(User $user, PurchaseRequest $purchaseRequest): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        return $user->role === 'customer'
            && $purchaseRequest->quotation
            && $purchaseRequest->quotation->quotationRequest
            && $user->customer
            && $purchaseRequest->quotation->quotationRequest->customer_id === $user->customer->id;
    }

    public function confirm(User $user, PurchaseRequest $purchaseRequest): bool
    {
        return $user->role === 'admin';
    }

    public function updateItems(User $user, PurchaseRequest $purchaseRequest): bool
    {
        return $user->role === 'admin';
    }
}
