<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\AppleLoginRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterRequest;
use App\Services\AppleAuthService;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private AuthService $authService) {}

    public function register(RegisterRequest $request): JsonResponse
    {
        $result = $this->authService->register($request->validated());

        return response()->json([
            'data' => [
                'user'  => $result['user'],
                'token' => $result['token'],
            ],
            'message' => 'Registration successful.',
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $result = $this->authService->login($request->validated());

        return response()->json([
            'data' => [
                'user'  => $result['user']->load('profile'),
                'token' => $result['token'],
            ],
            'message' => 'Login successful.',
        ]);
    }

    public function appleLogin(AppleLoginRequest $request): JsonResponse
    {
        $result = app(AppleAuthService::class)->authenticate(
            $request->validated('identity_token'),
            $request->validated('nonce'),
            $request->validated('full_name'),
            $request->validated('device_name'),
        );

        return response()->json([
            'data' => [
                'user'  => $result['user']->load('profile'),
                'token' => $result['token'],
            ],
            'message' => 'Apple login successful.',
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $request->user()->load('profile'),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $this->authService->logout($request->user());

        return response()->json(['message' => 'Logged out successfully.']);
    }
}
