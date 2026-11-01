<?php

namespace App\Policies;

use App\Models\QuotationRequest;
use App\Models\User;

class QuotationRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'customer'], true);
    }

    public function view(User $user, QuotationRequest $quotationRequest): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        return $user->role === 'customer'
            && $user->customer
            && $quotationRequest->customer_id === $user->customer->id;
    }

    public function create(User $user): bool
    {
        return $user->role === 'customer';
    }

    // Only the customer's own request; whether it can still be cancelled
    // (status, installation started) is checked in the controller
    public function cancel(User $user, QuotationRequest $quotationRequest): bool
    {
        return $user->role === 'customer'
            && $user->customer
            && $quotationRequest->customer_id === $user->customer->id;
    }

    public function approve(User $user, QuotationRequest $quotationRequest): bool
    {
        return $user->role === 'admin' && $quotationRequest->status === 'pending';
    }

    public function reject(User $user, QuotationRequest $quotationRequest): bool
    {
        return $user->role === 'admin' && $quotationRequest->status === 'pending';
    }
}
