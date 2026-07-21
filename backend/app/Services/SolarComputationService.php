<?php

namespace App\Services;

use App\Models\QuotationRequest;
use App\Models\SolarComputation;

class SolarComputationService
{
    // ===== ASSUMPTIONS / CONSTANTS =====
    // These are placeholder values based on typical Philippine conditions.
    // The admin/business owner should review and adjust these with TataMawing's
    // actual supplier pricing and local solar conditions.

    // Average peak sun hours per day in the Philippines
    private const PEAK_SUN_HOURS = 5;

    // System derating factor (accounts for wiring losses, dust, heat, etc.)
    private const SYSTEM_DERATING = 0.8;

    // Inverter sizing safety factor (handles appliance startup surges)
    private const INVERTER_SAFETY_FACTOR = 1.25;

    // Inverter efficiency (DC to AC conversion loss)
    private const INVERTER_EFFICIENCY = 0.9;

    // Battery depth of discharge (lithium-ion assumption)
    private const BATTERY_DOD = 0.8;

    // Standard battery bank voltage assumption
    private const BATTERY_VOLTAGE = 12;

    // Days of battery autonomy by system type
    private const AUTONOMY_DAYS = [
        'on-grid' => 0,
        'hybrid' => 1,
        'off-grid' => 2,
    ];

    // ===== COST ASSUMPTIONS (PHP) =====
    // Rough estimated costs - should be adjusted based on actual supplier pricing
    private const COST_PER_WATT_PANEL = 50;     // PHP per watt of panel capacity
    private const COST_PER_KW_INVERTER = 8000;  // PHP per kW of inverter capacity
    private const COST_PER_AH_BATTERY = 180;    // PHP per Ah of battery capacity (at 12V)

    /**
     * Compute and save the solar requirements for a quotation request.
     */
    public function compute(QuotationRequest $quotationRequest): SolarComputation
    {
        $applianceItems = $quotationRequest->applianceItems;

        // 1. Total daily load in watt-hours (Wh)
        $totalLoadWatts = $applianceItems->sum(function ($item) {
            return $item->wattage * $item->quantity * $item->usage_hours_per_day;
        });

        // 2. Peak simultaneous load (used for inverter sizing) - sum of all appliance wattages
        $peakLoadWatts = $applianceItems->sum(function ($item) {
            return $item->wattage * $item->quantity;
        });

        // 3. Inverter specification (in Watts)
        $inverterWatts = $peakLoadWatts * self::INVERTER_SAFETY_FACTOR;
        $inverterSpecification = $this->formatInverterSpec($inverterWatts);

        // 4. Panel capacity (kW)
        // Daily load (Wh) / (peak sun hours * derating factor) = required watt output, converted to kW
        $panelCapacityKw = $totalLoadWatts / (self::PEAK_SUN_HOURS * self::SYSTEM_DERATING) / 1000;

        // 5. Battery capacity (Ah)
        $autonomyDays = self::AUTONOMY_DAYS[$quotationRequest->solar_system_type] ?? 1;

        if ($autonomyDays > 0) {
            $adjustedConsumptionWh = $totalLoadWatts / self::INVERTER_EFFICIENCY;
            $requiredCapacityWh = $adjustedConsumptionWh / self::BATTERY_DOD;
            $totalBankWh = $requiredCapacityWh * $autonomyDays;
            $batteryCapacityAh = $totalBankWh / self::BATTERY_VOLTAGE;
        } else {
            $batteryCapacityAh = 0;
        }

        // 6. Estimated cost
        $panelCost = $panelCapacityKw * 1000 * self::COST_PER_WATT_PANEL;
        $inverterCost = ($inverterWatts / 1000) * self::COST_PER_KW_INVERTER;
        $batteryCost = $batteryCapacityAh * self::COST_PER_AH_BATTERY;
        $estimatedCost = $panelCost + $inverterCost + $batteryCost;

        // Save or update the solar computation record
        return SolarComputation::updateOrCreate(
            ['quotation_request_id' => $quotationRequest->id],
            [
                'total_load_watts' => round($totalLoadWatts, 2),
                'panel_capacity_kw' => round($panelCapacityKw, 2),
                'inverter_specification' => $inverterSpecification,
                'battery_capacity_ah' => round($batteryCapacityAh, 2),
                'estimated_cost' => round($estimatedCost, 2),
            ]
        );
    }

    /**
     * Format the inverter wattage into a human-readable spec string.
     */
    private function formatInverterSpec(float $watts): string
    {
        if ($watts >= 1000) {
            return round($watts / 1000, 2) . ' kW Inverter';
        }

        return round($watts) . ' W Inverter';
    }
}