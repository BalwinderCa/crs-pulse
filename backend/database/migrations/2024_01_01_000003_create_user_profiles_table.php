<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('user_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete()->unique();
            $table->unsignedSmallInteger('crs_score')->default(0);
            $table->string('category', 50)->default('General');
            $table->boolean('notifications_enabled')->default(true);
            $table->boolean('weekly_summary_enabled')->default(true);
            $table->timestamp('last_notified_at')->nullable();
            $table->timestamps();

            $table->index('crs_score');
            $table->index('category');
            $table->index(['category', 'crs_score']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_profiles');
    }
};
