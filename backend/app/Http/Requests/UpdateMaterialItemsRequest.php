<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateMaterialItemsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:200'],
            'items.*.id' => ['required', 'exists:material_items,id'],
            'items.*.availability' => ['required', 'in:available,limited,out_of_stock'],
            'items.*.unit_price' => ['nullable', 'numeric', 'min:0', 'max:100000000'],
        ];
    }
}
