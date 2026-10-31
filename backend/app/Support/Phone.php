<?php

namespace App\Support;

/**
 * How a mobile number is printed on reports. Numbers are saved as +63…
 * (e.g. +639171234567); people in the Philippines read them as 0917 123 4567.
 * Same rule as formatPhone() in the frontend's utils/phone.js.
 */
class Phone
{
    public static function local(?string $value): string
    {
        if (! $value) {
            return '';
        }

        $digits = preg_replace('/\D/', '', $value);

        $local = match (true) {
            strlen($digits) === 12 && str_starts_with($digits, '63') => '0' . substr($digits, 2),
            strlen($digits) === 11 && str_starts_with($digits, '0') => $digits,
            strlen($digits) === 10 && str_starts_with($digits, '9') => '0' . $digits,
            default => null,
        };

        return $local
            ? substr($local, 0, 4) . ' ' . substr($local, 4, 3) . ' ' . substr($local, 7)
            : $value;
    }
}
