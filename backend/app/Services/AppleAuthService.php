<?php

namespace App\Services;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AppleAuthService
{
    private const APPLE_KEYS_URL  = 'https://appleid.apple.com/auth/keys';
    private const APPLE_ISSUER    = 'https://appleid.apple.com';
    private const APPLE_AUDIENCE  = 'com.crspulse.app';

    public function __construct(private UserRepositoryInterface $users) {}

    public function authenticate(string $identityToken, string $nonce, ?string $fullName, string $deviceName): array
    {
        $payload = $this->verifyToken($identityToken, $nonce);

        $appleId = $payload['sub'];
        $email   = $payload['email'] ?? null;

        // Find existing user by Apple ID or email
        $user = User::where('apple_id', $appleId)->first()
            ?? ($email ? $this->users->findByEmail($email) : null);

        if (! $user) {
            if (! $email) {
                throw new \InvalidArgumentException(
                    'Email not provided by Apple. Please use a different sign-in method or authorize email access.',
                );
            }

            $user = $this->users->create([
                'name'              => $fullName ?: explode('@', $email)[0],
                'email'             => $email,
                'apple_id'          => $appleId,
                'email_verified_at' => now(),
            ]);
            $this->users->createProfile($user);
        } elseif (! $user->apple_id) {
            $user->update(['apple_id' => $appleId]);
        }

        $expiresAt = now()->addDays((int) config('sanctum.token_expiry_days', 30));
        $token     = $user->createToken($deviceName, ['*'], $expiresAt)->plainTextToken;

        return compact('user', 'token');
    }

    private function verifyToken(string $identityToken, string $nonce): array
    {
        // Fetch Apple public keys
        $keysResponse = Http::get(self::APPLE_KEYS_URL);

        if (! $keysResponse->successful()) {
            throw new \RuntimeException('Failed to fetch Apple public keys.');
        }

        $keys = $keysResponse->json('keys', []);

        // Decode JWT header to find key ID
        [$headerB64] = explode('.', $identityToken);
        $header      = json_decode(base64_decode(strtr($headerB64, '-_', '+/')), true);
        $kid         = $header['kid'] ?? null;

        $matchedKey = collect($keys)->firstWhere('kid', $kid);

        if (! $matchedKey) {
            throw new \InvalidArgumentException('Apple identity token: no matching public key.');
        }

        // Build PEM public key from JWK
        $publicKey = $this->jwkToPem($matchedKey);

        // Decode and verify JWT
        $parts   = explode('.', $identityToken);
        $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')), true);
        $sig     = base64_decode(strtr($parts[2], '-_', '+/'));

        $verified = openssl_verify(
            $parts[0] . '.' . $parts[1],
            $sig,
            $publicKey,
            'SHA256',
        );

        if ($verified !== 1) {
            throw new \InvalidArgumentException('Apple identity token signature verification failed.');
        }

        // Validate claims
        if ($payload['iss'] !== self::APPLE_ISSUER) {
            throw new \InvalidArgumentException('Invalid Apple token issuer.');
        }

        if ($payload['aud'] !== self::APPLE_AUDIENCE) {
            throw new \InvalidArgumentException('Invalid Apple token audience.');
        }

        if ($payload['exp'] < time()) {
            throw new \InvalidArgumentException('Apple identity token has expired.');
        }

        // Verify nonce
        $expectedNonce = hash('sha256', $nonce);
        if (($payload['nonce'] ?? '') !== $expectedNonce) {
            throw new \InvalidArgumentException('Apple token nonce mismatch.');
        }

        return $payload;
    }

    private function jwkToPem(array $jwk): string
    {
        $n = base64_decode(strtr($jwk['n'], '-_', '+/'));
        $e = base64_decode(strtr($jwk['e'], '-_', '+/'));

        // DER INTEGER requires no leading zeros, but needs one if high bit set (positive)
        $n = ltrim($n, "\x00");
        if (ord($n[0]) > 0x7f) {
            $n = "\x00" . $n;
        }
        $e = ltrim($e, "\x00");
        if (ord($e[0]) > 0x7f) {
            $e = "\x00" . $e;
        }

        // PKCS#1: SEQUENCE { INTEGER n, INTEGER e }
        $nDer   = "\x02" . $this->derLen(strlen($n)) . $n;
        $eDer   = "\x02" . $this->derLen(strlen($e)) . $e;
        $rsaDer = "\x30" . $this->derLen(strlen($nDer) + strlen($eDer)) . $nDer . $eDer;

        // SubjectPublicKeyInfo: SEQUENCE { AlgorithmIdentifier, BIT STRING { rsaDer } }
        // AlgorithmIdentifier for rsaEncryption OID + NULL
        $rsaOid    = "\x30\x0d\x06\x09\x2a\x86\x48\x86\xf7\x0d\x01\x01\x01\x05\x00";
        $bitString = "\x03" . $this->derLen(strlen($rsaDer) + 1) . "\x00" . $rsaDer;
        $spki      = "\x30" . $this->derLen(strlen($rsaOid) + strlen($bitString)) . $rsaOid . $bitString;

        return "-----BEGIN PUBLIC KEY-----\n"
            . chunk_split(base64_encode($spki), 64, "\n")
            . "-----END PUBLIC KEY-----\n";
    }

    private function derLen(int $len): string
    {
        if ($len < 128) {
            return chr($len);
        }
        if ($len < 256) {
            return "\x81" . chr($len);
        }
        return "\x82" . chr(($len >> 8) & 0xff) . chr($len & 0xff);
    }
}
