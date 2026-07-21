<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Customer;
use App\Models\Admin;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|in:customer,admin,supplier',

        // specifically for customer
            'contact_number' => 'required_if:role,customer|string|nullable',
            'address' => 'required_if:role,customer|string|nullable',
            'install_location' => 'required_if:role,customer|string|nullable',

        // specifically for admin
            'department' => 'nullable|string',

        // specifically for supplier
            'company_name' => 'required_if:role,supplier|string|nullable',
            'contact_person' => 'required_if:role,supplier|string|nullable',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = DB::transaction(function () use ($request) {
            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role' => $request->role,
            ]);

            switch ($request->role) {
                case 'customer':
                    Customer::create([
                        'user_id' => $user->id,
                        'contact_number' => $request->contact_number,
                        'address' => $request->address,
                        'install_location' => $request->install_location,
                    ]);
                    break;

                case 'admin':
                    Admin::create([
                        'user_id' => $user->id,
                        'department' => $request->department,
                    ]);
                    break;
                
                case 'supplier':
                    Supplier::create([
                        'user_id' => $user->id,
                        'company_name' => $request->company_name,
                        'contact_person' => $request->contact_person,
                    ]);
                    break;
            }
        
            return $user;
        });

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Registration Succesful!',
            'user' => $user,
            'token' => $token,
        ], 201);

    }

    public function login(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email'=> 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'errors' => $validator->errors()
            ], 422);
        }

        $user = User::where('email', $request->email)->first();

        if(! $user || ! Hash::check($request->password, $user->password)){
            return response()->json([
                'message' => 'Invalid Credentials'
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'message' => 'Login Successful!',
            'user' => $user->load($user->role),
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
      $request->user()->currentAccessToken()->delete();

      return response()->json([
        'message' => 'Logged Out Successfully!',
      ]);
    }

    public function me(Request $request)
    {
        $user = $request->user();

        return response()->json($user->load($user->role));
    }
}
