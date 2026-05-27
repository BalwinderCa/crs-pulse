<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    public function __construct(private UserRepositoryInterface $users) {}

    public function register(array $data): array
    {
        $user = $this->users->create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => $data['password'],
        ]);

        $this->users->createProfile($user);

        $token = $this->createToken($user, $data['device_name']);

        return compact('user', 'token');
    }

    public function login(array $credentials): array
    {
        $user = $this->users->findByEmail($credentials['email']);

        if (! $user || ! Hash::check($credentials['password'], $user->password ?? '')) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        $token = $this->createToken($user, $credentials['device_name']);

        return compact('user', 'token');
    }

    public function googleLogin(string $idToken, string $deviceName): array
    {
        // Verify Google ID token via Firebase Admin SDK
        $payload = app(FCMService::class)->verifyGoogleToken($idToken);

        $user = $this->users->findByGoogleId($payload['sub'])
            ?? $this->users->findByEmail($payload['email']);

        if (! $user) {
            $user = $this->users->create([
                'name'               => $payload['name'],
                'email'              => $payload['email'],
                'google_id'          => $payload['sub'],
                'avatar_url'         => $payload['picture'] ?? null,
                'email_verified_at'  => now(),
            ]);
            $this->users->createProfile($user);
        } elseif (! $user->google_id) {
            $user->update(['google_id' => $payload['sub']]);
        }

        $token = $this->createToken($user, $deviceName);

        return compact('user', 'token');
    }

    public function logout(User $user): void
    {
        $user->currentAccessToken()->delete();
    }

    private function createToken(User $user, string $deviceName): string
    {
        $expiresAt = now()->addDays((int) config('sanctum.token_expiry_days', 30));

        return $user->createToken($deviceName, ['*'], $expiresAt)->plainTextToken;
    }
}
