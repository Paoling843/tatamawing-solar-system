// =====================================================================
// Where the system will be installed (top of the quote builder's Step 1)
// =====================================================================
// For now TataMawing only installs in Bulan, Sorsogon. The customer types
// their barangay and picks it from suggestions that narrow as they type;
// what's saved is always one of the 63 official names.
// =====================================================================

export const HOME_PROVINCE = 'Sorsogon';
export const HOME_MUNICIPALITY = 'Bulan';

// The 63 official barangays of Bulan, Sorsogon (official names, as listed
// in the PSA census). Keep in sync with backend/app/Support/BulanBarangays.php
// (a backend test checks that the two lists match).
export const BULAN_BARANGAYS = [
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

// Longest site description the server accepts
export const SITE_DESCRIPTION_MAX = 1000;

export const EMPTY_LOCATION = {
    barangay: '',      // as typed; becomes the official name once it matches one
    purok: '',
    description: '',   // optional: the customer's own description of the house / site
};

const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];

// Loose form used for matching: lower case, accents dropped (ñ → n), dots
// and hyphens as spaces, single spaces, "sta" as "santa", and "zone 2" as
// "zone ii". "J.P. Laurel" → "j p laurel", "Osmeña" → "osmena"
export function normalizeBarangay(text) {
    return (text || '')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase()
        .replace(/[.\-–]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\bsta\b/g, 'santa')
        .replace(/\bzone ([1-8])\b/g, (_, n) => `zone ${ROMAN[Number(n)]}`);
}

const compact = (text) => normalizeBarangay(text).replace(/ /g, '');

// The official name a typed barangay stands for, or null.
// "bical" → "Bical", "jp laurel" → "J. P. Laurel", "zone 2" → "Zone II Poblacion"
export function officialBarangay(text) {
    const key = compact(text);
    if (!key) return null;
    return BULAN_BARANGAYS.find((name) => {
        const official = compact(name);
        return official === key || official === `${key}poblacion`;
    }) || null;
}

// Barangays matching what's typed, best first: names that start with it,
// then names with a later word starting with it, then names containing it.
// With nothing typed, all 63.
export function suggestBarangays(text) {
    const query = compact(text);
    if (!query) return BULAN_BARANGAYS;

    const starts = [];
    const wordStarts = [];
    const contains = [];
    for (const name of BULAN_BARANGAYS) {
        const words = normalizeBarangay(name);
        const joined = words.replace(/ /g, '');
        if (joined.startsWith(query)) starts.push(name);
        else if (words.split(' ').some((word) => word.startsWith(query))) wordStarts.push(name);
        else if (joined.includes(query)) contains.push(name);
    }
    return [...starts, ...wordStarts, ...contains];
}

// The message to show under the barangay field, or null when it's fine
export function barangayError(location) {
    if (!location.barangay.trim()) return 'Required';
    if (!officialBarangay(location.barangay)) return 'Pick a barangay from the list';
    return null;
}

export const isLocationComplete = (location) => barangayError(location) === null;

// What POST /api/quotation-requests expects under "location"
export function locationPayload(location) {
    return {
        province: HOME_PROVINCE,
        municipality: HOME_MUNICIPALITY,
        barangay: officialBarangay(location.barangay),
        purok: location.purok.trim() || null,
    };
}
