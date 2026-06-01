<?php

namespace App\Console\Commands;

use App\Models\Draw;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncDrawsCommand extends Command
{
    protected $signature   = 'draws:sync {--dry-run : Preview without saving} {--force : Re-import all draws}';
    protected $description = 'Sync Express Entry draws from IRCC public JSON feed';

    // IRCC public draws feed
    private const IRCC_URL = 'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';

    // IRCC draw name → our category slug
    private const CATEGORY_MAP = [
        'No Program Specified'                                      => 'General',
        'Canadian Experience Class'                                 => 'CEC',
        'Federal Skilled Worker'                                    => 'General',
        'Federal Skilled Trades'                                    => 'Trades',
        'Provincial Nominee Program'                                => 'PNP',
        'Targeted Draw: Healthcare Occupations'                     => 'Healthcare',
        'Targeted Draw: STEM Occupations'                           => 'STEM',
        'Targeted Draw: French language proficiency'                => 'French',
        'Targeted Draw: Trade Occupations'                          => 'Trades',
        'Targeted Draw: Agriculture and Agri-food Occupations'      => 'Agriculture',
        'Targeted Draw: Education Occupations'                      => 'Education',
        'Targeted Draw: Transport Occupations'                      => 'Transport',
    ];

    public function handle(): int
    {
        $this->info('Fetching IRCC draw data from official feed...');

        $response = Http::timeout(30)->get(self::IRCC_URL);

        if (!$response->successful()) {
            $this->error('Failed to fetch IRCC data: HTTP ' . $response->status());
            Log::error('draws:sync failed', ['status' => $response->status()]);
            return self::FAILURE;
        }

        $json = $response->json();
        $rounds = $json['rounds'] ?? [];

        if (empty($rounds)) {
            $this->error('No rounds found in IRCC response.');
            return self::FAILURE;
        }

        $this->info('Found ' . count($rounds) . ' draws in IRCC feed.');

        $created = 0;
        $updated = 0;
        $skipped = 0;

        foreach ($rounds as $round) {
            $drawNumber = (int) ($round['drawNumber'] ?? 0);
            if (!$drawNumber) { $skipped++; continue; }

            // Skip if already exists (unless --force)
            if (!$this->option('force') && Draw::where('draw_number', $drawNumber)->exists()) {
                $skipped++;
                continue;
            }

            $date    = $this->parseDate($round['drawDate'] ?? '');
            $cutoff  = (int) str_replace(',', '', $round['drawCRS'] ?? '0');
            $size    = (int) str_replace(',', '', $round['drawSize'] ?? '0');
            $name    = trim($round['drawName'] ?? '');
            $category = $this->mapCategory($name);
            $tie     = $round['drawCRSTie'] ?? null;

            if (!$date || !$cutoff) { $skipped++; continue; }

            if ($this->option('dry-run')) {
                $this->line("  #$drawNumber  $date  $category  CRS:$cutoff  $size ITA");
                $created++;
                continue;
            }

            $exists = Draw::where('draw_number', $drawNumber)->first();
            Draw::updateOrCreate(
                ['draw_number' => $drawNumber],
                [
                    'date'               => $date,
                    'category'           => $category,
                    'cutoff_score'       => $cutoff,
                    'invitations_issued' => $size,
                    'tie_breaking_rule'  => $tie,
                    'notes'              => $name !== $this->categoryLabel($category) ? $name : null,
                    'is_published'       => true,
                    'published_at'       => now(),
                ]
            );

            $exists ? $updated++ : $created++;
        }

        if (!$this->option('dry-run')) {
            // Refresh analytics cache
            \Illuminate\Support\Facades\Artisan::call('cache:clear');
        }

        $this->info("Done. Created: $created  Updated: $updated  Skipped: $skipped");
        return self::SUCCESS;
    }

    private function parseDate(string $raw): ?string
    {
        // IRCC format: "2025-01-22" or "January 22, 2025"
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($raw))) {
            return trim($raw);
        }
        try {
            return \Carbon\Carbon::parse($raw)->format('Y-m-d');
        } catch (\Exception) {
            return null;
        }
    }

    private function mapCategory(string $name): string
    {
        foreach (self::CATEGORY_MAP as $key => $slug) {
            if (stripos($name, $key) !== false || stripos($name, str_replace('Targeted Draw: ', '', $key)) !== false) {
                return $slug;
            }
        }
        // Fallback: detect common keywords
        if (stripos($name, 'French') !== false)     return 'French';
        if (stripos($name, 'STEM') !== false)        return 'STEM';
        if (stripos($name, 'Health') !== false)      return 'Healthcare';
        if (stripos($name, 'Trade') !== false)       return 'Trades';
        if (stripos($name, 'Agriculture') !== false) return 'Agriculture';
        if (stripos($name, 'CEC') !== false)         return 'CEC';
        return 'General';
    }

    private function categoryLabel(string $slug): string
    {
        return match($slug) {
            'CEC'         => 'Canadian Experience Class',
            'French'      => 'Targeted Draw: French language proficiency',
            'STEM'        => 'Targeted Draw: STEM Occupations',
            'Healthcare'  => 'Targeted Draw: Healthcare Occupations',
            'Trades'      => 'Targeted Draw: Trade Occupations',
            default       => 'No Program Specified',
        };
    }
}
