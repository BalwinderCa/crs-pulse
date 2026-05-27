<?php

namespace App\Jobs;

use App\Models\Draw;
use App\Models\User;
use App\Models\UserProfile;
use App\Notifications\NewDrawNotification;
use App\Services\FCMService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendDrawNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries   = 3;
    public int $timeout = 120;

    public function __construct(private Draw $draw) {}

    public function handle(FCMService $fcm): void
    {
        $title = "New Express Entry Draw #{$this->draw->draw_number}";
        $body  = "Category: {$this->draw->category} | Cutoff: {$this->draw->cutoff_score} | Invitations: {$this->draw->invitations_issued}";

        $data = [
            'type'        => 'new_draw',
            'draw_id'     => (string) $this->draw->id,
            'draw_number' => (string) $this->draw->draw_number,
            'cutoff'      => (string) $this->draw->cutoff_score,
            'category'    => $this->draw->category,
        ];

        // Send push to all subscribed users
        $fcm->sendToAll($title, $body, $data);

        // Store in-app notification for each user
        User::with('profile')
            ->whereHas('profile', fn ($q) => $q->where('notifications_enabled', true))
            ->chunk(200, function ($users) {
                foreach ($users as $user) {
                    $user->notify(new NewDrawNotification($this->draw));
                }
            });

        Log::info("Draw notification sent", ['draw_id' => $this->draw->id]);
    }

    public function failed(\Throwable $e): void
    {
        Log::error("SendDrawNotificationJob failed", [
            'draw_id' => $this->draw->id,
            'error'   => $e->getMessage(),
        ]);
    }
}
