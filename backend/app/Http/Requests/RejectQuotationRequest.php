<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RejectQuotationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // 1,000 matches the reason box on the admin pages (it's saved as TEXT)
            'rejection_reason' => ['required', 'string', 'min:5', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'rejection_reason.required' => 'Enter a reason for the rejection.',
            'rejection_reason.min' => 'Write a bit more so the customer knows what to fix (at least 5 characters).',
            'rejection_reason.max' => 'Keep the reason under 1,000 characters.',
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('rejection_reason')) {
            $this->merge(['rejection_reason' => trim((string) $this->input('rejection_reason'))]);
        }
    }
}
