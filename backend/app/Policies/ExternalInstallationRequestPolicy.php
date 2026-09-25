<?php

namespace App\Policies;

use App\Models\ExternalInstallationRequest;
use App\Models\User;

class ExternalInstallationRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->role === 'admin';
    }

    public function view(User $user, ExternalInstallationRequest $request): bool
    {
        return $user->role === 'admin';
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function confirm(User $user, ExternalInstallationRequest $request): bool
    {
        return $user->role === 'admin';
    }

    public function reject(User $user, ExternalInstallationRequest $request): bool
    {
        return $user->role === 'admin';
    }
}
