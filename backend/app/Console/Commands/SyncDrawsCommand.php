<?php

namespace App\Console\Commands;

use App\Models\Draw;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SyncDrawsCommand extends Command
{
    protected $signature   = 'draws:sync {--dry-run : Preview without saving}';
    protected $description = 'Sync Express Entry draws from IRCC data source';

    public function handle(): int
    {
        $this->info('Fetching IRCC draw data...');

        // In production: parse IRCC HTML or use a reliable JSON source
        // For now, this is a stub that accepts manually entered draws
        $this->warn('Auto-sync not available. Add draws via Filament admin at /admin/draws/create');
        $this->info('Alternatively, import via: php artisan db:seed --class=DrawSeeder');

        return self::SUCCESS;
    }
}
