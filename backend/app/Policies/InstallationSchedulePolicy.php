<?php

namespace App\Policies;

use App\Models\InstallationSchedule;
use App\Models\User;

class InstallationSchedulePolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'customer'], true);
    }

    public function view(User $user, InstallationSchedule $schedule): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        if ($user->role !== 'customer' || ! $user->customer) {
            return false;
        }

        if ($schedule->customer_id && $schedule->customer_id === $user->customer->id) {
            return true;
        }

        return $schedule->quotation
            && $schedule->quotation->quotationRequest
            && $schedule->quotation->quotationRequest->customer_id === $user->customer->id;
    }

    public function create(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function update(User $user, InstallationSchedule $schedule): bool
    {
        return $user->role === 'admin';
    }

    public function updateStatus(User $user, InstallationSchedule $schedule): bool
    {
        return $user->role === 'admin';
    }
}
