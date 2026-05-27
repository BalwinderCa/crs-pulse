<?php

namespace App\Http\Resources\Api\V1;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DrawResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'draw_number'       => $this->draw_number,
            'date'              => $this->date?->format('Y-m-d'),
            'category'          => $this->category,
            'cutoff_score'      => $this->cutoff_score,
            'invitations_issued' => $this->invitations_issued,
            'tie_breaking_rule' => $this->tie_breaking_rule,
            'notes'             => $this->notes,
            'created_at'        => $this->created_at?->toIso8601String(),
        ];
    }
}
