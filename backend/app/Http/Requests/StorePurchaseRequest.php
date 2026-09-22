<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'quotation_id' => ['required', 'exists:quotations,id'],
            'materials' => ['required', 'array', 'min:1', 'max:200'],
            'materials.*.material_name' => ['required', 'string', 'min:2', 'max:255'],
            'materials.*.quantity' => ['required', 'integer', 'min:1', 'max:10000'],
            'materials.*.unit' => ['nullable', 'string', 'min:1', 'max:50'],
            'materials.*.unit_price' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
        ];
    }

    protected function prepareForValidation(): void
    {
        if ($this->has('materials') && is_array($this->input('materials'))) {
            $materials = $this->input('materials');

            foreach ($materials as $index => $material) {
                if (! is_array($material)) {
                    continue;
                }

                if (isset($material['material_name'])) {
                    $materials[$index]['material_name'] = trim((string) $material['material_name']);
                }

                if (isset($material['unit'])) {
                    $materials[$index]['unit'] = trim((string) $material['unit']);
                }
            }

            $this->merge(['materials' => $materials]);
        }
    }
}
