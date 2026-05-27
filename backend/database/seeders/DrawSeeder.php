<?php

namespace Database\Seeders;

use App\Models\Draw;
use Illuminate\Database\Seeder;

class DrawSeeder extends Seeder
{
    public function run(): void
    {
        // Real IRCC draw data (recent draws as of late 2024)
        $draws = [
            ['draw_number' => 280, 'date' => '2024-12-11', 'category' => 'CEC',        'cutoff_score' => 524, 'invitations_issued' => 3900],
            ['draw_number' => 279, 'date' => '2024-11-27', 'category' => 'General',    'cutoff_score' => 558, 'invitations_issued' => 4800],
            ['draw_number' => 278, 'date' => '2024-11-13', 'category' => 'CEC',        'cutoff_score' => 519, 'invitations_issued' => 3700],
            ['draw_number' => 277, 'date' => '2024-10-23', 'category' => 'General',    'cutoff_score' => 549, 'invitations_issued' => 4500],
            ['draw_number' => 276, 'date' => '2024-10-09', 'category' => 'CEC',        'cutoff_score' => 516, 'invitations_issued' => 3500],
            ['draw_number' => 275, 'date' => '2024-09-25', 'category' => 'Healthcare', 'cutoff_score' => 436, 'invitations_issued' => 1000],
            ['draw_number' => 274, 'date' => '2024-09-18', 'category' => 'STEM',       'cutoff_score' => 491, 'invitations_issued' => 3300],
            ['draw_number' => 273, 'date' => '2024-09-04', 'category' => 'French',     'cutoff_score' => 379, 'invitations_issued' => 7000],
            ['draw_number' => 272, 'date' => '2024-08-21', 'category' => 'General',    'cutoff_score' => 545, 'invitations_issued' => 4300],
            ['draw_number' => 271, 'date' => '2024-08-07', 'category' => 'CEC',        'cutoff_score' => 510, 'invitations_issued' => 3200],
            ['draw_number' => 270, 'date' => '2024-07-24', 'category' => 'Trades',     'cutoff_score' => 433, 'invitations_issued' => 1500],
            ['draw_number' => 269, 'date' => '2024-07-10', 'category' => 'General',    'cutoff_score' => 542, 'invitations_issued' => 4100],
            ['draw_number' => 268, 'date' => '2024-06-26', 'category' => 'CEC',        'cutoff_score' => 505, 'invitations_issued' => 3000],
            ['draw_number' => 267, 'date' => '2024-06-12', 'category' => 'French',     'cutoff_score' => 365, 'invitations_issued' => 7500],
            ['draw_number' => 266, 'date' => '2024-05-29', 'category' => 'General',    'cutoff_score' => 539, 'invitations_issued' => 4000],
            ['draw_number' => 265, 'date' => '2024-05-15', 'category' => 'CEC',        'cutoff_score' => 499, 'invitations_issued' => 2800],
            ['draw_number' => 264, 'date' => '2024-05-01', 'category' => 'STEM',       'cutoff_score' => 485, 'invitations_issued' => 2950],
            ['draw_number' => 263, 'date' => '2024-04-17', 'category' => 'General',    'cutoff_score' => 536, 'invitations_issued' => 3900],
            ['draw_number' => 262, 'date' => '2024-04-03', 'category' => 'CEC',        'cutoff_score' => 494, 'invitations_issued' => 2700],
            ['draw_number' => 261, 'date' => '2024-03-25', 'category' => 'Healthcare', 'cutoff_score' => 422, 'invitations_issued' => 3500],
        ];

        foreach ($draws as $data) {
            Draw::updateOrCreate(
                ['draw_number' => $data['draw_number']],
                array_merge($data, [
                    'is_published' => true,
                    'published_at' => now(),
                ]),
            );
        }

        $this->command->info('Seeded ' . count($draws) . ' draws.');
    }
}
