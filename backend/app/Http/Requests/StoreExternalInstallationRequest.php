<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreExternalInstallationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:255', 'regex:/^[\pL\s\'.-]+$/u'],
            'email' => ['required', 'string', 'email:rfc,dns', 'max:255'],
            'phone' => ['required', 'string', 'regex:/^(\+63|0)9\d{9}$/'],
            'address' => ['required', 'string', 'min:10', 'max:1000'],
            'preferred_installation_date' => ['required', 'date', 'after_or_equal:today'],
            'other_company_name' => ['required', 'string', 'min:2', 'max:255'],
            'quotation_file' => ['required', 'file', 'mimetypes:application/pdf,image/jpeg,image/png', 'max:10240'],
        ];
    }

    public function messages(): array
    {
        return [
            'phone.regex' => 'Enter a valid Philippine mobile number.',
            'quotation_file.mimetypes' => 'Upload a PDF, JPG, JPEG, or PNG quotation file.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('name')) {
            $this->merge(['name' => trim((string) $this->input('name'))]);
        }

        if ($this->has('email')) {
            $this->merge(['email' => strtolower(trim((string) $this->input('email')))]);
        }

        if ($this->has('phone')) {
            $this->merge(['phone' => preg_replace('/\s+/', '', trim((string) $this->input('phone')))]);
        }

        if ($this->has('address')) {
            $this->merge(['address' => trim((string) $this->input('address'))]);
        }

        if ($this->has('other_company_name')) {
            $this->merge(['other_company_name' => trim((string) $this->input('other_company_name'))]);
        }
    }
}
