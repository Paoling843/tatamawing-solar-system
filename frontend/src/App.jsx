// Import routing tools — Routes holds all routes, Route defines each page,
// Navigate redirects to a different page programmatically
import { Routes, Route, Navigate } from 'react-router-dom';

// Import our custom hook to access the logged-in user and loading state
import { useAuth } from './context/auth-context';

// Import all the page components we'll be routing to
// Make sure these names exactly match the export names in each file
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import QuotationFormPage from './pages/QuotationFormPage';
import QuotationResultPage from './pages/QuotationResultPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminQuotationDetailPage from './pages/AdminQuotationDetailPage';
import SupplierDashboardPage from './pages/SupplierDashboardPage';
import SupplierPurchaseRequestPage from './pages/SupplierPurchaseRequestPage';
import CustomerSchedulePage from './pages/CustomerSchedulePage';
import AdminSchedulePage from './pages/AdminSchedulePage';
import SupplierChatPage from './pages/SupplierChatPage';
import AdminInboxPage from './pages/AdminInboxPage';
import FaqPage from './pages/FaqPage';
import AdminFaqPage from './pages/AdminFaqPage';
import AdminReportPage from './pages/AdminReportPage';
import CustomerDashboardPage from './pages/CustomerDashboardPage';
import AdminPurchaseRequestsPage from './pages/AdminPurchaseRequests';
import AdminProjectsPage from './pages/AdminProjectsPage';
import AdminSystemPage from './pages/AdminSystemPage';
import CustomerDownloadsPage from './pages/CustomerDownloadsPage';
import CustomerMyQuotationsPage from './pages/CustomerMyQuotationsPage';
import LandingPage from './pages/LandingPage';

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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route path="/quotation/new" element={
                <ProtectedRoute allowedRoles={['customer']}>
                    <QuotationFormPage />
                </ProtectedRoute>
            } />

            <Route path="/quotation/result" element={
                <ProtectedRoute allowedRoles={['customer']}>
                    <QuotationResultPage />
                </ProtectedRoute>
            } />

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

            <Route path="/supplier/dashboard" element={
                <ProtectedRoute allowedRoles={['supplier']}>
                    <SupplierDashboardPage />
                </ProtectedRoute>
            } />

            <Route path="/supplier/purchase-requests/:id" element={
                <ProtectedRoute allowedRoles={['supplier']}>
                    <SupplierPurchaseRequestPage />
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
            <Route path="/supplier/chat" element={
                <ProtectedRoute allowedRoles={['supplier']}>
                    <SupplierChatPage />
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
            <Route path="/admin/projects" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminProjectsPage />
                </ProtectedRoute>
            } />

            <Route path="/admin/system" element={
                <ProtectedRoute allowedRoles={['admin']}>
                    <AdminSystemPage />
                </ProtectedRoute>
            } />
            <Route path="/customer/quotations" element={
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
