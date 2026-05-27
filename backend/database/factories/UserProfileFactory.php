<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class UserProfileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id'                => User::factory(),
            'crs_score'              => fake()->numberBetween(400, 600),
            'category'               => fake()->randomElement(['CEC', 'General', 'Healthcare', 'STEM', 'Trades', 'French']),
            'notifications_enabled'  => true,
            'weekly_summary_enabled' => true,
        ];
    }
}
