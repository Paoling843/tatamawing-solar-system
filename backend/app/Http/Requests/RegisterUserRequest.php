<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RegisterUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'min:2', 'max:120', 'regex:/^[\pL\s\'.-]+$/u'],
            'last_name' => ['required', 'string', 'min:2', 'max:120', 'regex:/^[\pL\s\'.-]+$/u'],
            'email' => ['required', 'string', 'email:rfc,dns', 'max:255', 'unique:users'],
            'password' => ['required', 'string', 'min:8', 'max:72', 'confirmed', 'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/'],
            'contact_number' => ['required', 'string', 'regex:/^\+63\d{10}$/'],
            'address' => ['nullable', 'string', 'min:5', 'max:255'],
            'install_location' => ['nullable', 'string', 'min:5', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return [
            'email.unique' => 'An account with this email already exists.',
            'contact_number.regex' => 'Enter a valid Philippine mobile number in +63 format.',
            'password.regex' => 'Password must contain both letters and numbers.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('first_name')) {
            $this->merge(['first_name' => trim((string) $this->input('first_name'))]);
        }

        if ($this->has('last_name')) {
            $this->merge(['last_name' => trim((string) $this->input('last_name'))]);
        }

        if ($this->has('email')) {
            $this->merge(['email' => strtolower(trim((string) $this->input('email')))]);
        }

        if ($this->has('contact_number')) {
            $this->merge(['contact_number' => preg_replace('/\s+/', '', trim((string) $this->input('contact_number')))]);
        }
    }
}
