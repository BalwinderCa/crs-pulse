import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import type { Draw, Category } from '@/types';
import { syncLastSeenDraw } from '@/hooks/useDrawNotifications';
import { useEePoolStore } from './eePoolStore';

// Official IRCC public draw data feed
const IRCC_URL =
  'https://www.canada.ca/content/dam/ircc/documents/json/ee_rounds_123_en.json';

const CATEGORY_MAP: Record<string, string> = {
  'No Program Specified': 'General',
  'Canadian Experience Class': 'CEC',
  'Federal Skilled Worker': 'General',
  'Federal Skilled Trades': 'Trades',
  'Provincial Nominee Program': 'PNP',
  'Targeted Draw: Healthcare Occupations': 'Healthcare',
  'Targeted Draw: STEM Occupations': 'STEM',
  'Targeted Draw: French language proficiency': 'French',
  'Targeted Draw: Trade Occupations': 'Trades',
  'Targeted Draw: Agriculture and Agri-food Occupations': 'Agriculture',
  'Targeted Draw: Education Occupations': 'Education',
};

function mapCategory(name: string): string {
  for (const [key, val] of Object.entries(CATEGORY_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase().replace('targeted draw: ', ''))) return val;
    if (name.toLowerCase().includes(key.toLowerCase())) return val;
  }
  if (/french/i.test(name)) return 'French';
  if (/stem/i.test(name)) return 'STEM';
  if (/health/i.test(name)) return 'Healthcare';
  if (/trade/i.test(name)) return 'Trades';
  if (/agri/i.test(name)) return 'Agriculture';
  if (/cec/i.test(name)) return 'CEC';
  return 'General';
}

function parseRound(r: Record<string, string>): Draw | null {
  const num = parseInt(r.drawNumber ?? '', 10);
  const cutoff = parseInt((r.drawCRS ?? '').replace(/,/g, ''), 10);
  const size = parseInt((r.drawSize ?? '').replace(/,/g, ''), 10);
  // IRCC publishes drawDate as a calendar date. Strip any time/zone component
  // so it's always YYYY-MM-DD — parsing the full value as UTC would shift the
  // displayed date back a day in timezones behind UTC (e.g. all of Canada).
  const date = (r.drawDate ?? '').slice(0, 10);
  if (!num || !cutoff || !date) return null;
  return {
    id: num,
    draw_number: num,
    date,
    category: mapCategory(r.drawName ?? '') as Category,
    cutoff_score: cutoff,
    invitations_issued: size || 0,
    // IRCC publishes the tie-break as `drawCutOff` — the "submitted before" date/
    // time that decides ties at the cutoff score (there is no `drawCRSTie` field).
    tie_breaking_rule: r.drawCutOff ?? null,
    notes: r.drawName ?? null,
    created_at: date,
  };
}

type DrawsStore = {
  draws: Draw[];
  isLoading: boolean;
  isRefreshing: boolean;
  lastFetched: string | null; // ISO string
  error: string | null;
  load: () => Promise<void>;      // load cache first, then fetch if stale
  refresh: () => Promise<void>;   // force re-fetch from IRCC
};

const STALE_MS    = 60 * 60 * 1000; // 1 hour
const MAX_RETRIES = 3;
const RETRY_DELAY = 1_000; // base ms; doubles each attempt (exponential backoff)

// Retries on network errors AND transient server failures (HTTP 5xx / 429) with
// exponential backoff (1s, 2s, 4s). 4xx (other than 429) is returned as-is —
// retrying a client error is pointless.
async function fetchWithRetry(url: string, retries = MAX_RETRIES): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      });
      const retryable = res.status >= 500 || res.status === 429;
      if (res.ok || !retryable || attempt === retries) return res;
    } catch (err) {
      lastErr = err;
      if (attempt === retries) throw err;
    }
    await new Promise(r => setTimeout(r, RETRY_DELAY * 2 ** (attempt - 1)));
  }
  throw lastErr instanceof Error ? lastErr : new Error('Max retries reached');
}

export const useDrawsStore = create<DrawsStore>((set, get) => ({
  draws: [],
  isLoading: false,
  isRefreshing: false,
  lastFetched: null,
  error: null,

  load: async () => {
    // 1. Load cached draws first (instant)
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.DRAWS_CACHE);
      if (raw) {
        const cached = JSON.parse(raw) as { draws: Draw[]; lastFetched: string };
        set({ draws: cached.draws, lastFetched: cached.lastFetched });

        // If cache is fresh, skip network fetch
        const age = Date.now() - new Date(cached.lastFetched).getTime();
        if (age < STALE_MS) return;
      }
    } catch {}

    // 2. Fetch from IRCC if no cache or stale
    await get().refresh();
  },

  refresh: async () => {
    const hasCache = get().draws.length > 0;
    set(hasCache ? { isRefreshing: true, error: null } : { isLoading: true, error: null });

    try {
      // Cache-bust so a stale Akamai edge can't return an older copy of the feed.
      const res = await fetchWithRetry(`${IRCC_URL}?_=${Date.now()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const json = await res.json();
      const rounds: Record<string, string>[] = Array.isArray(json?.rounds) ? json.rounds : [];

      const draws: Draw[] = rounds
        .map(parseRound)
        .filter((d): d is Draw => d !== null)
        .sort((a, b) => b.draw_number - a.draw_number); // newest first

      // TEMP(remove me): confirm what the device actually receives.
      console.log('[draws] fetched', draws.length, 'rounds; latest #' + draws[0]?.draw_number, draws[0]?.date);

      // A 200 response with an unexpected/changed shape (IRCC has reshaped this
      // feed before) yields zero parseable rounds. Treat that as a failure so we
      // keep the existing cache instead of overwriting good history with [].
      if (draws.length === 0) {
        throw new Error('IRCC feed returned no parseable draws');
      }

      const lastFetched = new Date().toISOString();
      set({ draws, lastFetched, isLoading: false, isRefreshing: false, error: null });

      // Persist to AsyncStorage
      await AsyncStorage.setItem(
        STORAGE_KEYS.DRAWS_CACHE,
        JSON.stringify({ draws, lastFetched }),
      );

      // Keep the EE Pool Store perfectly synchronized using the same rounds feed
      useEePoolStore.getState().updateFromRounds(rounds).catch(() => {});

      // Keep last-seen in sync (server sends push alerts)
      syncLastSeenDraw(draws).catch(() => {});
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      const isNetworkErr = /network request failed|failed to fetch|network failed/i.test(raw);
      set({
        isLoading: false,
        isRefreshing: false,
        error: isNetworkErr
          ? 'Unable to reach the IRCC server. Check your connection and try again.'
          : (raw || 'Failed to load draws'),
      });
    }
  },
}));
