<?php

namespace App\Support;

/**
 * The 63 official barangays of Bulan, Sorsogon (PSA census names).
 * Keep in sync with BULAN_BARANGAYS in frontend/src/services/installLocation.js.
 */
class BulanBarangays
{
    public const MUNICIPALITY = 'Bulan';
    public const PROVINCE = 'Sorsogon';

    public const NAMES = [
        'A. Bonifacio', 'Abad Santos', 'Aguinaldo', 'Antipolo', 'Beguin', 'Benigno S. Aquino', 'Bical',
        'Bonga', 'Butag', 'Cadandanan', 'Calomagon', 'Calpi', 'Cocok-Cabitan', 'Daganas', 'Danao',
        'Dolos', 'E. Quirino', 'Fabrica', 'G. del Pilar', 'Gate', 'Inararan', 'J. Gerona',
        'J. P. Laurel', 'Jamorawon', 'Lajong', 'Libertad', 'M. Roxas', 'Magsaysay', 'Managanaga',
        'Marinab', 'Montecalvario', 'N. Roque', 'Namo', 'Nasuje', 'Obrero', 'Osmeña', 'Otavi',
        'Padre Diaz', 'Palale', 'Quezon', 'R. Gerona', 'Recto', 'Sagrada', 'San Francisco',
        'San Isidro', 'San Juan Bag-o', 'San Juan Daan', 'San Rafael', 'San Ramon', 'San Vicente',
        'Santa Remedios', 'Santa Teresita', 'Sigad', 'Somagongsong', 'Taromata', 'Zone I Poblacion',
        'Zone II Poblacion', 'Zone III Poblacion', 'Zone IV Poblacion', 'Zone V Poblacion',
        'Zone VI Poblacion', 'Zone VII Poblacion', 'Zone VIII Poblacion',
    ];

    public static function isBulan(?string $municipality, ?string $province): bool
    {
        return strcasecmp(trim((string) $municipality), self::MUNICIPALITY) === 0
            && strcasecmp(trim((string) $province), self::PROVINCE) === 0;
    }

    /**
     * The official spelling of a Bulan barangay, or null if it isn't one of
     * the 63. Matching is forgiving, the same way as officialBarangay() in
     * the frontend: "bical" → "Bical", "jp laurel" → "J. P. Laurel",
     * "osmena" → "Osmeña", "sta remedios" → "Santa Remedios",
     * "zone 2" → "Zone II Poblacion".
     */
    public static function canonical(?string $name): ?string
    {
        $key = self::compact($name);
        if ($key === '') {
            return null;
        }

        foreach (self::NAMES as $official) {
            $officialKey = self::compact($official);
            if ($officialKey === $key || $officialKey === $key . 'poblacion') {
                return $official;
            }
        }

        return null;
    }

    /**
     * Loose form for matching: lower case, accents dropped, dots and hyphens
     * as spaces, "sta" as "santa", "zone 2" as "zone ii", then no spaces.
     */
    private static function compact(?string $text): string
    {
        $text = strtr(mb_strtolower(trim((string) $text)), [
            'ñ' => 'n', 'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u',
        ]);
        $text = preg_replace('/[.\-–]/u', ' ', $text);
        $text = trim(preg_replace('/\s+/', ' ', $text));
        $text = preg_replace('/\bsta\b/', 'santa', $text);
        $text = preg_replace_callback(
            '/\bzone ([1-8])\b/',
            fn ($m) => 'zone ' . ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'][(int) $m[1]],
            $text
        );

        return str_replace(' ', '', $text);
    }
}
