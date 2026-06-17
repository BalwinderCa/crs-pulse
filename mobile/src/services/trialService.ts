import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { sha256Hex } from '@/utils/sha256';

/**
 * Server-backed free-trial clock.
 *
 * The trial start is pinned to a stable device id and stored in the push
 * worker's KV, so uninstalling/reinstalling the app cannot reset it (local
 * storage clears, but the device id — and the server record — survives).
 *
 * Privacy: the raw OS identifier NEVER leaves the device. It is hashed on-device
 * with SHA-256 (see getHashedDeviceId) and only that one-way hash is sent to the
 * worker — matching the privacy policy's "the app sends a one-way SHA-256 hash"
 * promise. The worker treats the received value as an opaque key.
 *
 * Android: ANDROID_ID is stable across reinstalls for a given app signing key.
 * iOS: identifierForVendor (resets only when all vendor apps are removed).
 */
export async function getDeviceId(): Promise<string | null> {
  try {
    if (Platform.OS === 'android') {
      return Application.getAndroidId() || null;
    }
    return (await Application.getIosIdForVendorAsync()) || null;
  } catch {
    return null;
  }
}

/**
 * The on-device SHA-256 hash of the raw OS identifier — the only device-derived
 * value ever transmitted. Returns null if the raw id can't be read. Salted with
 * a fixed app-scoped prefix so the digest isn't a bare hash of a value other
 * apps could also compute, while staying deterministic across reinstalls.
 */
export async function getHashedDeviceId(): Promise<string | null> {
  const raw = await getDeviceId();
  if (!raw) return null;
  return sha256Hex(`crs-pulse.trial.v1:${raw}`);
}

function pushBaseUrl(): string | null {
  return process.env.EXPO_PUBLIC_PUSH_URL?.replace(/\/$/, '') || null;
}

/**
 * Ask the worker for this device's trial start timestamp (ms). The worker
 * creates the record on first call and returns the same value forever after.
 * Returns null if the trial can't be resolved (no URL / no id / network error)
 * so the caller can fall back to a local provisional start.
 */
export async function fetchTrialStart(): Promise<number | null> {
  const base = pushBaseUrl();
  if (!base) return null;

  const deviceId = await getHashedDeviceId();
  if (!deviceId) return null;

  const apiKey = process.env.EXPO_PUBLIC_PUSH_API_KEY?.trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(`${base}/trial`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ deviceId }),
  });
  if (!res.ok) throw new Error(`trial ${res.status}`);

  const data = (await res.json()) as { startedAt?: number };
  return typeof data.startedAt === 'number' ? data.startedAt : null;
}

/**
 * Erase this device's server-side trial record (user-initiated data deletion).
 * Best-effort and never throws — called from "Reset all data" so the off-device
 * trial identifier is removed alongside the local wipe.
 */
export async function deleteTrialRecord(): Promise<void> {
  const base = pushBaseUrl();
  if (!base) return;

  const deviceId = await getHashedDeviceId();
  if (!deviceId) return;

  const apiKey = process.env.EXPO_PUBLIC_PUSH_API_KEY?.trim();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  try {
    await fetch(`${base}/trial`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ deviceId }),
    });
  } catch {
    // Swallow — local wipe still proceeds; the record self-expires via TTL.
  }
}
