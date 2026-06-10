<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;

beforeEach(function () {
    $this->baseUrl = '/api/v1/auth';
    Notification::fake();
});

describe('POST /api/v1/auth/forgot-password', function () {
    it('sends reset link for existing email', function () {
        $user = User::factory()->create(['email' => 'forgot@example.com']);

        $this->postJson("{$this->baseUrl}/forgot-password", [
            'email' => 'forgot@example.com',
        ])->assertOk()->assertJsonStructure(['message']);

        Notification::assertSentTo($user, ResetPassword::class);
    });

    it('returns validation error for missing email', function () {
        $this->postJson("{$this->baseUrl}/forgot-password", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    });

    it('does not reveal whether email exists (returns 422 on unknown email)', function () {
        $this->postJson("{$this->baseUrl}/forgot-password", [
            'email' => 'doesnotexist@example.com',
        ])->assertStatus(422);
    });
});

describe('POST /api/v1/auth/reset-password', function () {
    it('resets password with valid token', function () {
        $user = User::factory()->create([
            'email'    => 'reset@example.com',
            'password' => Hash::make('OldPassword1!'),
        ]);

        $token = Password::createToken($user);

        $this->postJson("{$this->baseUrl}/reset-password", [
            'token'                 => $token,
            'email'                 => 'reset@example.com',
            'password'              => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ])->assertOk()->assertJsonStructure(['message']);

        expect(Hash::check('NewPassword1!', $user->fresh()->password))->toBeTrue();
    });

    it('rejects invalid token', function () {
        User::factory()->create(['email' => 'reset2@example.com']);

        $this->postJson("{$this->baseUrl}/reset-password", [
            'token'                 => 'invalid-token',
            'email'                 => 'reset2@example.com',
            'password'              => 'NewPassword1!',
            'password_confirmation' => 'NewPassword1!',
        ])->assertStatus(422);
    });

    it('rejects mismatched passwords', function () {
        $this->postJson("{$this->baseUrl}/reset-password", [
            'token'                 => 'any-token',
            'email'                 => 'test@example.com',
            'password'              => 'NewPassword1!',
            'password_confirmation' => 'Different1!',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);
    });
});
