<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notification\RegisterTokenRequest;
use App\Services\FCMService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function __construct(private FCMService $fcm) {}

    public function index(Request $request): JsonResponse
    {
        $perPage       = min((int) $request->input('per_page', 20), 50);
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->paginate($perPage);

        $unreadCount = $request->user()->unreadNotifications()->count();

        return response()->json([
            'data'         => $notifications->items(),
            'meta'         => [
                'current_page' => $notifications->currentPage(),
                'last_page'    => $notifications->lastPage(),
                'per_page'     => $notifications->perPage(),
                'total'        => $notifications->total(),
                'from'         => $notifications->firstItem(),
                'to'           => $notifications->lastItem(),
            ],
            'unread_count' => $unreadCount,
        ]);
    }

    public function markRead(Request $request, string $id): JsonResponse
    {
        $notification = $request->user()
            ->notifications()
            ->findOrFail($id);

        $notification->markAsRead();

        return response()->json(['data' => $notification, 'message' => 'Marked as read.']);
    }

    public function markAllRead(Request $request): JsonResponse
    {
        $request->user()->unreadNotifications->markAsRead();

        return response()->json(['message' => 'All notifications marked as read.']);
    }

    public function registerToken(RegisterTokenRequest $request): JsonResponse
    {
        $this->fcm->registerToken(
            $request->user(),
            $request->validated('token'),
            $request->validated('platform'),
        );

        return response()->json(['message' => 'Device token registered.']);
    }

    public function revokeToken(Request $request): JsonResponse
    {
        $token = $request->input('token');

        if (! $token) {
            return response()->json(['message' => 'Token is required.'], 422);
        }

        $this->fcm->revokeToken($token);

        return response()->json(['message' => 'Device token revoked.']);
    }
}
