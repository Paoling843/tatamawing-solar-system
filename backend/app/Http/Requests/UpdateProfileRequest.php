<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * My Profile → Personal information. The email is the login and where reset
 * links go, so it isn't changed here. Only customers have a mobile number.
 */
class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Same characters as the sign-up name fields
            'name' => ['required', 'string', 'min:2', 'max:160', 'regex:/^[\pL\s\'.-]+$/u'],
            'contact_number' => $this->user()?->role === 'customer'
                ? ['required', 'string', 'regex:/^\+63\d{10}$/']
                : ['prohibited'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'Enter your full name.',
            'name.min' => 'Enter your full name.',
            'name.max' => 'Keep your name under 160 characters.',
            'name.regex' => 'Use letters, spaces, periods, hyphens and apostrophes only.',
            'contact_number.required' => 'Enter your mobile number.',
            'contact_number.regex' => 'Enter a 10-digit mobile number after +63.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            // "  Juan   Dela Cruz " → "Juan Dela Cruz"
            $this->merge(['name' => preg_replace('/\s+/', ' ', trim((string) $this->input('name')))]);
        }
        if ($this->has('contact_number')) {
            $this->merge(['contact_number' => preg_replace('/\s+/', '', trim((string) $this->input('contact_number')))]);
        }
    }
}
