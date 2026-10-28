<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ResetPasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'token' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email:rfc', 'max:255'],
            // Same rules as when the account was created
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed', 'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'token.required' => 'This reset link is incomplete. Open the link from your email again, or request a new one.',
            'email.required' => 'This reset link is incomplete. Open the link from your email again, or request a new one.',
            'password.required' => 'Enter a new password.',
            'password.min' => 'Use at least 8 characters.',
            'password.confirmed' => 'Passwords do not match.',
            'password.regex' => 'Password must contain both letters and numbers.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('email')) {
            $this->merge(['email' => strtolower(trim((string) $this->input('email')))]);
        }
    }
}
