<?php

use App\Http\Controllers\AdminQuotationController;
use App\Http\Controllers\AnalyticsController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\QuotationRequestController;
use App\Http\Controllers\InstallationScheduleController;
use App\Http\Controllers\ExternalInstallationRequestController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\FaqController;
use App\Http\Controllers\InboxSettingsController;
use App\Http\Controllers\QuoteSessionController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;


// ============================================================
// Authentication
// ============================================================

// Rate limits: throttle:<max>,<minutes>,<name>. The name gives each route its
// own counter; without it Laravel counts every limited route a guest uses
// against one shared limit per IP, so the calculator's tracking and the
// contact info used up the login limit ("Too many attempts").

// Limited to 10 tries a minute per IP, so passwords can't be guessed in bulk
Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:10,1,register');
Route::post('login', [AuthController::class, 'login'])->middleware('throttle:10,1,login');

// "Forgot password?": email a one-time link, then set a new password with it.
// Sending is limited harder, so the form can't be used to flood an inbox.
Route::post('/forgot-password', [PasswordResetController::class, 'sendLink'])->middleware('throttle:5,1,forgot-password');
Route::post('/reset-password', [PasswordResetController::class, 'reset'])->middleware('throttle:10,1,reset-password');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // My Profile (customers and the admin)
    Route::get('/profile/summary', [ProfileController::class, 'summary']);
    Route::put('/profile', [ProfileController::class, 'update']);
    Route::put('/profile/password', [ProfileController::class, 'changePassword'])->middleware('throttle:10,1,change-password');
});


// ============================================================
// FAQs
// ============================================================

Route::get('/faqs', [FaqController::class, 'index']);


// ============================================================
// Quote builder usage (anonymous, for analytics)
// ============================================================

Route::post('/quote-sessions/track', [QuoteSessionController::class, 'track'])
    ->middleware('throttle:60,1,quote-track');


// ============================================================
// External Installation Requests
// ============================================================

Route::post('/external-installation-requests', [ExternalInstallationRequestController::class, 'store'])
    ->middleware('throttle:10,60,external-request');

Route::get('/external-installation-requests/{externalInstallationRequest}/status', [ExternalInstallationRequestController::class, 'status'])
    ->middleware('signed')
    ->name('external-installation-requests.status');

// How to reach the business owner (shown on the Privacy Policy / Terms pages)
Route::get('/contact', [InboxSettingsController::class, 'contact'])->middleware('throttle:60,1,contact');


// ============================================================
// Notifications (the bell) — admins and customers
// ============================================================

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/notifications', [NotificationController::class, 'index'])->middleware('throttle:120,1,notifications');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead']);
    Route::post('/notifications/read-all', [NotificationController::class, 'markAllRead']);
});


// ============================================================
// Messages
// ============================================================

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/admin-id', [MessageController::class, 'getAdminId']);
    Route::post('/messages', [MessageController::class, 'send']);
    Route::get('/messages/{user_id}', [MessageController::class, 'getConversation']);
    Route::get('/messages/{user_id}/unread', [MessageController::class, 'checkUnread']);
    Route::patch('/messages/{chatMessage}/read', [MessageController::class, 'markRead']);
});


// ============================================================
// Admin Routes
// ============================================================

Route::middleware(['auth:sanctum', 'role:admin'])
    ->prefix('admin')
    ->group(function () {

        // ----------------------------
        // Quotation Requests
        // ----------------------------

        Route::get('/quotation-requests', [AdminQuotationController::class, 'index']);
        Route::get('/quotation-requests/{quotationRequest}', [AdminQuotationController::class, 'show']);
        Route::post('/quotation-requests/{quotationRequest}/approve', [AdminQuotationController::class, 'approve']);
        Route::post('/quotation-requests/{quotationRequest}/reject', [AdminQuotationController::class, 'reject']);


        // ----------------------------
        // External Installation Requests
        // ----------------------------

        Route::get('/external-installation-requests', [ExternalInstallationRequestController::class, 'adminIndex']);
        Route::get('/external-installation-requests/{externalInstallationRequest}/quotation', [ExternalInstallationRequestController::class, 'downloadQuotation']);
        Route::post('/external-installation-requests/{externalInstallationRequest}/confirm', [ExternalInstallationRequestController::class, 'confirm']);
        Route::post('/external-installation-requests/{externalInstallationRequest}/reject', [ExternalInstallationRequestController::class, 'reject']);


        // ----------------------------
        // Materials PDF for suppliers
        // ----------------------------
        // The admin sends it on Messenger; nothing is saved or tracked.

        Route::post('/quotations/{quotation}/materials-pdf', [ReportController::class, 'materialsPdf']);


        // ----------------------------
        // Installation Schedules
        // ----------------------------

        Route::get('/schedules', [InstallationScheduleController::class, 'adminIndex']);
        Route::post('/schedules', [InstallationScheduleController::class, 'store']);
        Route::put('/schedules/{installationSchedule}', [InstallationScheduleController::class, 'update']);
        Route::patch('/schedules/{installationSchedule}/status', [InstallationScheduleController::class, 'updateStatus']);
        Route::get('/customers', [InstallationScheduleController::class, 'customersIndex']);


        // ----------------------------
        // FAQ Management
        // ----------------------------

        Route::post('/faqs', [FaqController::class, 'store']);
        Route::put('/faqs/{faq}', [FaqController::class, 'update']);
        Route::delete('/faqs/{faq}', [FaqController::class, 'destroy']);


        // ----------------------------
        // Reports
        // ----------------------------

        Route::get('/reports/quotation/{quotationId}', [ReportController::class, 'quotationReport']);
        Route::get('/reports/quotation-history', [ReportController::class, 'quotationHistoryReport']);
        Route::get('/reports/quotation-material', [ReportController::class, 'quotationMaterialReport']);


        // ----------------------------
        // Audit Logs
        // ----------------------------

        Route::get('/audit-logs', [\App\Http\Controllers\AuditLogController::class, 'index']);


        // ----------------------------
        // Users (all accounts)
        // ----------------------------

        Route::get('/users', [UserController::class, 'index']);


        // ----------------------------
        // Analytics
        // ----------------------------

        Route::get('/analytics', [AnalyticsController::class, 'overview']);
        Route::get('/analytics/quote-sessions', [QuoteSessionController::class, 'analytics']);
        Route::get('/reports/analytics-summary', [ReportController::class, 'analyticsSummaryReport']);
        Route::get('/reports/quote-sessions', [ReportController::class, 'quoteSessionsReport']);
        Route::get('/reports/external-requests', [ReportController::class, 'externalRequestsReport']);
    });


// ============================================================
// Admin Conversations
// ============================================================

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('/conversations', [MessageController::class, 'getConversations']);
    Route::get('/admin/inbox-settings', [InboxSettingsController::class, 'show']);
    Route::put('/admin/inbox-settings', [InboxSettingsController::class, 'update']);
});


// ============================================================
// Admin Test Route
// ============================================================

Route::middleware(['auth:sanctum', 'role:admin'])->get('/admin-only', function () {
    return response()->json([
        'message' => 'Welcome, Admin.'
    ]);
});


// ============================================================
// Customer Routes
// ============================================================

Route::middleware(['auth:sanctum', 'role:customer'])->group(function () {

    Route::get('/quotation-requests', [QuotationRequestController::class, 'index']);
    Route::post('/quotation-requests', [QuotationRequestController::class, 'store']);
    Route::get('/quotation-requests/{quotationRequest}', [QuotationRequestController::class, 'show']);
    Route::patch('/quotation-requests/{quotationRequest}/submit', [QuotationRequestController::class, 'submit']);

    Route::get('/customer/schedules', [InstallationScheduleController::class, 'customerSchedule']);

    Route::get('/customer/reports/quotation/{quotationId}', [ReportController::class, 'quotationReport']);
});