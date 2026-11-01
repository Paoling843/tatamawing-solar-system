<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

// "+ Create New User" on the admin's Users page. Same rules as public
// registration (RegisterUserRequest), plus the role; the mobile number is
// only needed for customers.
class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role' => ['required', 'in:customer,admin'],
            'first_name' => ['required', 'string', 'min:2', 'max:120', 'regex:/^[\pL\s\'.-]+$/u'],
            'last_name' => ['required', 'string', 'min:2', 'max:120', 'regex:/^[\pL\s\'.-]+$/u'],
            'email' => ['required', 'string', 'email:rfc,dns', 'max:255', 'unique:users'],
            'contact_number' => ['required_if:role,customer', 'nullable', 'string', 'regex:/^\+63\d{10}$/'],
            'password' => ['required', 'string', 'min:8', 'max:72', 'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/'],
        ];
    }

    public function messages(): array
    {
        return [
            'role.in' => 'Choose Customer or Admin.',
            'first_name.regex' => 'Use letters only for the first name.',
            'last_name.regex' => 'Use letters only for the last name.',
            'email.email' => 'Enter a valid email address.',
            'email.unique' => 'An account with this email already exists.',
            'contact_number.required_if' => 'Enter the customer\'s mobile number.',
            'contact_number.regex' => 'Enter a valid Philippine mobile number in +63 format.',
            'password.min' => 'The password needs at least 8 characters.',
            'password.regex' => 'Password must contain both letters and numbers.',
        ];
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'first_name' => trim((string) $this->input('first_name')),
            'last_name' => trim((string) $this->input('last_name')),
            'email' => strtolower(trim((string) $this->input('email'))),
            'contact_number' => $this->filled('contact_number')
                ? preg_replace('/\s+/', '', trim((string) $this->input('contact_number')))
                : null,
        ]);
    }
}
