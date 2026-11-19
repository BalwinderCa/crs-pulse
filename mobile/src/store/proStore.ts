import { Platform } from 'react-native';
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';

/** RevenueCat entitlement that unlocks Pro (set up in the RevenueCat dashboard). */
export const PRO_ENTITLEMENT = 'pro';
/** Everyone gets Pro free for this long, counted from the first launch of a version with Pro. */
export const PRO_TRIAL_MS = 7 * 24 * 60 * 60 * 1000;

const rcKey = (): string | undefined =>
  (Platform.OS === 'ios' ? process.env.EXPO_PUBLIC_RC_IOS_KEY : process.env.EXPO_PUBLIC_RC_ANDROID_KEY) || undefined;

type Purchases = typeof import('react-native-purchases').default;
let rc: Purchases | null = null;
/** The native module, or null when there's no key or it can't load (Expo Go, tests). */
function purchases(): Purchases | null {
  if (rc) return rc;
  if (!rcKey()) return null;
  try {
    rc = (require('react-native-purchases') as typeof import('react-native-purchases')).default;
  } catch {
    rc = null;
  }
  return rc;
}

type Entitlement = { expirationDate: string | null; productIdentifier?: string; willRenew?: boolean };
type Entitlements = { active: Record<string, Entitlement | undefined> };
export type ProInfo = { active: boolean; expires: number | null; productId: string | null; willRenew: boolean };

/** Pro is active when the entitlement is; `expires` is null for a lifetime unlock. */
export function proFrom(info: { entitlements: Entitlements }): ProInfo {
  const e = info.entitlements.active[PRO_ENTITLEMENT];
  if (!e) return { active: false, expires: null, productId: null, willRenew: false };
  return { active: true, expires: e.expirationDate ? Date.parse(e.expirationDate) : null,
    productId: e.productIdentifier ?? null, willRenew: e.willRenew ?? false };
}

/** Where a subscriber manages or cancels their plan. */
export const MANAGE_SUBSCRIPTIONS_URL = Platform.OS === 'ios'
  ? 'https://apps.apple.com/account/subscriptions'
  : 'https://play.google.com/store/account/subscriptions';

/** Restores purchases from the store account; the listener then updates the store. */
export async function restorePro(): Promise<'restored' | 'none' | 'failed' | 'unavailable'> {
  const P = purchases();
  if (!P) return 'unavailable';
  try {
    const info = await P.restorePurchases();
    return info.entitlements.active[PRO_ENTITLEMENT] ? 'restored' : 'none';
  } catch {
    return 'failed';
  }
}

type ProStore = Omit<ProInfo, 'active'> & {
  /** A paid (or store-trial) Pro entitlement. */
  active: boolean;
  /** When the free in-app trial ends (ms). */
  trialEnds: number | null;
  /** RevenueCat's id for this install, sent to the push worker so it can check Pro itself. */
  userId: string | null;
  loaded: boolean;
  load: () => Promise<void>;
};

/** Whether purchases can be made here (a key is set and the SDK loads). */
export const purchasesAvailable = (): boolean => !!purchases();

export const useProStore = create<ProStore>(() => ({
  active: false,
  expires: null,
  productId: null,
  willRenew: false,
  trialEnds: null,
  userId: null,
  loaded: false,

  // Resolves once the cached state is read; RevenueCat is asked in the background.
  load: () => (loading ??= loadOnce()),
}));

let loading: Promise<void> | null = null;
async function loadOnce(): Promise<void> {
  const set = useProStore.setState;
  {
    // Cached first, so the launch ad and the look are right before the network answers.
    try {
      const [cached, start] = await AsyncStorage.multiGet([STORAGE_KEYS.PRO_STATE, STORAGE_KEYS.PRO_TRIAL_START]);
      const c = cached?.[1] ? (JSON.parse(cached[1]) as Partial<ProInfo>) : null;
      let s = Number(start?.[1]);
      if (!Number.isFinite(s) || s <= 0) {
        s = Date.now();
        await AsyncStorage.setItem(STORAGE_KEYS.PRO_TRIAL_START, String(s));
      }
      const stillValid = !!c?.active && (c.expires == null || c.expires > Date.now());
      set({ active: stillValid, trialEnds: s + PRO_TRIAL_MS, expires: c?.expires ?? null,
        productId: c?.productId ?? null, willRenew: !!c?.willRenew });
    } catch {}
    set({ loaded: true });
  }

  const P = purchases();
  if (!P) return;
  void (async () => {
    try {
      P.configure({ apiKey: rcKey()! });
      const apply = (info: { entitlements: Entitlements }) => {
        const pro = proFrom(info);
        set(pro);
        void AsyncStorage.setItem(STORAGE_KEYS.PRO_STATE, JSON.stringify(pro)).catch(() => {});
      };
      P.addCustomerInfoUpdateListener(apply);
      const [info, userId] = await Promise.all([P.getCustomerInfo(), P.getAppUserID()]);
      apply(info);
      set({ userId });
    } catch {
      // Offline or misconfigured: keep the cached state.
    }
  })();
}

/** Pro features are on: paid Pro, or still inside the free trial. */
export const isProOn = (st: Pick<ProStore, 'active' | 'trialEnds'>, now = Date.now()): boolean =>
  st.active || (st.trialEnds !== null && now < st.trialEnds);

export function useIsPro(): boolean {
  return useProStore((st) => isProOn(st));
}

export { purchases as purchasesModule };
