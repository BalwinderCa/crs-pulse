<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'crs_score',
        'category',
        'notifications_enabled',
        'weekly_summary_enabled',
        'last_notified_at',
    ];

    protected function casts(): array
    {
        return [
            'notifications_enabled'  => 'boolean',
            'weekly_summary_enabled' => 'boolean',
            'last_notified_at'       => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
