<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\Api\V1\DrawResource;
use App\Repositories\Contracts\DrawRepositoryInterface;
use App\Services\PredictionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function __construct(
        private DrawRepositoryInterface $draws,
        private PredictionService $prediction,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user    = $request->user()->load('profile');
        $profile = $user->profile;

        if (! $profile) {
            return response()->json(['message' => 'Profile not set up.'], 422);
        }

        $cacheKey = "dashboard:user:{$user->id}";

        $data = Cache::remember($cacheKey, now()->addMinutes(2), function () use ($profile) {
            $category    = $profile->category;
            $userScore   = $profile->crs_score;
            $latestDraw  = $this->draws->latest($category) ?? $this->draws->latest();

            $recentDraws = \App\Models\Draw::published()
                ->orderByDesc('date')
                ->orderByDesc('draw_number')
                ->take(10)
                ->get();

            $prediction = $this->prediction->predict($userScore, $category, $recentDraws);

            $scoreDiff = $latestDraw
                ? $userScore - $latestDraw->cutoff_score
                : 0;

            return [
                'user_score'    => $userScore,
                'user_category' => $category,
                'latest_draw'   => $latestDraw ? new DrawResource($latestDraw) : null,
                'score_difference' => $scoreDiff,
                'prediction'    => $prediction,
                'recent_draws'  => DrawResource::collection($recentDraws->take(5)),
            ];
        });

        return response()->json(['data' => $data]);
    }
}
