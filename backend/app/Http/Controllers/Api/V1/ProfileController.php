<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load('profile');

        return response()->json([
            'data' => [
                'id'       => $user->profile?->id,
                'user_id'  => $user->id,
                'crs_score'              => $user->profile?->crs_score ?? 0,
                'category'               => $user->profile?->category ?? 'General',
                'notifications_enabled'  => $user->profile?->notifications_enabled ?? true,
                'weekly_summary_enabled' => $user->profile?->weekly_summary_enabled ?? true,
                'created_at'             => $user->profile?->created_at,
                'updated_at'             => $user->profile?->updated_at,
            ],
        ]);
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user    = $request->user();
        $payload = $request->validated();

        if (isset($payload['name'])) {
            $user->update(['name' => $payload['name']]);
            unset($payload['name']);
        }

        if (! empty($payload)) {
            $user->profile()->updateOrCreate(
                ['user_id' => $user->id],
                $payload,
            );
        }

        // Bust dashboard cache after profile update
        Cache::forget("dashboard:user:{$user->id}");

        $user->load('profile');

        return response()->json([
            'data' => [
                'id'       => $user->profile?->id,
                'user_id'  => $user->id,
                'crs_score'              => $user->profile?->crs_score ?? 0,
                'category'               => $user->profile?->category ?? 'General',
                'notifications_enabled'  => $user->profile?->notifications_enabled ?? true,
                'weekly_summary_enabled' => $user->profile?->weekly_summary_enabled ?? true,
                'created_at'             => $user->profile?->created_at,
                'updated_at'             => $user->profile?->updated_at,
            ],
            'message' => 'Profile updated.',
        ]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->tokens()->delete();
        $user->deviceTokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Account deleted.']);
    }
}
