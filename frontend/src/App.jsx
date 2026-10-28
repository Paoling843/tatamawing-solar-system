// Import routing tools — Routes holds all routes, Route defines each page,
// Navigate redirects to a different page programmatically
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';

import ErrorBoundary from './components/ErrorBoundary';
import FullPageMessage from './components/FullPageMessage';
import LoadingState from './components/LoadingState';
import { NETWORK_MESSAGE } from './utils/errorMessage';

// Import our custom hook to access the logged-in user and loading state
import { useAuth } from './context/auth-context';

// Import all the page components we'll be routing to
// Make sure these names exactly match the export names in each file
import AuthPage from './pages/AuthPage';
import QuotationFormPage from './pages/QuotationFormPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminQuotationDetailPage from './pages/AdminQuotationDetailPage';
import CustomerSchedulePage from './pages/CustomerSchedulePage';
import AdminSchedulePage from './pages/AdminSchedulePage';
import AdminInboxPage from './pages/AdminInboxPage';
import FaqPage from './pages/FaqPage';
import AdminFaqPage from './pages/AdminFaqPage';
import AdminReportPage from './pages/AdminReportPage';
import AdminAuditPage from './pages/AdminAuditPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import AdminQuotationsPage from './pages/AdminQuotationsPage';
import AdminSystemPage from './pages/AdminSystemPage';
import CustomerDownloadsPage from './pages/CustomerDownloadsPage';
import CustomerMyQuotationsPage from './pages/CustomerMyQuotationsPage';
import LandingPage from './pages/LandingPage';
import ExternalInstallationRequestPage from './pages/ExternalInstallationRequestPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';

const dashboardFor = (user) => (user?.role === 'admin' ? '/admin/dashboard' : '/customer/dashboard');

function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading, authError, retryAuth, sessionNotice } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    if (loading) {
        return (
            <FullPageMessage>
                <LoadingState label="Connecting to the server…" />
            </FullPageMessage>
        );
    }

    // The saved login couldn't be checked because the server didn't answer.
    // The login is kept, so "Try again" picks up where they left off.
    if (authError) {
        return (
            <FullPageMessage
                title="Can't reach the server"
                description={NETWORK_MESSAGE}
                actions={[
                    { label: 'Try again', primary: true, onClick: retryAuth },
                    { label: 'Go to home', onClick: () => navigate('/') },
                ]}
            />
        );
    }

    if (!user) {
        // Login expired mid-session: back to the login page, which says why,
        // and then back to this page after signing in
        return sessionNotice
            ? <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />
            : <Navigate to="/" />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <FullPageMessage
                title="This page isn't for your account"
                description={allowedRoles.includes('admin')
                    ? 'This page is only for the TataMawing admin.'
                    : 'This page is for customer accounts.'}
                actions={[{ label: 'Go to my dashboard', primary: true, onClick: () => navigate(dashboardFor(user)) }]}
            />
        );
    }
    return children;
}

// Unknown address: logged-in users go to their own dashboard, guests to login
function CatchAll() {
    const { user, loading } = useAuth();
    if (loading) return null;
    return <Navigate to={user ? dashboardFor(user) : '/login'} replace />;
}


export default function App() {
    const location = useLocation();

    return (
        // Keyed by the URL so a crash on one page doesn't follow you to the next
        <ErrorBoundary key={location.pathname}>
        <Routes>
            <Route path="/" element={<LandingPage />} />
            {/* One auth page with a Log in / Register switch. /register just opens
                it in register mode (the keys make each URL start fresh). */}
            <Route path="/login" element={<AuthPage key="login" />} />
            <Route path="/register" element={<AuthPage key="register" initialMode="register" />} />

            {/* Solar Computation Engine — open to guests; login is only
                required when they press "Request quotation" */}
            <Route path="/quotation/new" element={<QuotationFormPage />} />
            <Route path="/external-installation-request" element={<ExternalInstallationRequestPage />} />

            {/* Public legal pages (linked from sign-up, footers and the forms) */}
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />

            <Route path="*" element={<CatchAll />} />

            <Route path="/admin/dashboard" element ={
                <ProtectedRoute allowedRoles={'admin'}>
                    <AdminDashboardPage />
                </ProtectedRoute>
            } />

            <Route path="/admin/quotation-requests/:id" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminQuotationDetailPage />
                </ProtectedRoute>
            } />

            <Route path="/customer/schedule" element={
                <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerSchedulePage />
                </ProtectedRoute>
            } />

            <Route path="/admin/schedule" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminSchedulePage />
                </ProtectedRoute>
            } />
            <Route path="/admin/inbox" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminInboxPage />
                </ProtectedRoute>
            } />

            <Route path="/faqs" element={<FaqPage />} />

            <Route path="/admin/faqs" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminFaqPage />
                </ProtectedRoute>
            } />

            <Route path="/admin/reports" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminReportPage />
                </ProtectedRoute>
            } />

            <Route path="/customer/dashboard" element={
                <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboardPage />
                </ProtectedRoute>
            } />

            <Route path="/admin/schedules" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminSchedulePage />
                </ProtectedRoute>
            } />
            <Route path="/admin/quotations" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminQuotationsPage />
                </ProtectedRoute>
            } />

            <Route path="/admin/system" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminSystemPage />
                </ProtectedRoute>
            } />
            <Route path="/admin/audit" element={<Navigate to="/admin/audit-logs" replace />} />
            <Route path="/admin/audit-logs" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminAuditPage />
                </ProtectedRoute>
            } />
            <Route path="/customer/my-quotations" element={
                <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerMyQuotationsPage />
                </ProtectedRoute>
            } />

            <Route path="/customer/downloads" element={
                <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDownloadsPage />
                </ProtectedRoute>
            } />


        </Routes>
        </ErrorBoundary>
    );
}
