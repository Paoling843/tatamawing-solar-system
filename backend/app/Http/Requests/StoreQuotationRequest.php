<?php

namespace App\Http\Requests;

use App\Services\SolarComputationService;
use Illuminate\Foundation\Http\FormRequest;

class StoreQuotationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $applianceTypes = implode(',', array_keys(SolarComputationService::APPLIANCES));
        $hpOptions = implode(',', SolarComputationService::HP_OPTIONS);

        return [
            'appliances' => ['required', 'array', 'min:1'],
            'appliances.*.appliance_type' => ['required', "in:{$applianceTypes}"],
            'appliances.*.custom_name' => ['nullable', 'string', 'max:255'],
            'appliances.*.hp' => ['required_if:appliances.*.appliance_type,aircon,water_pump', 'nullable', 'numeric', "in:{$hpOptions}"],
            'appliances.*.watts' => ['required_unless:appliances.*.appliance_type,aircon,water_pump', 'nullable', 'integer', 'min:1'],
            'appliances.*.qty' => ['required', 'integer', 'min:1'],
            'appliances.*.day_from' => ['nullable', 'integer', 'between:' . SolarComputationService::DAY_START . ',' . (SolarComputationService::DAY_END - 1)],
            'appliances.*.day_to' => ['nullable', 'integer', 'between:' . (SolarComputationService::DAY_START + 1) . ',' . SolarComputationService::DAY_END],
            'appliances.*.night_from' => ['nullable', 'integer', 'between:' . SolarComputationService::NIGHT_START . ',' . (SolarComputationService::NIGHT_END - 1)],
            'appliances.*.night_to' => ['nullable', 'integer', 'between:' . (SolarComputationService::NIGHT_START + 1) . ',' . SolarComputationService::NIGHT_END],
            'bills' => ['nullable', 'array', 'max:2'],
            'bills.*.billing_month' => ['nullable', 'date_format:Y-m'],
            'bills.*.amount' => ['nullable', 'numeric', 'min:0'],
            'bills.*.kwh' => ['nullable', 'numeric', 'min:0'],
            'package_kw' => ['required', 'integer', 'min:5', 'max:12'],
            'panel_count' => ['required', 'integer', 'min:1', 'max:100'],
            'battery_ah' => ['required', 'integer', 'min:100', 'max:314'],
        ];
    }

    public function messages(): array
    {
        return [
            'appliances.*.watts.required_unless' => 'Wattage is required for appliance #:position.',
            'appliances.*.qty.required' => 'Quantity is required for appliance #:position.',
            'appliances.*.hp.required_if' => 'Horsepower is required for appliance #:position.',
            'appliances.*.hp.in' => 'Choose a horsepower from the list for appliance #:position.',
            'appliances.*.day_from.between' => 'Daytime hours for appliance #:position must be between 08:00 and 16:00.',
            'appliances.*.day_to.between' => 'Daytime hours for appliance #:position must be between 08:00 and 16:00.',
            'appliances.*.night_from.between' => 'Nighttime hours for appliance #:position must be between 16:00 and 08:00.',
            'appliances.*.night_to.between' => 'Nighttime hours for appliance #:position must be between 16:00 and 08:00.',
        ];
    }

    public function after(): array
    {
        return [
            function ($validator) {
                foreach ((array) $this->appliances as $i => $row) {
                    foreach (['day', 'night'] as $window) {
                        $from = $row["{$window}_from"] ?? null;
                        $to = $row["{$window}_to"] ?? null;

                        if (is_numeric($from) && is_numeric($to) && $to <= $from) {
                            $validator->errors()->add(
                                "appliances.{$i}.{$window}_to",
                                'The ' . ($window === 'day' ? 'daytime' : 'nighttime') . ' end time must be after the start time for appliance #' . ($i + 1) . '.'
                            );
                        }
                    }
                }

                $recentMonth = $this->input('bills.0.billing_month');
                $earlierMonth = $this->input('bills.1.billing_month');

                if ($earlierMonth && ! $recentMonth) {
                    $validator->errors()->add('bills.1.billing_month', 'Set the most recent bill first.');
                } elseif ($earlierMonth && $recentMonth && $earlierMonth >= $recentMonth) {
                    $validator->errors()->add('bills.1.billing_month', 'The earlier bill must be from before the most recent bill.');
                }
            },
        ];
    }
}
