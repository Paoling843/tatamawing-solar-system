<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * My Profile → Password. Asks for the current password, so someone using a
 * device that was left logged in can't change it.
 */
class ChangePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            // Same rules as sign-up and password reset
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed', 'different:current_password', 'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/'],
            'sign_out_others' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required' => 'Enter your current password.',
            'current_password.current_password' => 'Your current password is incorrect.',
            'password.required' => 'Enter a new password.',
            'password.min' => 'Use at least 8 characters.',
            'password.confirmed' => 'Passwords do not match.',
            'password.different' => 'Choose a password different from your current one.',
            'password.regex' => 'Password must contain both letters and numbers.',
        ];
    }
}
