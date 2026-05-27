<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class DrawFactory extends Factory
{
    private static int $drawNumber = 1;

    public function definition(): array
    {
        return [
            'draw_number'       => self::$drawNumber++,
            'date'              => fake()->dateTimeBetween('-2 years', 'now')->format('Y-m-d'),
            'category'          => fake()->randomElement(['CEC', 'General', 'Healthcare', 'STEM', 'Trades', 'French']),
            'cutoff_score'      => fake()->numberBetween(350, 600),
            'invitations_issued' => fake()->numberBetween(500, 10000),
            'tie_breaking_rule' => null,
            'notes'             => null,
            'is_published'      => true,
            'published_at'      => now(),
        ];
    }

    public function unpublished(): static
    {
        return $this->state(['is_published' => false, 'published_at' => null]);
    }
}
