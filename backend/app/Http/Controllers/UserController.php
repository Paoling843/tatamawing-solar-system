<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Models\Customer;
use App\Models\User;
use App\Services\AccountDeletion;
use App\Services\AuditLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * The admin's Users page: every account, newest first, whether or not the
 * customer has requested a quotation yet; creating and deleting accounts.
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
            ->map(fn (User $user) => $this->row($user));

        return response()->json($users);
    }

    /**
     * "+ Create New User": a customer (e.g. someone who asked in person or on
     * Messenger) or another admin. The admin sets a starting password and
     * passes it on; the person can change it in My Profile.
     */
    public function store(StoreUserRequest $request)
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->first_name . ' ' . $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $request->role,
            ]);

            if ($user->role === 'admin') {
                $user->admin()->create(['department' => 'Operations']);
            } else {
                Customer::create(['user_id' => $user->id, 'contact_number' => $request->contact_number]);
            }

            return $user;
        });

        AuditLogger::log(
            'user_created',
            'Created a user account.',
            User::class,
            $user->id,
            ($user->role === 'admin' ? 'Admin' : 'Customer') . ' account #' . $user->id
        );

        $user->load(['customer' => fn ($query) => $query->withCount('quotationRequests')]);

        return response()->json([
            'message' => 'The account was created.',
            'user' => $this->row($user),
        ], 201);
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

    // One row of the Users list
    private function row(User $user): array
    {
        return [
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
        ];
    }
}
