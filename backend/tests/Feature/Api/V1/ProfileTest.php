<?php

use App\Models\User;
use App\Models\UserProfile;

beforeEach(function () {
    $this->user = User::factory()->create();
    $this->profile = UserProfile::factory()->create([
        'user_id'   => $this->user->id,
        'crs_score' => 500,
        'category'  => 'General',
    ]);
});

describe('GET /api/v1/profile', function () {
    it('returns user profile', function () {
        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/profile')
            ->assertOk()
            ->assertJsonStructure(['data' => ['crs_score', 'category', 'notifications_enabled']]);
    });
});

describe('PUT /api/v1/profile', function () {
    it('updates crs_score and category', function () {
        $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/v1/profile', [
                'crs_score' => 539,
                'category'  => 'CEC',
            ])
            ->assertOk()
            ->assertJson(['data' => ['crs_score' => 539, 'category' => 'CEC']]);

        expect($this->profile->fresh()->crs_score)->toBe(539);
        expect($this->profile->fresh()->category)->toBe('CEC');
    });

    it('rejects invalid crs_score', function () {
        $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/v1/profile', ['crs_score' => 1500])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['crs_score']);
    });

    it('rejects invalid category', function () {
        $this->actingAs($this->user, 'sanctum')
            ->putJson('/api/v1/profile', ['category' => 'Invalid'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['category']);
    });
});
