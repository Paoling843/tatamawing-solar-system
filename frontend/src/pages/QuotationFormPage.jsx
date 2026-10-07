import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth-context';
import api from '../api/axios';
import { trackStep, trackRequested, getQuoteSessionId, endQuoteSession } from '../services/quoteTracker';
import { loadDraft, saveDraft, clearDraft } from '../services/quoteDraft';
import {
    computeLoad, resolveSelection, buildQuote, computeSavings, isRowComplete, prevMonth, buildSubmitPayload,
} from '../services/solarEngine';
import CustomerLayout from '../components/CustomerLayout';
import LoadingState from '../components/LoadingState';
import EngineHeader from './quote-builder/EngineHeader';
import EngineStepNav from './quote-builder/EngineStepNav';
import ApplianceLoadStep from './quote-builder/ApplianceLoadStep';
import ComputationStep from './quote-builder/ComputationStep';
import PackageStep from './quote-builder/PackageStep';
import RequestQuoteDialog from './quote-builder/RequestQuoteDialog';
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

// Screen → step number reported to the anonymous analytics tracker
const STEP_NUMBERS = { load: 1, compute: 2, package: 3 };
const NO_CHOICE = { pkg: null, panels: null, battery: null };


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

export default function QuotationFormPage() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();

    // Every visit is a new session: saved inputs only come back when this
    // visit is the guest's return from the login/register page. (Read only —
    // React may call this twice in development, so nothing is changed here.)
    const [draft] = useState(() => {
        const saved = loadDraft();
        return saved?.awaitingLogin ? saved : null;
    });

    // ----- State -----
    const [screen, setScreen] = useState(draft?.screen ?? 'load');   // load | compute | package
    const [timeFormat, setTimeFormat] = useState(draft?.timeFormat ?? '24');
    const [rows, setRows] = useState(draft?.rows ?? []);
    const [bills, setBills] = useState(draft?.bills ?? [EMPTY_BILL, EMPTY_BILL]);

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
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // ----- Derived values (recomputed whenever the inputs change) -----
    const load = useMemo(() => computeLoad(rows), [rows]);
    const selection = resolveSelection(load, choice);
    const quote = buildQuote(selection.pkg, selection.panels, selection.battery);
    const savings = computeSavings(load.grand, selection.panels, quote.total, bills);
    const loadReady = rows.length > 0 && rows.every(isRowComplete);

    // Logged-in customers use the engine inside their sidebar layout
    const isCustomer = user?.role === 'customer';

    // Which screen to actually show:
    // - a draft saved before the landing moved to the home page may still
    //   say 'landing'; start those at Step 1
    // - Steps 2 and 3 need a valid appliance list; if it isn't (e.g. every
    //   row was removed), fall back to Step 1
    let activeScreen = screen;
    if (activeScreen === 'landing') activeScreen = 'load';
    if ((activeScreen === 'compute' || activeScreen === 'package') && !loadReady) activeScreen = 'load';

    // Keep the saved inputs current. awaitingLogin is always saved as false:
    // the login hand-off is used up once the guest is back here, so a later
    // refresh starts a new session. Only sendToAuth() saves it as true.
    useEffect(() => {
        saveDraft({ screen, timeFormat, rows, bills, choice, awaitingLogin: false });
    }, [screen, timeFormat, rows, bills, choice]);

    // Anonymous analytics: report how far this visit got (see quoteTracker.js).
    // Admins trying the calculator aren't counted.
    useEffect(() => {
        if (authLoading || (user && user.role !== 'customer')) return;
        trackStep(STEP_NUMBERS[activeScreen] ?? 1, Boolean(user));
    }, [activeScreen, user, authLoading]);

    const goTo = (next) => {
        setScreen(next);
        window.scrollTo(0, 0);
    };

    // ----- Step 1: appliance rows -----
    const handleRowChange = (id, key, rawValue) => {
        // Watts and quantity are whole numbers, so strip anything else as they type
        const value = key === 'watts' || key === 'qty' ? rawValue.replace(/[^0-9]/g, '') : rawValue;

        setRows((prev) => prev.map((row) => {
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

    const handleTouch = (id, key) => {
        setTouched((prev) => ({ ...prev, [`${id}:${key}`]: true }));
    };

    const handleAddRow = () => setRows((prev) => [...prev, newRow()]);
    const handleRemoveRow = (id) => setRows((prev) => prev.filter((row) => row.id !== id));

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
        const input = event.target;
        let value = key === 'period' ? input.value : input.value.replace(/[^0-9.]/g, '');
        const next = bills.map((bill) => ({ ...bill }));

        if (index === 1 && key === 'period') {
            // Bill 2 is locked until bill 1 has a month...
            const cap = prevMonth(bills[0].period);
            if (!cap) {
                input.value = '';
                return;
            }
            // ...and can't be later than the month before bill 1. A typed-in
            // month can already equal the value in state, in which case React
            // won't re-render, so the field is also snapped back by hand.
            if (value && value > cap) {
                value = cap;
                input.value = cap;
            }
        }

        next[index][key] = value;

        if (index === 0 && key === 'period') {
            // Changing bill 1 can make bill 2's month invalid — clear it if so
            const cap = prevMonth(value);
            if (!value || (next[1].period && next[1].period > cap)) {
                next[1].period = '';
            }
        }

        setBills(next);
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
            setSubmitError('Only customer accounts can request a quotation. Log in with a customer account to continue.');
            return;
        }

        setSubmitting(true);
        try {
            // Only raw inputs and choices are sent; the server recomputes all totals
            // The session ID links this request to the anonymous quote-builder visit
            await api.post('/quotation-requests', {
                ...buildSubmitPayload(rows, bills, selection),
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
        saveDraft({ screen: 'package', timeFormat, rows, bills, choice, awaitingLogin: true });
        navigate(`${path}?redirect=${encodeURIComponent('/quotation/new')}`);
    };

    const closeAuthPrompt = useCallback(() => setAuthPromptOpen(false), []);

    // Message shown on Step 3 when a guest comes back after logging in
    let resumeNotice = null;
    if (awaitingLogin && user && activeScreen === 'package') {
        resumeNotice = user.role === 'customer'
            ? `Welcome back, ${user.name}. Your configuration is just as you left it — press Request quotation below to send it.`
            : 'You are signed in with a non-customer account. Log in with a customer account to request this quotation.';
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
                    submitError={submitError}
                    resumeNotice={resumeNotice}
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

            {authPromptOpen && (
                <RequestQuoteDialog
                    summaryLine={`${selection.pkg.kw} kW hybrid · ${selection.panels} × 610 W · ${selection.battery.ah} Ah`}
                    adjustedWh={load.adjusted}
                    onClose={closeAuthPrompt}
                    onLogin={() => sendToAuth('/login')}
                    onRegister={() => sendToAuth('/register')}
                />
            )}
        </div>
    );
}

const styles = {
    // Inside CustomerLayout the layout already provides the page background
    // and height, so only the engine's font and text colour are set here
    embedded: {
        fontFamily: SANS,
        color: C.ink,
        WebkitFontSmoothing: 'antialiased',
    },
};
