<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Admin user
        $admin = User::firstOrCreate(
            ['email' => env('FILAMENT_ADMIN_EMAIL', 'admin@crspulse.ca')],
            [
                'name'     => 'CRS Pulse Admin',
                'password' => Hash::make(env('FILAMENT_ADMIN_PASSWORD', 'password')),
                'is_admin' => true,
                'email_verified_at' => now(),
            ],
        );

        if (! $admin->profile) {
            UserProfile::create([
                'user_id'   => $admin->id,
                'crs_score' => 800,
                'category'  => 'General',
            ]);
        }

        // Test user
        $testUser = User::firstOrCreate(
            ['email' => 'test@crspulse.ca'],
            [
                'name'     => 'Test User',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ],
        );

        if (! $testUser->profile) {
            UserProfile::create([
                'user_id'                => $testUser->id,
                'crs_score'              => 527,
                'category'               => 'CEC',
                'notifications_enabled'  => true,
                'weekly_summary_enabled' => true,
            ]);
        }

        $this->call([DrawSeeder::class]);
    }
}
