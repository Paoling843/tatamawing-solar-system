// The short "why" notes in the calculator, with the result of each one in
// bold so it stands out from the working (e.g. "… = 6,500 W. The 8 kW
// package covers it.").
import {
    PACKAGES, INVERTER_BUFFER_W, exceedsLargestPackage, recommendPackageIndex, formatWhole,
} from '../../services/solarEngine';
import { C } from './engineStyles';

// A result inside a note
export function Em({ children }) {
    return <strong style={{ fontWeight: 700, color: C.green }}>{children}</strong>;
}

// Why this inverter package was recommended
export function RecommendationReason({ load }) {
    const sizing = (
        <>
            {formatWhole(load.totalLoad)} W of appliances + {formatWhole(INVERTER_BUFFER_W)} W buffer
            = <Em>{formatWhole(load.inverterSize)} W</Em>
        </>
    );

    if (exceedsLargestPackage(load.inverterSize)) {
        const largest = PACKAGES[PACKAGES.length - 1];
        return (
            <>
                {sizing}, above our biggest package. Our engineer will check if the <Em>{largest.kw} kW</Em> is enough.
            </>
        );
    }

    const recommended = PACKAGES[recommendPackageIndex(load.inverterSize)];
    return (
        <>
            {sizing}. The <Em>{recommended.kw} kW package</Em> covers it.
        </>
    );
}
