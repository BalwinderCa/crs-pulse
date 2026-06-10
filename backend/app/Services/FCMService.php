<?php

namespace App\Services;

use App\Models\DeviceToken;
use App\Models\Draw;
use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FCMService
{
    private string $projectId;
    private string $credentialsPath;

    public function __construct()
    {
        $this->projectId       = config('services.firebase.project_id', '');
        $this->credentialsPath = base_path(config('services.firebase.credentials_path', 'storage/firebase-credentials.json'));
    }

    public function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        $tokens = DeviceToken::where('user_id', $user->id)
            ->pluck('token')
            ->toArray();

        if (empty($tokens)) {
            return;
        }

        $this->sendMulticast($tokens, $title, $body, $data);
    }

    public function sendToAll(string $title, string $body, array $data = []): void
    {
        DeviceToken::chunk(500, function ($tokens) use ($title, $body, $data) {
            $tokenValues = $tokens->pluck('token')->toArray();
            $this->sendMulticast($tokenValues, $title, $body, $data);
        });
    }

    public function sendToUsersAbove(int $score, string $title, string $body, array $data = []): void
    {
        $userIds = \App\Models\UserProfile::where('crs_score', '>=', $score)
            ->where('notifications_enabled', true)
            ->pluck('user_id')
            ->toArray();

        if (empty($userIds)) {
            return;
        }

        DeviceToken::whereIn('user_id', $userIds)
            ->chunk(500, function ($tokens) use ($title, $body, $data) {
                $this->sendMulticast($tokens->pluck('token')->toArray(), $title, $body, $data);
            });
    }

    private function sendMulticast(array $tokens, string $title, string $body, array $data): void
    {
        if (empty($tokens) || empty($this->projectId)) {
            return;
        }

        try {
            $accessToken = $this->getAccessToken();

            foreach (array_chunk($tokens, 500) as $chunk) {
                $messages = array_map(fn ($token) => [
                    'message' => [
                        'token'        => $token,
                        'notification' => ['title' => $title, 'body' => $body],
                        'data'         => array_map('strval', $data),
                        'android'      => [
                            'priority'     => 'high',
                            'notification' => [
                                'channel_id'   => 'crs_pulse_draws',
                                'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                            ],
                        ],
                    ],
                ], $chunk);

                foreach ($messages as $payload) {
                    Http::withToken($accessToken)
                        ->post(
                            "https://fcm.googleapis.com/v1/projects/{$this->projectId}/messages:send",
                            $payload,
                        );
                }
            }
        } catch (\Throwable $e) {
            Log::error('FCM send failed', ['error' => $e->getMessage()]);
        }
    }

    private function base64url(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function getAccessToken(): string
    {
        if (! file_exists($this->credentialsPath)) {
            return '';
        }

        $credentials = json_decode(file_get_contents($this->credentialsPath), true);

        $now    = time();
        $header  = $this->base64url(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $payload = $this->base64url(json_encode([
            'iss'   => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud'   => 'https://oauth2.googleapis.com/token',
            'exp'   => $now + 3600,
            'iat'   => $now,
        ]));
        $signingInput = "{$header}.{$payload}";

        openssl_sign($signingInput, $signature, $credentials['private_key'], 'SHA256');
        $signedJwt = "{$signingInput}.{$this->base64url($signature)}";

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion'  => $signedJwt,
        ]);

        return $response->json('access_token', '');
    }

    public function registerToken(User $user, string $token, string $platform): void
    {
        DeviceToken::updateOrCreate(
            ['token' => $token],
            [
                'user_id'      => $user->id,
                'platform'     => $platform,
                'last_used_at' => now(),
            ],
        );
    }

    public function revokeToken(string $token): void
    {
        DeviceToken::where('token', $token)->delete();
    }
}
