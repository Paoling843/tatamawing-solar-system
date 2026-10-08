// Import routing tools — Routes holds all routes, Route defines each page,
// Navigate redirects to a different page programmatically
import { Routes, Route, Navigate } from 'react-router-dom';

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
import AdminPurchaseRequestsPage from './pages/AdminPurchaseRequests';
import AdminPurchaseRequestDetailPage from './pages/AdminPurchaseRequestDetailPage';
import AdminQuotationsPage from './pages/AdminQuotationsPage';
import AdminSystemPage from './pages/AdminSystemPage';
import CustomerDownloadsPage from './pages/CustomerDownloadsPage';
import CustomerMyQuotationsPage from './pages/CustomerMyQuotationsPage';
import LandingPage from './pages/LandingPage';
import ExternalInstallationRequestPage from './pages/ExternalInstallationRequestPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';

function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user) return <Navigate to="/" />;

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <div>Forbidden - you do not have access to this page.</div>;
    }
    return children;
}


export default function App() {
    return (
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

            <Route path="*" element={<Navigate to="/login" />} />

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
            <Route path="/admin/purchase-requests" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPurchaseRequestsPage />
                </ProtectedRoute>
            } />
            <Route path="/admin/purchase-requests/:id" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminPurchaseRequestDetailPage />
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

    );
}
