// TataMawing's product list, copied from the "Product Price" sheet of
// Quotation.xlsx (115 items). Used by the supplier materials form so
// each row can be picked by name or code. Prices are left out on purpose:
// the supplier PDF never shows them.
// To update: replace the rows below with the sheet's Product Number,
// Product Description and Unit columns.

export const PRODUCTS = [
    { code: 'tm-0001', name: 'Inverter Hybrid 3kw 24volts 500volts SRNE', unit: 'each' },
    { code: 'tm-0002', name: 'Battery 24volts 280ah MENRED', unit: 'each' },
    { code: 'tm-0003', name: 'Solar Panel 550watts OSDA', unit: 'each' },
    { code: 'tm-0004', name: 'Cable PV 2*6mm', unit: 'each' },
    { code: 'tm-0005', name: 'MC4 Connector', unit: 'each' },
    { code: 'tm-0006', name: 'DC Breaker 20amp FEEO', unit: 'each' },
    { code: 'tm-0007', name: 'MCCB 125A FEEO', unit: 'each' },
    { code: 'tm-0008', name: 'Tray Cable 50*50 Grey', unit: 'each' },
    { code: 'tm-0009', name: 'DC Breaker SPD 600volts FEEO', unit: 'each' },
    { code: 'tm-0010', name: 'Rails 2.4 L Type', unit: 'each' },
    { code: 'tm-0011', name: 'L Foot L Type', unit: 'each' },
    { code: 'tm-0012', name: 'Clamp Mid 30mm L Type', unit: 'each' },
    { code: 'tm-0013', name: 'Clamp End 30mm L Type', unit: 'each' },
    { code: 'tm-0014', name: 'Cable Battery 25mm R and B', unit: 'meter' },
    { code: 'tm-0015', name: 'Battery Terminal 25mm', unit: 'each' },
    { code: 'tm-0016', name: 'Box Breaker 12 ways SASSIN', unit: 'each' },
    { code: 'tm-0017', name: 'Inverter Hybrid 6kw SRNE', unit: 'each' },
    { code: 'tm-0018', name: 'Battery 51.2volts 200ah SRNE', unit: 'each' },
    { code: 'tm-0019', name: 'MCCB 200A FEEO', unit: 'each' },
    { code: 'tm-0020', name: 'Splice Kit', unit: 'each' },
    { code: 'tm-0021', name: 'Box Breaker 18 ways SASSIN', unit: 'each' },
    { code: 'tm-0022', name: 'AC Breaker SPD 385volts FEEO', unit: 'each' },
    { code: 'tm-0023', name: 'AC Breaker 63amp FEEO', unit: 'each' },
    { code: 'tm-0024', name: 'DC Breaker 32amp FEEO', unit: 'each' },
    { code: 'tm-0025', name: 'ATS 125A DinrailFEEO', unit: 'each' },
    { code: 'tm-0026', name: 'Grounding Rod 3m with clamp', unit: 'each' },
    { code: 'tm-0027', name: 'Cable Battery 35mm R and B', unit: 'each' },
    { code: 'tm-0028', name: 'Battery Terminal 35mm', unit: 'each' },
    { code: 'tm-0029', name: 'Inverter Hybrid 8kw DEYE', unit: 'each' },
    { code: 'tm-0030', name: 'Ingelec 18 ways', unit: 'each' },
    { code: 'tm-0031', name: 'Inverter Hybrid10kw DEYE', unit: 'each' },
    { code: 'tm-0032', name: 'Over and Under Protection', unit: 'each' },
    { code: 'tm-0033', name: 'Inverter Hybrid 12kw SRNE', unit: 'each' },
    { code: 'tm-0034', name: 'Battery 51.2volts 100ah SRNE', unit: 'each' },
    { code: 'tm-0035', name: 'Solar Panel CANADIAN 585W', unit: 'each' },
    { code: 'tm-0036', name: 'Inverter Gridtie 6kw SOLIS', unit: 'each' },
    { code: 'tm-0037', name: 'AC Breaker 32amp FEEO', unit: 'each' },
    { code: 'tm-0038', name: 'Box Breaker 12 ways HT', unit: 'each' },
    { code: 'tm-0039', name: 'Solar Panel IAN 550W', unit: 'each' },
    { code: 'tm-0040', name: 'Solar Panel CANADIAN 610watts Bifacial', unit: 'each' },
    { code: 'tm-0041', name: 'Solar Panel JINKO 630W Mono Bifacial N type', unit: 'each' },
    { code: 'tm-0042', name: 'Solar Panel OSDA 590W Mono Bifacial', unit: 'each' },
    { code: 'tm-0043', name: 'Solar Panel IAN 630W Mono Bifacial', unit: 'each' },
    { code: 'tm-0044', name: 'Solar Panel OSDA 610W Bifacial', unit: 'each' },
    { code: 'tm-0045', name: 'Solar Panel JA 610W Bifacial N type', unit: 'each' },
    { code: 'tm-0046', name: 'Battery 51.2volts 100ah DYNESS', unit: 'each' },
    { code: 'tm-0047', name: 'Battery 51.2volts 280ah DYNESS Powerbrick', unit: 'each' },
    { code: 'tm-0048', name: 'Battery 51.2volts 200ah SRNE not discounted', unit: 'each' },
    { code: 'tm-0049', name: 'Battery 51.2volts 100ah SRNE not discounted', unit: 'each' },
    { code: 'tm-0050', name: 'Battery 200ah RV 12200', unit: 'each' },
    { code: 'tm-0051', name: 'Inverter Gridtie 3kw single phase MPPT 14A SOLIS', unit: 'each' },
    { code: 'tm-0052', name: 'Inverter Gridtie 5kw CT type SOLIS', unit: 'each' },
    { code: 'tm-0053', name: 'Inverter Gridtie 8kw CT type SOLIS', unit: 'each' },
    { code: 'tm-0054', name: 'Inverter Gridtie 10kw CT type SOLIS', unit: 'each' },
    { code: 'tm-0055', name: 'Rails U type 3.5', unit: 'each' },
    { code: 'tm-0056', name: 'Rails U type 2.5', unit: 'each' },
    { code: 'tm-0057', name: 'Rails L type 3.5', unit: 'each' },
    { code: 'tm-0058', name: 'Clamp Mid L Type', unit: 'each' },
    { code: 'tm-0059', name: 'Clamp End L Type', unit: 'each' },
    { code: 'tm-0060', name: 'Tray Cable 50*80mm White', unit: 'each' },
    { code: 'tm-0061', name: 'Box Combiner 18 HT', unit: 'each' },
    { code: 'tm-0062', name: 'Box Combiner 8 HT', unit: 'each' },
    { code: 'tm-0063', name: 'Box Combiner 5 HT', unit: 'each' },
    { code: 'tm-0064', name: 'Cable PV 4mm', unit: 'each' },
    { code: 'tm-0065', name: 'MCCB 160A FEEO', unit: 'each' },
    { code: 'tm-0066', name: 'DC Breaker 25amp', unit: 'each' },
    { code: 'tm-0067', name: 'DC Breaker 16amp', unit: 'each' },
    { code: 'tm-0068', name: 'DC Breaker SPD 1000volts', unit: 'each' },
    { code: 'tm-0069', name: 'AC Breaker 63A IAN', unit: 'each' },
    { code: 'tm-0070', name: 'AC Breaker 32A IAN', unit: 'each' },
    { code: 'tm-0071', name: 'AC Breaker SPD 385V IAN', unit: 'each' },
    { code: 'tm-0072', name: 'Wire Grounding 16mm', unit: 'meter' },
    { code: 'tm-0073', name: 'Wire Grounding 10mm', unit: 'meter' },
    { code: 'tm-0074', name: 'Cable Battery 25mm Red', unit: 'meter' },
    { code: 'tm-0075', name: 'Cable Battery 25mm Black', unit: 'meter' },
    { code: 'tm-0076', name: 'Inverter Hybrid 5kw SOLIS', unit: 'each' },
    { code: 'tm-0077', name: 'Inverter Hybrid 6kw Bluetooth type SOLIS', unit: 'each' },
    { code: 'tm-0078', name: 'Inverter Hybrid SOLIS 6kw SOLIS', unit: 'each' },
    { code: 'tm-0079', name: 'Inverter Hybrid 8kw pro Bluetooth type SOLIS', unit: 'each' },
    { code: 'tm-0080', name: 'Inverter Hybrid 8kw SOLIS', unit: 'each' },
    { code: 'tm-0081', name: 'Inverter Hybrid 12kw SOLIS', unit: 'each' },
    { code: 'tm-0082', name: 'Inverter Hybrid 16kw SOLIS', unit: 'each' },
    { code: 'tm-0083', name: 'Clamp Mid U type', unit: 'each' },
    { code: 'tm-0084', name: 'Clamp End U Type', unit: 'each' },
    { code: 'tm-0085', name: 'Wire PV twin core 4mm', unit: 'meter' },
    { code: 'tm-0086', name: 'Wire PV twin core 6mm', unit: 'meter' },
    { code: 'tm-0087', name: 'Wire PV single core 4mm Red', unit: 'meter' },
    { code: 'tm-0088', name: 'Wire PV single core 4mm Black', unit: 'meter' },
    { code: 'tm-0089', name: 'Wire PV single core 6mm Red', unit: 'meter' },
    { code: 'tm-0090', name: 'Wire PV single core 6mm Black', unit: 'meter' },
    { code: 'tm-0091', name: 'Wire AC THHN 5.5mm Red', unit: 'meter' },
    { code: 'tm-0092', name: 'Wire AC THHN 5.5mm Black', unit: 'meter' },
    { code: 'tm-0093', name: 'Wire AC THHN 8mm Red', unit: 'meter' },
    { code: 'tm-0094', name: 'Wire AC THHN 8mm Black', unit: 'meter' },
    { code: 'tm-0095', name: 'AC Breaker 2P 63A SUNTREE', unit: 'each' },
    { code: 'tm-0096', name: 'AC Breaker 2P 32A SUNTREE', unit: 'each' },
    { code: 'tm-0097', name: 'AC Breaker SPD 2P 275V SUNTREE', unit: 'each' },
    { code: 'tm-0098', name: 'DC Breaker SPD 2P 600V SUNTREE', unit: 'each' },
    { code: 'tm-0099', name: 'DC Breaker 16A 600V SUNTREE', unit: 'each' },
    { code: 'tm-0100', name: 'DC Breaker 25A 1000V SUNTREE', unit: 'each' },
    { code: 'tm-0101', name: 'DC Breaker 16A 1000V SUNTREE', unit: 'each' },
    { code: 'tm-0102', name: 'Inverter Hybrid 12kw DEYE', unit: 'each' },
    { code: 'tm-0103', name: 'L Foot U Type (Metal Bracket)', unit: 'each' },
    { code: 'tm-0104', name: 'Rail Connector', unit: 'each' },
    { code: 'tm-0105', name: 'Tray Cable 50cm x 50cm', unit: 'each' },
    { code: 'tm-0106', name: 'Cable PV Twin 6mm', unit: 'meter' },
    { code: 'tm-0107', name: 'Battery 51.2volts 315ah SRNE not discounted', unit: 'each' },
    { code: 'tm-0108', name: 'Battery 51.2volts 315ah MENRED', unit: 'each' },
    { code: 'tm-0109', name: 'Inverter Hybrid 8kw SRNE', unit: 'each' },
    { code: 'tm-0110', name: 'Inverter Hybrid 6kw DEYE', unit: 'each' },
    { code: 'tm-0111', name: 'Battery 51.2volts 280ah SRNE', unit: 'each' },
    { code: 'tm-0112', name: 'Wire Grounding 6mm', unit: 'meter' },
    { code: 'tm-0113', name: 'Wire Grounding 4mm', unit: 'meter' },
    { code: 'tm-0114', name: 'HDPE 34.5cm', unit: 'meter' },
    { code: 'tm-0115', name: 'Sealant Silicone', unit: 'each' },
];

const BY_CODE = new Map(PRODUCTS.map((p) => [p.code.toLowerCase(), p]));

// The product with this code (e.g. "tm-0044"), or undefined
export const productByCode = (code) => BY_CODE.get(String(code ?? '').trim().toLowerCase());

// The words a product can be found by. Numbers stuck to units count on their
// own too, so "32amp" is found by "32" and "Hybrid10kw" by "10kw".
const searchWords = (product) => {
    const tokens = `${product.code} ${product.name}`.toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);
    return tokens.flatMap((t) => {
        // "hybrid10kw" → hybrid10kw, 10kw, kw
        const parts = t.split(/(?<=[a-z])(?=\d)|(?<=\d)(?=[a-z])/);
        return parts.map((_, i) => parts.slice(i).join(''));
    });
};
const SEARCH_INDEX = PRODUCTS.map((p) => ({ product: p, words: searchWords(p) }));

// Products where every typed word starts one of the product's words, e.g.
// "dc 32" finds "DC Breaker 32amp FEEO", "rails l" finds the L type rails
// (not the U type), and "0044" finds tm-0044.
export function searchProducts(query, limit = 30) {
    const typed = String(query ?? '').toLowerCase().split(/[^a-z0-9.]+/).filter(Boolean);
    if (!typed.length) return PRODUCTS.slice(0, limit);
    return SEARCH_INDEX
        .filter(({ words }) => typed.every((t) => words.some((w) => w.startsWith(t))))
        .slice(0, limit)
        .map(({ product }) => product);
}
