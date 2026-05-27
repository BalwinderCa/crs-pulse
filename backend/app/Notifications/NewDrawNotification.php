<?php

namespace App\Notifications;

use App\Models\Draw;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class NewDrawNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private Draw $draw) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toDatabase(object $notifiable): array
    {
        return [
            'type'        => 'new_draw',
            'title'       => "New Draw #{$this->draw->draw_number}",
            'body'        => "Category: {$this->draw->category} | Cutoff: {$this->draw->cutoff_score} | {$this->draw->invitations_issued} invitations",
            'draw_id'     => $this->draw->id,
            'draw_number' => $this->draw->draw_number,
            'category'    => $this->draw->category,
            'cutoff'      => $this->draw->cutoff_score,
            'date'        => $this->draw->date?->format('Y-m-d'),
        ];
    }
}
