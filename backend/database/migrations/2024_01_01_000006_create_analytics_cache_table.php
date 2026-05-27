<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('analytics_cache', function (Blueprint $table) {
            $table->id();
            $table->string('category', 50); // 'all' or specific category
            $table->string('period', 10)->default('all'); // all | 1y | 6m | 3m
            $table->unsignedSmallInteger('average_cutoff');
            $table->unsignedSmallInteger('highest_cutoff');
            $table->unsignedSmallInteger('lowest_cutoff');
            $table->unsignedInteger('total_draws');
            $table->unsignedBigInteger('total_invitations');
            $table->string('trend', 10)->default('stable'); // rising | falling | stable
            $table->decimal('trend_percentage', 5, 2)->default(0);
            $table->json('chart_data'); // [{date, cutoff, invitations}]
            $table->timestamp('computed_at');
            $table->timestamps();

            $table->unique(['category', 'period']);
            $table->index('computed_at');
        });

        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            $table->morphs('tokenable');
            $table->string('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
        Schema::dropIfExists('analytics_cache');
    }
};
