<?php

use App\Models\Draw;
use App\Models\User;
use App\Models\UserProfile;

beforeEach(function () {
    $this->user = User::factory()->create();
    UserProfile::factory()->create(['user_id' => $this->user->id, 'crs_score' => 520, 'category' => 'CEC']);
});

describe('GET /api/v1/draws', function () {
    it('returns paginated published draws', function () {
        Draw::factory()->count(5)->create(['is_published' => true]);
        Draw::factory()->count(2)->create(['is_published' => false]);

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/draws')
            ->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'draw_number', 'date', 'category', 'cutoff_score', 'invitations_issued']],
                'meta' => ['current_page', 'total', 'per_page'],
            ]);

        // Unpublished draws should not appear
        $response = $this->actingAs($this->user, 'sanctum')->getJson('/api/v1/draws');
        expect($response->json('meta.total'))->toBe(5);
    });

    it('filters by category', function () {
        Draw::factory()->count(3)->create(['is_published' => true, 'category' => 'CEC']);
        Draw::factory()->count(2)->create(['is_published' => true, 'category' => 'General']);

        $response = $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/draws?category=CEC')
            ->assertOk();

        expect($response->json('meta.total'))->toBe(3);
    });

    it('requires authentication', function () {
        $this->getJson('/api/v1/draws')->assertStatus(401);
    });
});

describe('GET /api/v1/draws/latest', function () {
    it('returns latest published draw', function () {
        $latest = Draw::factory()->create([
            'is_published' => true,
            'date'         => now(),
            'draw_number'  => 999,
        ]);
        Draw::factory()->create([
            'is_published' => true,
            'date'         => now()->subMonth(),
            'draw_number'  => 998,
        ]);

        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/draws/latest')
            ->assertOk()
            ->assertJson(['data' => ['draw_number' => 999]]);
    });

    it('returns 404 when no draws exist', function () {
        $this->actingAs($this->user, 'sanctum')
            ->getJson('/api/v1/draws/latest')
            ->assertStatus(404);
    });
});
