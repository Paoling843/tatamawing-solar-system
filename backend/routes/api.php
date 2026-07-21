<?php

use App\Http\Controllers\AdminQuotationController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PurchaseRequestController;
use App\Http\Controllers\QuotationRequestController;
use App\Http\Controllers\InstallationScheduleController;
use App\Http\Controllers\MessageController;
use App\Http\Controllers\FaqController;
use App\Http\Controllers\ReportController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/register', [AuthController::class, 'register']);
Route::post('login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/admin-id', [MessageController::class, 'getAdminId']);
    Route::post('/messages', [MessageController::class, 'send']);
    Route::get('/messages/{user_id}', [MessageController::class, 'getConversation']);
    Route::patch('/messages/{chatMessage}/read', [MessageController::class, 'markRead']);
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});

Route::get('/faqs', [FaqController::class, 'index']);

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/quotation-requests', [AdminQuotationController::class, 'index']);
    Route::get('/quotation-requests/{quotationRequest}', [AdminQuotationController::class, 'show']);
    Route::post('/quotation-requests/{quotationRequest}/approve', [AdminQuotationController::class, 'approve']);
    Route::post('/quotation-requests/{quotationRequest}/reject', [AdminQuotationController::class, 'reject']);
    Route::get('/purchase-requests', [PurchaseRequestController::class, 'adminIndex']);
    Route::post('/purchase-requests', [PurchaseRequestController::Class, 'store']);
    Route::get('/suppliers', [PurchaseRequestController::class, 'getSuppliers']);
    Route::get('/schedules', [InstallationScheduleController::class, 'adminIndex']);
    Route::post('/schedules', [InstallationScheduleController::class, 'store']);
    Route::put('/schedules/{installationSchedule}', [InstallationScheduleController::class, 'update']);
    Route::post('/faqs', [FaqController::class, 'store']);
    Route::put('/faqs/{faq}', [FaqController::class, 'update']);
    Route::delete('/faqs/{faq}', [FaqController::class, 'destroy']);
    Route::get('/reports/quotation/{quotationId}', [ReportController::class, 'quotationReport']);
    Route::get('/reports/quotation-history', [ReportController::class, 'quotationHistoryReport']);
    Route::get('/reports/quotation-material', [ReportController::class, 'quotationMaterialReport']);
    Route::get('/reports/procurement', [ReportController::class, 'procurementReport']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    Route::get('/conversations', [MessageController::class, 'getConversations']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->get('/admin-only', function () {
    return response()->json([
        'message' => 'Welcome, Admin.'
    ]);
});

Route::middleware(['auth:sanctum', 'role:customer'])->group(function() {
    Route::get('/quotation-requests', [QuotationRequestController::class, 'index']);
    Route::post('/quotation-requests', [QuotationRequestController::class, 'store']);
    Route::get('/quotation-requests/{quotationRequest}', [QuotationRequestController::class, 'show']);
    Route::patch('/quotation-requests/{quotationRequest}/submit', [QuotationRequestController::class, 'submit']);
    Route::get('/customer/schedules', [InstallationScheduleController::class, 'customerSchedule']);
    Route::get('/customer/reports/quotation/{quotationId}', [ReportController::class, 'quotationReport']);
});

Route::middleware(['auth:sanctum', 'role:supplier'])->prefix('supplier')->group(function () {
    Route::get('/purchase-requests', [PurchaseRequestController::class, 'supplierIndex']);
    Route::patch('/purchase-requests/{purchaseRequest}/confirm', [PurchaseRequestController::class, 'confirm']);
    Route::patch('/purchase-requests/{purchaseRequest}/update-items', [PurchaseRequestController::class, 'updateItems']);
});
