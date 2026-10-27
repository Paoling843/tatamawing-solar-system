<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * The materials list the admin downloads as a PDF and sends to a supplier on
 * Messenger. Nothing is saved; the list only goes into the PDF.
 */
class StoreMaterialsPdfRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // business = TataMawing's address, site = the installation site
            'deliver_to' => ['required', 'in:business,site'],
            'needed_by' => ['nullable', 'date'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'items' => ['required', 'array', 'min:1', 'max:50'],
            'items.*.name' => ['required', 'string', 'max:120'],
            'items.*.specification' => ['nullable', 'string', 'max:160'],
            'items.*.code' => ['nullable', 'string', 'max:40'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'items.*.unit' => ['nullable', 'string', 'max:20'],
        ];
    }

    public function messages(): array
    {
        return [
            'items.required' => 'Add at least one material.',
            'items.min' => 'Add at least one material.',
            'items.*.name.required' => 'Every material needs a name.',
            'items.*.quantity.min' => 'Quantities must be at least 1.',
        ];
    }

    // Trim the typed text so stray spaces don't end up in the PDF
    protected function prepareForValidation(): void
    {
        $items = $this->input('items');

        if (! is_array($items)) {
            return;
        }

        foreach ($items as $index => $item) {
            if (! is_array($item)) {
                continue;
            }

            foreach (['name', 'specification', 'code', 'unit'] as $field) {
                if (isset($item[$field])) {
                    $items[$index][$field] = trim((string) $item[$field]);
                }
            }
        }

        $this->merge(['items' => $items]);
    }
}
