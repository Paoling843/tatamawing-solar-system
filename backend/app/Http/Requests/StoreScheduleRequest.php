<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'quotation_id' => ['nullable', 'required_without:customer_id', 'prohibits:customer_id', 'exists:quotations,id'],
            'customer_id' => ['nullable', 'required_without:quotation_id', 'prohibits:quotation_id', 'exists:customers,id'],
            'scheduled_date' => ['required', 'date', 'after_or_equal:today'],
            'scheduled_time' => ['required', 'date_format:H:i'],
            'assigned_technician' => ['required', 'string', 'min:2', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('assigned_technician')) {
            $this->merge(['assigned_technician' => trim((string) $this->input('assigned_technician'))]);
        }

        if ($this->has('notes')) {
            $this->merge(['notes' => trim((string) $this->input('notes'))]);
        }
    }
}
