<?php

namespace App\Http\Controllers;

use App\Models\User;

/**
 * The admin's Users page: every account, newest first, whether or not the
 * customer has requested a quotation yet.
 */
class UserController extends Controller
{
    public function index()
    {
        $users = User::query()
            ->with(['customer' => fn ($query) => $query->withCount('quotationRequests')])
            ->latest()
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'created_at' => $user->created_at,
                'contact_number' => $user->customer?->contact_number,
                // null for admins; customers start at 0
                'quotation_requests_count' => $user->role === 'customer'
                    ? (int) ($user->customer?->quotation_requests_count ?? 0)
                    : null,
            ]);

        return response()->json($users);
    }
}
