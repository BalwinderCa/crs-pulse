const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

/**
 * Registration-time token validation.
 *
 * The bundled bearer key is necessarily public, so the format check alone
 * doesn't stop a flood of format-valid-but-fake tokens polluting KV. This probes
 * the token through Expo's send API with a silent, data-only message (no visible
 * notification) and rejects it only when Expo SYNCHRONOUSLY flags it as bad —
 * a malformed recipient, missing/invalid push credentials, or a request-level
 * error. (A well-formed token for an uninstalled device returns `ok` here; that
 * `DeviceNotRegistered` case surfaces later in the receipt and is pruned on the
 * next real draw send.)
 *
 * Fails OPEN: any network error, non-OK HTTP, non-JSON body, or missing ticket
 * lets registration through. A legitimate device must never lose notifications
 * because Expo had a hiccup.
 */
export async function validateTokenWithExpo(
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  let res: Response;
  try {
    res = await fetchImpl(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      // Data-only + content-available => no visible alert on either platform.
      body: JSON.stringify({ to: token, data: { type: 'register_check' }, _contentAvailable: true }),
    });
  } catch {
    return true; // network error — fail open
  }

  if (!res.ok) return true; // Expo unavailable — fail open

  try {
    const payload = (await res.json()) as { data?: ExpoTicket[]; errors?: unknown[] };
    // Request-level rejection (e.g. malformed push token) => reject.
    if (Array.isArray(payload.errors) && payload.errors.length > 0) return false;
    const ticket = payload.data?.[0];
    if (!ticket) return true; // nothing conclusive — fail open
    return ticket.status !== 'error';
  } catch {
    return true; // non-JSON — fail open
  }
}
