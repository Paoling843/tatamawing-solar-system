// =====================================================================
// Where the system will be installed (quote builder and external requests)
// =====================================================================
// TataMawing installs across Sorsogon. The customer picks their town, then
// types their barangay and picks it from suggestions that narrow as they
// type; what's saved is always one of that town's official names.
// =====================================================================

export const HOME_PROVINCE = 'Sorsogon';

// The 15 towns of Sorsogon and their 541 barangays (2020 census names, from
// PhilAtlas). Keep in sync with backend/app/Support/SorsogonBarangays.php
// (a backend test checks that the two lists match).
export const SORSOGON_BARANGAYS = {
    Barcelona: [
        'Alegria', 'Bagacay', 'Bangate', 'Bugtong', 'Cagang', 'Fabrica', 'Jibong', 'Lago', 'Layog',
        'Luneta', 'Macabari', 'Mapapac', 'Olandia', 'Paghaluban', 'Poblacion Central',
        'Poblacion Norte', 'Poblacion Sur', 'Putiao', 'San Antonio', 'San Isidro', 'San Ramon',
        'San Vicente', 'Santa Cruz', 'Santa Lourdes', 'Tagdon',
    ],
    Bulan: [
        'A. Bonifacio', 'Abad Santos', 'Aguinaldo', 'Antipolo', 'Beguin', 'Benigno S. Aquino',
        'Bical', 'Bonga', 'Butag', 'Cadandanan', 'Calomagon', 'Calpi', 'Cocok-Cabitan', 'Daganas',
        'Danao', 'Dolos', 'E. Quirino', 'Fabrica', 'G. del Pilar', 'Gate', 'Inararan', 'J. Gerona',
        'J. P. Laurel', 'Jamorawon', 'Lajong', 'Libertad', 'M. Roxas', 'Magsaysay', 'Managanaga',
        'Marinab', 'Montecalvario', 'N. Roque', 'Namo', 'Nasuje', 'Obrero', 'Osmeña', 'Otavi',
        'Padre Diaz', 'Palale', 'Quezon', 'R. Gerona', 'Recto', 'Sagrada', 'San Francisco',
        'San Isidro', 'San Juan Bag-o', 'San Juan Daan', 'San Rafael', 'San Ramon', 'San Vicente',
        'Santa Remedios', 'Santa Teresita', 'Sigad', 'Somagongsong', 'Taromata', 'Zone I Poblacion',
        'Zone II Poblacion', 'Zone III Poblacion', 'Zone IV Poblacion', 'Zone V Poblacion',
        'Zone VI Poblacion', 'Zone VII Poblacion', 'Zone VIII Poblacion',
    ],
    Bulusan: [
        'Bagacay', 'Central', 'Cogon', 'Dancalan', 'Dapdap', 'Lalud', 'Looban', 'Mabuhay',
        'Madlawon', 'Poctol', 'Porog', 'Sabang', 'Salvacion', 'San Antonio', 'San Bernardo',
        'San Francisco', 'San Isidro', 'San Jose', 'San Rafael', 'San Roque', 'San Vicente',
        'Santa Barbara', 'Sapngan', 'Tinampo',
    ],
    Casiguran: [
        'Adovis', 'Boton', 'Burgos', 'Casay', 'Cawit', 'Central', 'Cogon', 'Colambis', 'Escuala',
        'Inlagadian', 'Lungib', 'Mabini', 'Ponong', 'Rizal', 'San Antonio', 'San Isidro',
        'San Juan', 'San Pascual', 'Santa Cruz', 'Somal-ot', 'Tigbao', 'Timbayog', 'Tiris',
        'Trece Martirez', 'Tulay',
    ],
    Castilla: [
        'Amomonting', 'Bagalayag', 'Bagong Sirang', 'Bonga', 'Buenavista', 'Burabod', 'Caburacan',
        'Canjela', 'Cogon', 'Cumadcad', 'Dangcalan', 'Dinapa', 'La Union', 'Libtong', 'Loreto',
        'Macalaya', 'Maracabac', 'Mayon', 'Maypangi', 'Milagrosa', 'Miluya', 'Monte Carmelo',
        'Oras', 'Pandan', 'Poblacion', 'Quirapi', 'Saclayan', 'Salvacion', 'San Isidro',
        'San Rafael', 'San Roque', 'San Vicente', 'Sogoy', 'Tomalaytay',
    ],
    Donsol: [
        'Alin', 'Awai', 'Banban', 'Bandi', 'Banuang Gurang', 'Baras', 'Bayawas',
        'Bororan Barangay 1', 'Cabugao', 'Central Barangay 2', 'Cristo', 'Dancalan', 'De Vera',
        'Gimagaan', 'Girawan', 'Gogon', 'Gura', 'Juan Adre', 'Lourdes', 'Mabini', 'Malapoc',
        'Malinao', 'Market Site Barangay 3', 'New Maguisa', 'Ogod', 'Old Maguisa', 'Orange',
        'Pangpang', 'Parina', 'Pawala', 'Pinamanaan', 'Poso Poblacion',
        'Punta Waling-Waling Poblacion', 'Rawis', 'San Antonio', 'San Isidro', 'San Jose',
        'San Rafael', 'San Ramon', 'San Vicente', 'Santa Cruz', 'Sevilla', 'Sibago', 'Suguian',
        'Tagbac', 'Tinanogan', 'Tongdol', 'Tres Marias', 'Tuba', 'Tupas', 'Vinisitahan',
    ],
    Gubat: [
        'Ariman', 'Bagacay', 'Balud del Norte', 'Balud del Sur', 'Benguet', 'Bentuco', 'Beriran',
        'Buenavista', 'Bulacao', 'Cabigaan', 'Cabiguhan', 'Carriedo', 'Casili', 'Cogon',
        'Cota na Daco', 'Dita', 'Jupi', 'Lapinig', 'Luna-Candol', 'Manapao', 'Manook', 'Naagtan',
        'Nato', 'Nazareno', 'Ogao', 'Paco', 'Panganiban', 'Paradijon', 'Patag', 'Payawin',
        'Pinontingan', 'Rizal', 'San Ignacio', 'Sangat', 'Santa Ana', 'Tabi', 'Tagaytay', 'Tigkiw',
        'Tiris', 'Togawe', 'Union', 'Villareal',
    ],
    Irosin: [
        'Bacolod', 'Bagsangan', 'Batang', 'Bolos', 'Buenavista', 'Bulawan', 'Carriedo', 'Casini',
        'Cawayan', 'Cogon', 'Gabao', 'Gulang-Gulang', 'Gumapia', 'Liang', 'Macawayan', 'Mapaso',
        'Monbon', 'Patag', 'Salvacion', 'San Agustin', 'San Isidro', 'San Juan', 'San Julian',
        'San Pedro', 'Santo Domingo', 'Tabon-Tabon', 'Tinampo', 'Tongdol',
    ],
    Juban: [
        'Anog', 'Aroroy', 'Bacolod', 'Binanuahan', 'Biriran', 'Buraburan', 'Calateo', 'Calmayon',
        'Carohayon', 'Catanagan', 'Catanusan', 'Cogon', 'Embarcadero', 'Guruyan', 'Lajong', 'Maalo',
        'North Poblacion', 'Puting Sapa', 'Rangas', 'Sablayan', 'Sipaya', 'South Poblacion',
        'Taboc', 'Tinago', 'Tughan',
    ],
    Magallanes: [
        'Aguada Norte', 'Aguada Sur', 'Anibong', 'Bacalon', 'Bacolod', 'Banacud', 'Behia', 'Biga',
        'Binisitahan del Norte', 'Binisitahan del Sur', 'Biton', 'Bulala', 'Busay', 'Caditaan',
        'Cagbolo', 'Cagtalaba', 'Cawit Extension', 'Cawit Proper', 'Ginangra', 'Hubo', 'Incarizan',
        'Lapinig', 'Magsaysay', 'Malbog', 'Pantalan', 'Pawik', 'Pili', 'Poblacion', 'Salvacion',
        'Santa Elena', 'Siuton', 'Tagas', 'Tulatula Norte', 'Tulatula Sur',
    ],
    Matnog: [
        'Balocawe', 'Banogao', 'Banuangdaan', 'Bariis', 'Bolo', 'Bon-ot Big', 'Bon-ot Small',
        'Cabagahan', 'Calayuan', 'Calintaan', 'Caloocan', 'Calpi', 'Camachiles', 'Camcaman',
        'Coron-coron', 'Culasi', 'Gadgaron', 'Genablan Occidental', 'Genablan Oriental', 'Hidhid',
        'Laboy', 'Lajong', 'Mambajog', 'Manjunlad', 'Manurabi', 'Naburacan', 'Paghuliran', 'Pangi',
        'Pawa', 'Poropandan', 'Santa Isabel', 'Sinalmacan', 'Sinang-atan', 'Sinibaran', 'Sisigon',
        'Sua', 'Sulangan', 'Tablac', 'Tabunan', 'Tugas',
    ],
    Pilar: [
        'Abas', 'Abucay', 'Bantayan', 'Banuyo', 'Bayasong', 'Bayawas', 'Binanuahan', 'Cabiguan',
        'Cagdongon', 'Calongay', 'Calpi', 'Catamlangan', 'Comapo-capo', 'Danlog', 'Dao', 'Dapdap',
        'Del Rosario', 'Esmerada', 'Esperanza', 'Ginablan', 'Guiron', 'Inang', 'Inapugan', 'Leona',
        'Lipason', 'Lourdes', 'Lubiano', 'Lumbang', 'Lungib', 'Mabanate', 'Malbog', 'Marifosque',
        'Mercedes', 'Migabod', 'Naspi', 'Palanas', 'Pangpang', 'Pinagsalog', 'Pineda', 'Poctol',
        'Pudo', 'Putiao', 'Sacnangan', 'Salvacion', 'San Antonio (Millabas)', 'San Antonio (Sapa)',
        'San Jose', 'San Rafael', 'Santa Fe',
    ],
    'Prieto Diaz': [
        'Brillante', 'Bulawan', 'Calao', 'Carayat', 'Diamante', 'Gogon', 'Lupi', 'Maningcay de Oro',
        'Manlabong', 'Perlas', 'Quidolog', 'Rizal', 'San Antonio', 'San Fernando', 'San Isidro',
        'San Juan', 'San Rafael', 'San Ramon', 'Santa Lourdes', 'Santo Domingo', 'Talisayan',
        'Tupaz', 'Ulag',
    ],
    'Santa Magdalena': [
        'Barangay Poblacion I', 'Barangay Poblacion II', 'Barangay Poblacion III',
        'Barangay Poblacion IV', 'La Esperanza', 'Peñafrancia', 'Salvacion', 'San Antonio',
        'San Bartolome', 'San Eugenio', 'San Isidro', 'San Rafael', 'San Roque', 'San Sebastian',
    ],
    'Sorsogon City': [
        'Abuyog', 'Almendras-Cogon', 'Balete', 'Balogo (Bacon District)',
        'Balogo (Sorsogon East District)', 'Barayong', 'Basud', 'Bato', 'Bibincahan',
        'Bitan-o/Dalipay', 'Bogña', 'Bon-ot', 'Bucalbucalan', 'Buenavista',
        'Buenavista (Bacon District)', 'Buhatan', 'Bulabog', 'Burabod', 'Cabarbuhan', 'Cabid-an',
        'Cambulaga', 'Capuy', 'Caricaran', 'Del Rosario', 'Gatbo', 'Gimaloto', 'Guinlajon',
        'Jamislagan', 'Macabog', 'Maricrum', 'Marinas', 'Osiao', 'Pamurayan', 'Pangpang',
        'Panlayaan', 'Peñafrancia', 'Piot', 'Poblacion', 'Polvorista', 'Rawis', 'Rizal', 'Salog',
        'Salvacion', 'Salvacion (Bacon District)', 'Sampaloc', 'San Isidro',
        'San Isidro (Bacon District)', 'San Juan (Bacon District)', 'San Juan (Roro)',
        'San Pascual', 'San Ramon', 'San Roque', 'San Vicente', 'Santa Cruz', 'Santa Lucia',
        'Santo Domingo', 'Santo Niño', 'Sawanga', 'Sirangan', 'Sugod', 'Sulucan', 'Talisay',
        'Ticol', 'Tugos',
    ],
};

export const SORSOGON_TOWNS = Object.keys(SORSOGON_BARANGAYS);

// Longest site description the server accepts
export const SITE_DESCRIPTION_MAX = 1000;

export const EMPTY_LOCATION = {
    municipality: '',  // one of SORSOGON_TOWNS
    barangay: '',      // as typed; becomes the official name once it matches one
    purok: '',
    description: '',   // optional: the customer's own description of the house / site
};

const ROMAN = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii'];

// Loose form used for matching: lower case, accents dropped (ñ → n),
// punctuation as spaces, single spaces, "sta" as "santa", "sto" as "santo",
// and "zone 2" as "zone ii". "J.P. Laurel" → "j p laurel", "Osmeña" → "osmena"
export function normalizeBarangay(text) {
    return (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[.\-–()/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\bsta\b/g, 'santa')
        .replace(/\bsto\b/g, 'santo')
        .replace(/\bzone ([1-8])\b/g, (_, n) => `zone ${ROMAN[Number(n)]}`);
}

const compact = (text) => normalizeBarangay(text).replace(/ /g, '');

const barangaysOf = (municipality) => SORSOGON_BARANGAYS[municipality] || [];

// The official name a typed barangay stands for in that town, or null.
// "bical" → "Bical", "jp laurel" → "J. P. Laurel", "zone 2" → "Zone II Poblacion"
export function officialBarangay(municipality, text) {
    const key = compact(text);
    if (!key) return null;
    return barangaysOf(municipality).find((name) => {
        const official = compact(name);
        return official === key || official === `${key}poblacion`;
    }) || null;
}

// The town's barangays matching what's typed, best first: names that start
// with it, then names with a later word starting with it, then names
// containing it. With nothing typed, all of them.
export function suggestBarangays(municipality, text) {
    const barangays = barangaysOf(municipality);
    const query = compact(text);
    if (!query) return barangays;

    const starts = [];
    const wordStarts = [];
    const contains = [];
    for (const name of barangays) {
        const words = normalizeBarangay(name);
        const joined = words.replace(/ /g, '');
        if (joined.startsWith(query)) starts.push(name);
        else if (words.split(' ').some((word) => word.startsWith(query))) wordStarts.push(name);
        else if (joined.includes(query)) contains.push(name);
    }
    return [...starts, ...wordStarts, ...contains];
}

// Choosing another town keeps the barangay only if that town has it too
export function changeTown(location, municipality) {
    return {
        ...location,
        municipality,
        barangay: officialBarangay(municipality, location.barangay) || '',
    };
}

// The messages to show under the fields, or null when they're fine
export function municipalityError(location) {
    return SORSOGON_TOWNS.includes(location.municipality) ? null : 'Required';
}

export function barangayError(location) {
    if (!location.barangay.trim()) return 'Required';
    if (!officialBarangay(location.municipality, location.barangay)) return 'Pick a barangay from the list';
    return null;
}

export const isLocationComplete = (location) => !municipalityError(location) && !barangayError(location);

// What POST /api/quotation-requests expects under "location"
export function locationPayload(location) {
    return {
        province: HOME_PROVINCE,
        municipality: location.municipality,
        barangay: officialBarangay(location.municipality, location.barangay),
        purok: location.purok.trim() || null,
    };
}
