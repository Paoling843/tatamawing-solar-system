<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\AccountDeletion;
use App\Services\AuditLogger;
use Illuminate\Http\Request;

/**
 * The admin's Users page: every account, newest first, whether or not the
 * customer has requested a quotation yet, and deleting an account.
 */
class UserController extends Controller
{
    public function index()
    {
        $users = User::query()
            ->active()
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

    /**
     * Removes the person's details and sign-in; their quotations and
     * installations stay as "Deleted customer" (see AccountDeletion).
     */
    public function destroy(Request $request, User $user)
    {
        if ($user->account_deleted_at) {
            return response()->json(['message' => 'This account was already deleted.'], 404);
        }

        if ($reason = AccountDeletion::blockReason($user, $request->user())) {
            return response()->json(['message' => $reason], 422);
        }

        $role = $user->role;
        AccountDeletion::delete($user);

        // The label leaves out the name, which was just removed on purpose
        AuditLogger::log(
            'user_deleted',
            'Deleted a user account.',
            User::class,
            $user->id,
            ($role === 'admin' ? 'Admin' : 'Customer') . ' account #' . $user->id
        );

        return response()->json(['message' => 'The account was deleted.']);
    }
}
