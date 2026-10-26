import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import { trackStep, trackRequested, getQuoteSessionId, endQuoteSession } from '../services/quoteTracker';
import { loadDraft, saveDraft, clearDraft } from '../services/quoteDraft';
import { EMPTY_LOCATION, isLocationComplete, locationPayload } from '../services/installLocation';
import {
    computeLoad, resolveSelection, buildQuote, computeSavings, isRowComplete, prevMonth, buildSubmitPayload,
    recommendPackageIndex, recommendBatteryIndex, panelsForInverterSize,
} from '../services/solarEngine';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import EngineHeader from './quote-builder/EngineHeader';
import EngineStepNav from './quote-builder/EngineStepNav';
import ApplianceLoadStep from './quote-builder/ApplianceLoadStep';
import ComputationStep from './quote-builder/ComputationStep';
import PackageStep from './quote-builder/PackageStep';
import RequestQuoteDialog from './quote-builder/RequestQuoteDialog';
import LocationDialog from './quote-builder/LocationDialog';
import { C, SANS, s } from './quote-builder/engineStyles';
import './quote-builder/engine.css';

// =====================================================================
// Solar Computation Engine page  (route: /quotation/new)
// =====================================================================
// This page holds ALL the state for the flow and decides which screen to
// show: Step 1 (appliances) → Step 2 (computation) → Step 3 (package).
// The step components only display that state. Every number they show
// comes from services/solarEngine.js.
//
// The engine's landing screen is the home page (LandingPage.jsx, route /);
// its "Get Started" button opens this page.
// Guests see the steps full width with the engine header.
// Logged-in customers see the steps inside CustomerLayout (sidebar).
//
// Every visit starts empty — a refresh, going home or logging out starts a
// new session. The exception: a guest who presses "Request quotation" is
// sent to log in or register, and comes back to Step 3 with everything still
// filled in (see quoteDraft.js).
// =====================================================================


const EMPTY_BILL = { period: '', amount: '', kwh: '' };

// The second bill is always the month right before the most recent one
// (empty until the most recent bill has a month).
function withPreviousMonth([recent, earlier]) {
    return [recent, { ...earlier, period: prevMonth(recent.period) }];
}

// Screen → step number reported to the anonymous analytics tracker
const STEP_NUMBERS = { load: 1, compute: 2, package: 3 };
const NO_CHOICE = { pkg: null, panels: null, battery: null };

// What Step 3 would recommend for these appliance rows: the inverter
// package, the battery (and the rest of its bank, e.g. "314 Ah + 100 Ah")
// and the panel count, as one comparable string
function recommendationFor(rows) {
    const load = computeLoad(rows);
    return [
        recommendPackageIndex(load.inverterSize),
        recommendBatteryIndex(load.night),
        resolveSelection(load, NO_CHOICE).recommendedBatteryLabel,
        panelsForInverterSize(load.inverterSize),
    ].join('|');
}


// A new, empty appliance row. The id only exists so React can tell rows apart.
function newRow() {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        appliance: 'other',
        customName: '',
        hp: '1',
        watts: '',
        qty: '',
        dayFrom: '',
        dayTo: '',
        nightFrom: '',
        nightTo: '',
    };
}

// embedded: true when the calculator sits on the home page (LandingPage),
// below the hero, instead of being its own page at /quotation/new
export default function QuotationFormPage({ embedded = false }) {
    const { user, loading: authLoading, logout } = useAuth();
    const navigate = useNavigate();
    const rootRef = useRef(null);

    // Every visit is a new session: saved inputs only come back when this
    // visit is the guest's return from the login/register page, which always
    // lands on /quotation/new — so the home page never restores them.
    // (Read only — React may call this twice in development.)
    const [draft] = useState(() => {
        if (embedded) return null;
        const saved = loadDraft();
        return saved?.awaitingLogin ? saved : null;
    });

    // On the home page every visitor sees Step 1, so a visit only counts as
    // using the calculator (analytics) once they start filling it in
    const [engaged, setEngaged] = useState(!embedded);

    // ----- State -----
    const [screen, setScreen] = useState(draft?.screen ?? 'load');   // load | compute | package
    const [timeFormat, setTimeFormat] = useState(draft?.timeFormat ?? '24');
    // A new visit starts with one empty appliance row, so the first input is
    // right there instead of behind the "Add appliance" button. (A function,
    // so newRow() runs once and not on every render.)
    const [rows, setRows] = useState(() => draft?.rows ?? [newRow()]);
    const [bills, setBills] = useState(() => withPreviousMonth(draft?.bills ?? [EMPTY_BILL, EMPTY_BILL]));

    // Where the system will be installed. Only asked for when a logged-in
    // customer presses "Request quotation" (LocationDialog), never in Step 1.
    const [location, setLocation] = useState(() => ({ ...EMPTY_LOCATION, ...(draft?.location ?? {}) }));

    // The customer's Step 3 picks. null means "use the recommended default".
    // pkg and battery are indexes into PACKAGES / BATTERIES.
    const [choice, setChoice] = useState(draft?.choice ?? NO_CHOICE);

    // True when this visit is a guest's return from logging in, so we can
    // welcome them back. Only kept in memory — see the save effect below.
    const [awaitingLogin] = useState(draft?.awaitingLogin ?? false);

    // A fresh visit also starts a fresh anonymous analytics session. The ref
    // keeps React's development double-run from starting two of them.
    const sessionStarted = useRef(false);
    useEffect(() => {
        if (sessionStarted.current) return;
        sessionStarted.current = true;
        if (!draft) endQuoteSession();
    }, [draft]);

    // Validation display: which fields were visited, and whether Continue was pressed
    const [touched, setTouched] = useState({});
    const [attempted, setAttempted] = useState(false);

    // Step 3 UI state
    const [selectedCost, setSelectedCost] = useState(null);
    const [authPromptOpen, setAuthPromptOpen] = useState(false);
    const [locationOpen, setLocationOpen] = useState(false);
    // True once "Send request" was pressed, so a missing barangay shows its message
    const [locationAttempted, setLocationAttempted] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // ----- Derived values (recomputed whenever the inputs change) -----
    const load = useMemo(() => computeLoad(rows), [rows]);
    const selection = resolveSelection(load, choice);
    const quote = buildQuote(selection.pkg, selection.panels, selection.battery, selection.bank);
    const savings = computeSavings(load.day, load.night, selection.panels, selection.batteryWhTotal, quote.total, bills);
    // Step 1 is done when every appliance row is filled in
    const loadReady = rows.length > 0 && rows.every(isRowComplete);

    // Logged-in customers use the engine inside their sidebar layout
    const isCustomer = user?.role === 'customer';

    // Which screen to actually show:
    // - a draft saved before the landing moved to the home page may still
    //   say 'landing'; start those at Step 1
    // - Steps 2 and 3 need a complete appliance list; if it isn't (e.g.
    //   every row was removed), fall back to Step 1
    let activeScreen = screen;
    if (activeScreen === 'landing') activeScreen = 'load';
    if ((activeScreen === 'compute' || activeScreen === 'package') && !loadReady) activeScreen = 'load';

    // Keep the saved inputs current. awaitingLogin is always saved as false:
    // the login hand-off is used up once the guest is back here, so a later
    // refresh starts a new session. Only sendToAuth() saves it as true.
    useEffect(() => {
        saveDraft({ screen, timeFormat, rows, bills, location, choice, awaitingLogin: false });
    }, [screen, timeFormat, rows, bills, location, choice]);

    // Anonymous analytics: report how far this visit got (see quoteTracker.js).
    // Admins trying the calculator aren't counted.
    useEffect(() => {
        if (!engaged || authLoading || (user && user.role !== 'customer')) return;
        trackStep(STEP_NUMBERS[activeScreen] ?? 1, Boolean(user));
    }, [engaged, activeScreen, user, authLoading]);

    const goTo = (next) => {
        setScreen(next);
        if (embedded) {
            // Back to the top of the calculator, not the top of the home page
            rootRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            window.scrollTo(0, 0);
        }
    };

    // ----- Step 1: appliance rows -----
    // Every change to the appliance list goes through here. If the change
    // moves the recommendation, the customer's Step 3 picks are dropped so
    // Step 3 starts again from the new recommended inverter, panels and
    // battery instead of keeping picks made for the old appliance list.
    const updateRows = (nextRows) => {
        setEngaged(true);
        if (recommendationFor(nextRows) !== recommendationFor(rows)) {
            setChoice(NO_CHOICE);
        }
        setRows(nextRows);
    };

    const handleRowChange = (id, key, rawValue) => {
        // Watts and quantity are whole numbers, so strip anything else as they type
        const value = key === 'watts' || key === 'qty' ? rawValue.replace(/[^0-9]/g, '') : rawValue;

        updateRows(rows.map((row) => {
            if (row.id !== id) return row;
            const next = { ...row, [key]: value };

            // If a new "from" hour is at or after the "to" hour, clear "to" so
            // the row never holds an impossible time range
            if (key === 'dayFrom' && value !== '' && next.dayTo !== '' && Number(next.dayTo) <= Number(value)) {
                next.dayTo = '';
            }
            if (key === 'nightFrom' && value !== '' && next.nightTo !== '' && Number(next.nightTo) <= Number(value)) {
                next.nightTo = '';
            }
            return next;
        }));
    };

    // ----- Installation location (LocationDialog) -----
    const handleLocationChange = (key, value) => setLocation((prev) => ({ ...prev, [key]: value }));

    const handleTouch = (id, key) => {
        setTouched((prev) => ({ ...prev, [`${id}:${key}`]: true }));
    };

    const handleAddRow = () => updateRows([...rows, newRow()]);
    const handleRemoveRow = (id) => updateRows(rows.filter((row) => row.id !== id));

    const handleContinue = () => {
        if (loadReady) {
            goTo('compute');
        } else {
            // Show every "Required" message at once
            setAttempted(true);
        }
    };

    // ----- Monthly bills (reference only) -----
    const handleBillChange = (index, key, event) => {
        // Bill 2's month can't be picked — it always follows bill 1's
        if (index === 1 && key === 'period') return;

        setEngaged(true);
        const input = event.target;
        const value = key === 'period' ? input.value : input.value.replace(/[^0-9.]/g, '');
        const next = bills.map((bill) => ({ ...bill }));
        next[index][key] = value;
        setBills(withPreviousMonth(next));
    };

    // ----- Step 3: selection -----
    // Choosing a package resets the panel count to that package's default
    const handlePickPackage = (index) => setChoice((prev) => ({ ...prev, pkg: index, panels: null }));
    const handlePanelsChange = (panels) => setChoice((prev) => ({ ...prev, panels }));
    const handlePickBattery = (index) => setChoice((prev) => ({ ...prev, battery: index }));

    // ----- Request quotation -----
    const handleRequestQuote = async () => {
        setSubmitError('');
        if (authLoading) return;

        if (!user || user.role === 'customer') trackRequested(Boolean(user));

        // Guests must log in first — their inputs stay saved
        if (!user) {
            setAuthPromptOpen(true);
            return;
        }

        if (user.role !== 'customer') {
            setSubmitError(STAFF_SIGNED_IN);
            return;
        }

        // Logged-in customer: ask where the system will be installed
        setLocationAttempted(false);
        setLocationOpen(true);
    };

    // "Send request" in LocationDialog
    const handleSendRequest = async () => {
        setSubmitError('');
        if (!isLocationComplete(location)) {
            setLocationAttempted(true);
            return;
        }

        setSubmitting(true);
        try {
            // Only raw inputs and choices are sent; the server recomputes all totals
            // The session ID links this request to the anonymous quote-builder visit
            await api.post('/quotation-requests', {
                ...buildSubmitPayload(rows, bills, selection),
                location: locationPayload(location),
                site_description: location.description.trim() || null,
                quote_session_id: getQuoteSessionId(),
            });
            clearDraft();
            endQuoteSession();
            navigate('/customer/my-quotations');
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Could not send the quotation request. Please try again.');
            setSubmitting(false);
        }
    };

    // Send the guest to login/register. The draft is written right away
    // (not in the effect above) because the page unmounts immediately.
    const sendToAuth = (path) => {
        saveDraft({ screen: 'package', timeFormat, rows, bills, location, choice, awaitingLogin: true });
        navigate(`${path}?redirect=${encodeURIComponent('/quotation/new')}`);
    };

    const closeAuthPrompt = useCallback(() => setAuthPromptOpen(false), []);
    const closeLocation = useCallback(() => {
        setLocationOpen(false);
        setSubmitError('');
    }, []);

    // Signed in as the admin: log out (which clears the saved inputs), then
    // save them again and go to the login page — same hand-off as a guest
    const signedInAsStaff = Boolean(user) && user.role !== 'customer';
    const handleSwitchAccount = async () => {
        await logout();
        sendToAuth('/login');
    };

    // Message shown on Step 3 when a guest comes back after logging in
    let resumeNotice = null;
    if (awaitingLogin && user && activeScreen === 'package') {
        resumeNotice = user.role === 'customer'
            ? `Welcome back, ${user.name}. Press Request quotation below, add where the system will be installed, and send it.`
            : STAFF_SIGNED_IN;
    }

    // Wait until we know whether someone is logged in, otherwise a customer
    // would briefly see the guest page before switching to the sidebar layout
    if (authLoading) {
        return <LoadingState label="Loading..." />;
    }

    // Steps 1–3, shared by the customer layout and the guest page
    const steps = (
        <>
            {activeScreen === 'load' && (
                <ApplianceLoadStep
                    rows={rows}
                    load={load}
                    selection={selection}
                    timeFormat={timeFormat}
                    touched={touched}
                    attempted={attempted}
                    loadReady={loadReady}
                    bills={bills}
                    onTimeFormatChange={setTimeFormat}
                    onRowChange={handleRowChange}
                    onTouch={handleTouch}
                    onAddRow={handleAddRow}
                    onRemoveRow={handleRemoveRow}
                    onBillChange={handleBillChange}
                    onContinue={handleContinue}
                />
            )}

            {activeScreen === 'compute' && (
                <ComputationStep
                    rows={rows}
                    load={load}
                    onBack={() => goTo('load')}
                    onNext={() => goTo('package')}
                />
            )}

            {activeScreen === 'package' && (
                <PackageStep
                    load={load}
                    selection={selection}
                    quote={quote}
                    savings={savings}
                    selectedCost={selectedCost}
                    submitting={submitting}
                    // While the location pop-up is open, its own box shows the error
                    submitError={locationOpen ? '' : submitError}
                    resumeNotice={resumeNotice}
                    onSwitchAccount={signedInAsStaff ? handleSwitchAccount : null}
                    onPickPackage={handlePickPackage}
                    onPanelsChange={handlePanelsChange}
                    onPickBattery={handlePickBattery}
                    onSelectCost={setSelectedCost}
                    onBack={() => goTo('compute')}
                    onRequestQuote={handleRequestQuote}
                />
            )}
        </>
    );

    // Pop-ups for Step 3: guests are asked to log in, customers for the site
    const dialogs = (
        <>
            {authPromptOpen && (
                <RequestQuoteDialog
                    summaryLine={`${selection.pkg.kw} kW hybrid · ${selection.panels} × 610 W · ${selection.batteryLabel}`}
                    inverterSize={load.inverterSize}
                    onClose={closeAuthPrompt}
                    onLogin={() => sendToAuth('/login')}
                    onRegister={() => sendToAuth('/register')}
                />
            )}
            {locationOpen && (
                <LocationDialog
                    location={location}
                    seen={(key) => Boolean(touched[`location:${key}`]) || locationAttempted}
                    submitting={submitting}
                    error={submitError}
                    onChange={handleLocationChange}
                    onTouch={(key) => handleTouch('location', key)}
                    onClose={closeLocation}
                    onSubmit={handleSendRequest}
                />
            )}
        </>
    );

    // ----- Home page: the steps as a section below the hero -----
    // LandingPage already provides the header and the .se-root wrapper
    if (embedded) {
        return (
            <section id="calculator" ref={rootRef} className="se-landing-calculator">
                <div className="se-landing-calculator-nav" style={styles.landingNav}>
                    <EngineStepNav screen={activeScreen} />
                </div>
                {steps}
                {dialogs}
            </section>
        );
    }

    // ----- Logged-in customer: steps inside the customer sidebar layout -----
    if (isCustomer) {
        return (
            <CustomerLayout active="Request Quotation">
                <div className="se-root se-embedded" style={styles.embedded}>
                    <div className="se-embedded-nav">
                        <EngineStepNav screen={activeScreen} />
                    </div>
                    {steps}
                </div>

                {dialogs}
            </CustomerLayout>
        );
    }

    // ----- Guest (or any non-customer): full-width page with the engine header -----
    return (
        <div className="se-root" style={s.page}>
            <EngineHeader
                screen={activeScreen}
                user={user}
                onLogoClick={() => navigate('/')}
            />

            {steps}

            {dialogs}
        </div>
    );
}

// Shown on Step 3 when the admin (not a customer) is signed in
const STAFF_SIGNED_IN = "You're signed in as the admin. Log out and sign in as a customer to send this. Your inputs will be kept.";

const styles = {
    // Step indicator above the calculator on the home page, lined up with Step 1
    landingNav: {
        maxWidth: '1480px', margin: '0 auto', padding: '32px 40px 0', width: '100%',
        display: 'flex', justifyContent: 'flex-end',
    },
    // Inside CustomerLayout the layout already provides the page background
    // and height, so only the engine's font and text colour are set here
    embedded: {
        fontFamily: SANS,
        color: C.ink,
        WebkitFontSmoothing: 'antialiased',
    },
};
