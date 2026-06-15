const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';

export interface ExpoReceipt {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/**
 * Fetches delivery receipts for a batch of ticket ids (Expo accepts up to 1000
 * per call). Returns a map of id -> receipt; ids not yet resolved by Expo are
 * simply absent from the map (the caller keeps them for a later poll).
 *
 * Fails SAFE: any network error, non-OK HTTP, or non-JSON body returns an empty
 * map, so a transient failure never prunes a token — it just retries next run.
 */
export async function fetchExpoReceipts(
  ids: string[],
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, ExpoReceipt>> {
  if (ids.length === 0) return {};

  let res: Response;
  try {
    res = await fetchImpl(EXPO_RECEIPTS_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
  } catch {
    return {};
  }

  if (!res.ok) return {};

  try {
    const payload = (await res.json()) as { data?: Record<string, ExpoReceipt> };
    return payload.data ?? {};
  } catch {
    return {};
  }
}
