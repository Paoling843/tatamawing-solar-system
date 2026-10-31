<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginUserRequest;
use App\Http\Requests\RegisterUserRequest;
use App\Models\User;
use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    /**
     * Public registration from the auth page. It only ever creates CUSTOMER
     * accounts — letting anyone pick "admin" here would let anyone give
     * themselves admin access.
     *
     * Address and install location are optional; they're collected later
     * (e.g. at the site survey).
     */
    public function register(RegisterUserRequest $request)
    {
        $normalizedEmail = strtolower(trim($request->email));
        $normalizedPhone = preg_replace('/\s+/', '', trim($request->contact_number));

        $user = DB::transaction(function () use ($request, $normalizedEmail, $normalizedPhone) {
            $user = User::create([
                'name' => trim($request->first_name) . ' ' . trim($request->last_name),
                'email' => $normalizedEmail,
                'password' => Hash::make($request->password),
                'role' => 'customer',
            ]);

            Customer::create([
                'user_id' => $user->id,
                'contact_number' => $normalizedPhone,
                'address' => $request->address ? trim($request->address) : null,
                'install_location' => $request->install_location ? trim($request->install_location) : null,
            ]);

            return $user;
        });

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful.',
            'user' => $user->load('customer'),
            'token' => $token,
        ], 201);
    }

    public function login(LoginUserRequest $request)
    {
        $normalizedEmail = strtolower(trim($request->email));
        $user = User::where('email', $normalizedEmail)->first();

        if(! $user || ! Hash::check($request->password, $user->password)){
            return response()->json([
                'message' => "That email and password don't match an account."
            ], 401);
        }

        // Tidy up this person's expired logins (there's no scheduled job on the
        // hosting plan to run sanctum:prune-expired)
        if ($minutes = config('sanctum.expiration')) {
            $user->tokens()->where('created_at', '<', now()->subMinutes($minutes))->delete();
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login successful.',
            'user' => $user->load($user->role),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
      $request->user()->currentAccessToken()->delete();

      return response()->json([
        'message' => 'Logged out.',
      ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json($user->load($user->role));
    }
}
