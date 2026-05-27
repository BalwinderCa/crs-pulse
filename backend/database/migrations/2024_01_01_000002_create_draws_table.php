<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('draws', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('draw_number')->unique();
            $table->date('date');
            $table->string('category', 50); // CEC, General, Healthcare, STEM, Trades, French
            $table->unsignedSmallInteger('cutoff_score');
            $table->unsignedInteger('invitations_issued');
            $table->string('tie_breaking_rule')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index('category');
            $table->index('date');
            $table->index(['category', 'date']);
            $table->index('is_published');
            $table->index(['is_published', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('draws');
    }
};
