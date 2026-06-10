<?php

use App\Http\Controllers\Api\V1\AnalyticsController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\DrawController;
use App\Http\Controllers\Api\V1\ForgotPasswordController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ProfileController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->name('api.v1.')->group(function () {

    // Health check
    Route::get('/health', fn () => response()->json(['status' => 'ok', 'version' => '1.0.0']));

    // ── Auth (rate limited: 10/min) ──────────────────────────────────────────
    Route::prefix('auth')->name('auth.')->middleware('throttle:auth')->group(function () {
        Route::post('/register',         [AuthController::class, 'register'])->name('register');
        Route::post('/login',            [AuthController::class, 'login'])->name('login');
        Route::post('/google',           [AuthController::class, 'googleLogin'])->name('google');
        Route::post('/apple',            [AuthController::class, 'appleLogin'])->name('apple');
        Route::post('/forgot-password',  [ForgotPasswordController::class, 'sendResetLink'])->name('forgot-password');
        Route::post('/reset-password',   [ForgotPasswordController::class, 'resetPassword'])->name('reset-password');

        Route::middleware('auth:sanctum')->group(function () {
            Route::get('/me',     [AuthController::class, 'me'])->name('me');
            Route::post('/logout', [AuthController::class, 'logout'])->name('logout');
        });
    });

    // ── Authenticated routes ─────────────────────────────────────────────────
    Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

        // Dashboard
        Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

        // Draws
        Route::prefix('draws')->name('draws.')->group(function () {
            Route::get('/',        [DrawController::class, 'index'])->name('index');
            Route::get('/latest',  [DrawController::class, 'latest'])->name('latest');
            Route::get('/{id}',    [DrawController::class, 'show'])->name('show');
        });

        // Analytics
        Route::get('/analytics', [AnalyticsController::class, 'index'])->name('analytics');

        // Notifications
        Route::prefix('notifications')->name('notifications.')->group(function () {
            Route::get('/',              [NotificationController::class, 'index'])->name('index');
            Route::post('/read-all',     [NotificationController::class, 'markAllRead'])->name('read-all');
            Route::patch('/{id}/read',   [NotificationController::class, 'markRead'])->name('read');
            Route::post('/token',        [NotificationController::class, 'registerToken'])->name('token.register');
            Route::delete('/token',      [NotificationController::class, 'revokeToken'])->name('token.revoke');
        });

        // Profile
        Route::prefix('profile')->name('profile.')->group(function () {
            Route::get('/',    [ProfileController::class, 'show'])->name('show');
            Route::put('/',    [ProfileController::class, 'update'])->name('update');
            Route::delete('/', [ProfileController::class, 'destroy'])->name('destroy');
        });
    });
});
