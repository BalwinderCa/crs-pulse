<?php

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Support\Facades\Hash;

beforeEach(function () {
    $this->baseUrl = '/api/v1/auth';
});

describe('POST /api/v1/auth/register', function () {
    it('registers a new user and returns token', function () {
        $response = $this->postJson("{$this->baseUrl}/register", [
            'name'                  => 'John Doe',
            'email'                 => 'john@example.com',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
            'device_name'           => 'Android Test',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'data' => ['user' => ['id', 'email', 'name'], 'token'],
                'message',
            ]);

        expect(User::where('email', 'john@example.com')->exists())->toBeTrue();
        expect(UserProfile::whereHas('user', fn ($q) => $q->where('email', 'john@example.com'))->exists())->toBeTrue();
    });

    it('rejects duplicate email', function () {
        User::factory()->create(['email' => 'existing@example.com']);

        $this->postJson("{$this->baseUrl}/register", [
            'name'                  => 'Jane',
            'email'                 => 'existing@example.com',
            'password'              => 'Password123!',
            'password_confirmation' => 'Password123!',
            'device_name'           => 'Android',
        ])->assertStatus(422)->assertJsonValidationErrors(['email']);
    });

    it('rejects short password', function () {
        $this->postJson("{$this->baseUrl}/register", [
            'name'                  => 'Jane',
            'email'                 => 'jane@example.com',
            'password'              => 'short',
            'password_confirmation' => 'short',
            'device_name'           => 'Android',
        ])->assertStatus(422)->assertJsonValidationErrors(['password']);
    });
});

describe('POST /api/v1/auth/login', function () {
    it('logs in with valid credentials', function () {
        $user = User::factory()->create([
            'email'    => 'test@example.com',
            'password' => Hash::make('Password123!'),
        ]);
        UserProfile::factory()->create(['user_id' => $user->id]);

        $this->postJson("{$this->baseUrl}/login", [
            'email'       => 'test@example.com',
            'password'    => 'Password123!',
            'device_name' => 'Android',
        ])->assertOk()->assertJsonStructure(['data' => ['user', 'token']]);
    });

    it('rejects wrong password', function () {
        User::factory()->create([
            'email'    => 'test@example.com',
            'password' => Hash::make('CorrectPass!'),
        ]);

        $this->postJson("{$this->baseUrl}/login", [
            'email'       => 'test@example.com',
            'password'    => 'WrongPass!',
            'device_name' => 'Android',
        ])->assertStatus(422);
    });
});

describe('POST /api/v1/auth/logout', function () {
    it('logs out authenticated user', function () {
        $user = User::factory()->create();
        UserProfile::factory()->create(['user_id' => $user->id]);

        $this->actingAs($user, 'sanctum')
            ->postJson("{$this->baseUrl}/logout")
            ->assertOk()
            ->assertJson(['message' => 'Logged out successfully.']);
    });

    it('requires authentication', function () {
        $this->postJson("{$this->baseUrl}/logout")->assertStatus(401);
    });
});
