<?php

namespace App\Support;

/**
 * The 15 towns of Sorsogon and their 541 barangays (2020 census names, from
 * PhilAtlas). Keep in sync with SORSOGON_BARANGAYS in
 * frontend/src/services/installLocation.js (a test checks that they match).
 */
class SorsogonBarangays
{
    public const PROVINCE = 'Sorsogon';

    public const TOWNS = [
        'Barcelona' => [
            'Alegria', 'Bagacay', 'Bangate', 'Bugtong', 'Cagang', 'Fabrica', 'Jibong', 'Lago',
            'Layog', 'Luneta', 'Macabari', 'Mapapac', 'Olandia', 'Paghaluban', 'Poblacion Central',
            'Poblacion Norte', 'Poblacion Sur', 'Putiao', 'San Antonio', 'San Isidro', 'San Ramon',
            'San Vicente', 'Santa Cruz', 'Santa Lourdes', 'Tagdon',
        ],
        'Bulan' => [
            'A. Bonifacio', 'Abad Santos', 'Aguinaldo', 'Antipolo', 'Beguin', 'Benigno S. Aquino',
            'Bical', 'Bonga', 'Butag', 'Cadandanan', 'Calomagon', 'Calpi', 'Cocok-Cabitan',
            'Daganas', 'Danao', 'Dolos', 'E. Quirino', 'Fabrica', 'G. del Pilar', 'Gate',
            'Inararan', 'J. Gerona', 'J. P. Laurel', 'Jamorawon', 'Lajong', 'Libertad', 'M. Roxas',
            'Magsaysay', 'Managanaga', 'Marinab', 'Montecalvario', 'N. Roque', 'Namo', 'Nasuje',
            'Obrero', 'Osmeña', 'Otavi', 'Padre Diaz', 'Palale', 'Quezon', 'R. Gerona', 'Recto',
            'Sagrada', 'San Francisco', 'San Isidro', 'San Juan Bag-o', 'San Juan Daan',
            'San Rafael', 'San Ramon', 'San Vicente', 'Santa Remedios', 'Santa Teresita', 'Sigad',
            'Somagongsong', 'Taromata', 'Zone I Poblacion', 'Zone II Poblacion',
            'Zone III Poblacion', 'Zone IV Poblacion', 'Zone V Poblacion', 'Zone VI Poblacion',
            'Zone VII Poblacion', 'Zone VIII Poblacion',
        ],
        'Bulusan' => [
            'Bagacay', 'Central', 'Cogon', 'Dancalan', 'Dapdap', 'Lalud', 'Looban', 'Mabuhay',
            'Madlawon', 'Poctol', 'Porog', 'Sabang', 'Salvacion', 'San Antonio', 'San Bernardo',
            'San Francisco', 'San Isidro', 'San Jose', 'San Rafael', 'San Roque', 'San Vicente',
            'Santa Barbara', 'Sapngan', 'Tinampo',
        ],
        'Casiguran' => [
            'Adovis', 'Boton', 'Burgos', 'Casay', 'Cawit', 'Central', 'Cogon', 'Colambis',
            'Escuala', 'Inlagadian', 'Lungib', 'Mabini', 'Ponong', 'Rizal', 'San Antonio',
            'San Isidro', 'San Juan', 'San Pascual', 'Santa Cruz', 'Somal-ot', 'Tigbao', 'Timbayog',
            'Tiris', 'Trece Martirez', 'Tulay',
        ],
        'Castilla' => [
            'Amomonting', 'Bagalayag', 'Bagong Sirang', 'Bonga', 'Buenavista', 'Burabod',
            'Caburacan', 'Canjela', 'Cogon', 'Cumadcad', 'Dangcalan', 'Dinapa', 'La Union',
            'Libtong', 'Loreto', 'Macalaya', 'Maracabac', 'Mayon', 'Maypangi', 'Milagrosa',
            'Miluya', 'Monte Carmelo', 'Oras', 'Pandan', 'Poblacion', 'Quirapi', 'Saclayan',
            'Salvacion', 'San Isidro', 'San Rafael', 'San Roque', 'San Vicente', 'Sogoy',
            'Tomalaytay',
        ],
        'Donsol' => [
            'Alin', 'Awai', 'Banban', 'Bandi', 'Banuang Gurang', 'Baras', 'Bayawas',
            'Bororan Barangay 1', 'Cabugao', 'Central Barangay 2', 'Cristo', 'Dancalan', 'De Vera',
            'Gimagaan', 'Girawan', 'Gogon', 'Gura', 'Juan Adre', 'Lourdes', 'Mabini', 'Malapoc',
            'Malinao', 'Market Site Barangay 3', 'New Maguisa', 'Ogod', 'Old Maguisa', 'Orange',
            'Pangpang', 'Parina', 'Pawala', 'Pinamanaan', 'Poso Poblacion',
            'Punta Waling-Waling Poblacion', 'Rawis', 'San Antonio', 'San Isidro', 'San Jose',
            'San Rafael', 'San Ramon', 'San Vicente', 'Santa Cruz', 'Sevilla', 'Sibago', 'Suguian',
            'Tagbac', 'Tinanogan', 'Tongdol', 'Tres Marias', 'Tuba', 'Tupas', 'Vinisitahan',
        ],
        'Gubat' => [
            'Ariman', 'Bagacay', 'Balud del Norte', 'Balud del Sur', 'Benguet', 'Bentuco',
            'Beriran', 'Buenavista', 'Bulacao', 'Cabigaan', 'Cabiguhan', 'Carriedo', 'Casili',
            'Cogon', 'Cota na Daco', 'Dita', 'Jupi', 'Lapinig', 'Luna-Candol', 'Manapao', 'Manook',
            'Naagtan', 'Nato', 'Nazareno', 'Ogao', 'Paco', 'Panganiban', 'Paradijon', 'Patag',
            'Payawin', 'Pinontingan', 'Rizal', 'San Ignacio', 'Sangat', 'Santa Ana', 'Tabi',
            'Tagaytay', 'Tigkiw', 'Tiris', 'Togawe', 'Union', 'Villareal',
        ],
        'Irosin' => [
            'Bacolod', 'Bagsangan', 'Batang', 'Bolos', 'Buenavista', 'Bulawan', 'Carriedo',
            'Casini', 'Cawayan', 'Cogon', 'Gabao', 'Gulang-Gulang', 'Gumapia', 'Liang', 'Macawayan',
            'Mapaso', 'Monbon', 'Patag', 'Salvacion', 'San Agustin', 'San Isidro', 'San Juan',
            'San Julian', 'San Pedro', 'Santo Domingo', 'Tabon-Tabon', 'Tinampo', 'Tongdol',
        ],
        'Juban' => [
            'Anog', 'Aroroy', 'Bacolod', 'Binanuahan', 'Biriran', 'Buraburan', 'Calateo',
            'Calmayon', 'Carohayon', 'Catanagan', 'Catanusan', 'Cogon', 'Embarcadero', 'Guruyan',
            'Lajong', 'Maalo', 'North Poblacion', 'Puting Sapa', 'Rangas', 'Sablayan', 'Sipaya',
            'South Poblacion', 'Taboc', 'Tinago', 'Tughan',
        ],
        'Magallanes' => [
            'Aguada Norte', 'Aguada Sur', 'Anibong', 'Bacalon', 'Bacolod', 'Banacud', 'Behia',
            'Biga', 'Binisitahan del Norte', 'Binisitahan del Sur', 'Biton', 'Bulala', 'Busay',
            'Caditaan', 'Cagbolo', 'Cagtalaba', 'Cawit Extension', 'Cawit Proper', 'Ginangra',
            'Hubo', 'Incarizan', 'Lapinig', 'Magsaysay', 'Malbog', 'Pantalan', 'Pawik', 'Pili',
            'Poblacion', 'Salvacion', 'Santa Elena', 'Siuton', 'Tagas', 'Tulatula Norte',
            'Tulatula Sur',
        ],
        'Matnog' => [
            'Balocawe', 'Banogao', 'Banuangdaan', 'Bariis', 'Bolo', 'Bon-ot Big', 'Bon-ot Small',
            'Cabagahan', 'Calayuan', 'Calintaan', 'Caloocan', 'Calpi', 'Camachiles', 'Camcaman',
            'Coron-coron', 'Culasi', 'Gadgaron', 'Genablan Occidental', 'Genablan Oriental',
            'Hidhid', 'Laboy', 'Lajong', 'Mambajog', 'Manjunlad', 'Manurabi', 'Naburacan',
            'Paghuliran', 'Pangi', 'Pawa', 'Poropandan', 'Santa Isabel', 'Sinalmacan',
            'Sinang-atan', 'Sinibaran', 'Sisigon', 'Sua', 'Sulangan', 'Tablac', 'Tabunan', 'Tugas',
        ],
        'Pilar' => [
            'Abas', 'Abucay', 'Bantayan', 'Banuyo', 'Bayasong', 'Bayawas', 'Binanuahan', 'Cabiguan',
            'Cagdongon', 'Calongay', 'Calpi', 'Catamlangan', 'Comapo-capo', 'Danlog', 'Dao',
            'Dapdap', 'Del Rosario', 'Esmerada', 'Esperanza', 'Ginablan', 'Guiron', 'Inang',
            'Inapugan', 'Leona', 'Lipason', 'Lourdes', 'Lubiano', 'Lumbang', 'Lungib', 'Mabanate',
            'Malbog', 'Marifosque', 'Mercedes', 'Migabod', 'Naspi', 'Palanas', 'Pangpang',
            'Pinagsalog', 'Pineda', 'Poctol', 'Pudo', 'Putiao', 'Sacnangan', 'Salvacion',
            'San Antonio (Millabas)', 'San Antonio (Sapa)', 'San Jose', 'San Rafael', 'Santa Fe',
        ],
        'Prieto Diaz' => [
            'Brillante', 'Bulawan', 'Calao', 'Carayat', 'Diamante', 'Gogon', 'Lupi',
            'Maningcay de Oro', 'Manlabong', 'Perlas', 'Quidolog', 'Rizal', 'San Antonio',
            'San Fernando', 'San Isidro', 'San Juan', 'San Rafael', 'San Ramon', 'Santa Lourdes',
            'Santo Domingo', 'Talisayan', 'Tupaz', 'Ulag',
        ],
        'Santa Magdalena' => [
            'Barangay Poblacion I', 'Barangay Poblacion II', 'Barangay Poblacion III',
            'Barangay Poblacion IV', 'La Esperanza', 'Peñafrancia', 'Salvacion', 'San Antonio',
            'San Bartolome', 'San Eugenio', 'San Isidro', 'San Rafael', 'San Roque',
            'San Sebastian',
        ],
        'Sorsogon City' => [
            'Abuyog', 'Almendras-Cogon', 'Balete', 'Balogo (Bacon District)',
            'Balogo (Sorsogon East District)', 'Barayong', 'Basud', 'Bato', 'Bibincahan',
            'Bitan-o/Dalipay', 'Bogña', 'Bon-ot', 'Bucalbucalan', 'Buenavista',
            'Buenavista (Bacon District)', 'Buhatan', 'Bulabog', 'Burabod', 'Cabarbuhan',
            'Cabid-an', 'Cambulaga', 'Capuy', 'Caricaran', 'Del Rosario', 'Gatbo', 'Gimaloto',
            'Guinlajon', 'Jamislagan', 'Macabog', 'Maricrum', 'Marinas', 'Osiao', 'Pamurayan',
            'Pangpang', 'Panlayaan', 'Peñafrancia', 'Piot', 'Poblacion', 'Polvorista', 'Rawis',
            'Rizal', 'Salog', 'Salvacion', 'Salvacion (Bacon District)', 'Sampaloc', 'San Isidro',
            'San Isidro (Bacon District)', 'San Juan (Bacon District)', 'San Juan (Roro)',
            'San Pascual', 'San Ramon', 'San Roque', 'San Vicente', 'Santa Cruz', 'Santa Lucia',
            'Santo Domingo', 'Santo Niño', 'Sawanga', 'Sirangan', 'Sugod', 'Sulucan', 'Talisay',
            'Ticol', 'Tugos',
        ],
    ];

    public static function isProvince(?string $province): bool
    {
        return strcasecmp(trim((string) $province), self::PROVINCE) === 0;
    }

    /**
     * The official spelling of a town, or null if it isn't in Sorsogon.
     */
    public static function canonicalTown(?string $name): ?string
    {
        $key = self::compact($name);
        if ($key === '') {
            return null;
        }

        foreach (array_keys(self::TOWNS) as $town) {
            if (self::compact($town) === $key) {
                return $town;
            }
        }

        return null;
    }

    /**
     * The official spelling of a barangay in that town, or null if the town
     * has none by that name. Matching is forgiving, the same way as
     * officialBarangay() in the frontend: "bical" → "Bical", "jp laurel" →
     * "J. P. Laurel", "osmena" → "Osmeña", "sta remedios" → "Santa Remedios",
     * "zone 2" → "Zone II Poblacion".
     */
    public static function canonical(?string $town, ?string $name): ?string
    {
        $key = self::compact($name);
        if ($key === '') {
            return null;
        }

        foreach (self::TOWNS[$town] ?? [] as $official) {
            $officialKey = self::compact($official);
            if ($officialKey === $key || $officialKey === $key . 'poblacion') {
                return $official;
            }
        }

        return null;
    }

    /**
     * Loose form for matching: lower case, accents dropped, punctuation as
     * spaces, "sta" as "santa", "sto" as "santo", "zone 2" as "zone ii", then
     * no spaces.
     */
    private static function compact(?string $text): string
    {
        $text = strtr(mb_strtolower(trim((string) $text)), [
            'ñ' => 'n', 'á' => 'a', 'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u',
        ]);
        $text = preg_replace('/[.\-–()\/]/u', ' ', $text);
        $text = trim(preg_replace('/\s+/', ' ', $text));
        $text = preg_replace('/\bsta\b/', 'santa', $text);
        $text = preg_replace('/\bsto\b/', 'santo', $text);
        $text = preg_replace_callback(
            '/\bzone ([1-8])\b/',
            fn ($m) => 'zone ' . ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'][(int) $m[1]],
            $text
        );

        return str_replace(' ', '', $text);
    }
}
