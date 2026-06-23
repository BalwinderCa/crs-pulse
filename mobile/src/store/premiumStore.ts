import { create } from 'zustand';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, IAP_PRODUCTS, IAP_SKUS } from '@/constants';
import { connect, fetchProducts, buy, getOwnedSkus } from '@/services/iapService';

/**
 * Premium entitlement, backed by Google Play Billing (one-time unlock).
 *
 * `isPremium` is granted when the user owns IAP_PRODUCTS.ANALYTICS_UNLOCK.
 * Play is the source of truth (queried via getOwnedSkus); the AsyncStorage flag
 * is just an offline mirror so the gate doesn't flicker before billing connects.
 *
 * Flow:
 *   init()    → connect billing, hydrate cached flag, then verify against Play
 *   purchase() → launch Play purchase sheet; entitlement is granted by the
 *                purchase listener registered in init()
 *   restore()  → re-query Play for owned products (e.g. new device / reinstall)
 */
type PremiumStore = {
  isPremium: boolean;
  loaded: boolean;        // billing connected + entitlement resolved at least once
  purchasing: boolean;    // a purchase/restore flow is in flight
  price: string | null;   // localized price string from Play, e.g. "$4.99"
  error: string | null;

  /**
   * Whether a real, buyable product exists on this device — i.e. billing
   * connected AND the unlock product actually loaded from the store. false
   * whenever nothing is purchasable: iOS/region without a configured product,
   * emulators without Play, or a transient billing/products outage. The gate
   * MUST fail open when this is false — never show a locked paywall the user
   * cannot actually buy through.
   */
  billingAvailable: boolean;

  init: () => Promise<void>;
  purchase: () => Promise<void>;
  restore: () => Promise<void>;
};

const UNLOCK_SKU = IAP_PRODUCTS.ANALYTICS_UNLOCK;

async function cacheEntitlement(isPremium: boolean) {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PREMIUM, isPremium ? 'true' : 'false');
  } catch {}
}

export const usePremiumStore = create<PremiumStore>((set, get) => ({
  isPremium: false,
  loaded: false,
  purchasing: false,
  price: null,
  error: null,
  billingAvailable: false,

  init: async () => {
    // 1. Optimistically hydrate from the cached flag so the gate is correct
    //    immediately on cold start, before the (slower) billing round-trip.
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM);
      if (cached === 'true') set({ isPremium: true });
    } catch {}

    // 2. Connect billing + register purchase listeners.
    const ok = await connect({
      onPurchase: (purchase) => {
        if (IAP_SKUS.includes(purchase.productId)) {
          set({ isPremium: true, purchasing: false, error: null });
          void cacheEntitlement(true);
        }
      },
      onError: (err) => {
        // User cancelling the sheet is not an error worth surfacing.
        const cancelled = err.code === 'E_USER_CANCELLED';
        set({ purchasing: false, error: cancelled ? null : err.message ?? 'Purchase failed' });
      },
    });

    if (!ok) {
      // Billing unavailable (iOS without StoreKit, emulator without Play, or a
      // transient outage). Keep the cached flag; the gate fails OPEN below.
      set({ loaded: true, billingAvailable: false });
      return;
    }

    // 3. Load localized price + verify true entitlement against Play.
    const [products, owned] = await Promise.all([fetchProducts(), getOwnedSkus()]);
    const product = products.find((p) => p.productId === UNLOCK_SKU);
    const isPremium = owned.includes(UNLOCK_SKU);

    set({
      price: product?.localizedPrice ?? null,
      isPremium,
      loaded: true,
      // Only treat billing as available when a buyable product actually loaded.
      // initConnection() succeeds on iOS even with no StoreKit product, and a
      // transient products outage can return []; in either case there is nothing
      // to purchase, so the gate must fail OPEN rather than show a dead paywall.
      billingAvailable: !!product,
    });
    void cacheEntitlement(isPremium);
  },

  purchase: async () => {
    if (get().purchasing) return;
    set({ purchasing: true, error: null });
    try {
      await buy(UNLOCK_SKU);
      // Success is delivered asynchronously via the onPurchase listener.
    } catch (err) {
      set({ purchasing: false, error: err instanceof Error ? err.message : 'Purchase failed' });
    }
  },

  restore: async () => {
    if (get().purchasing) return;
    set({ purchasing: true, error: null });
    try {
      const owned = await getOwnedSkus();
      const isPremium = owned.includes(UNLOCK_SKU);
      set({ isPremium, purchasing: false });
      void cacheEntitlement(isPremium);
      if (!isPremium) set({ error: 'No previous purchase found to restore.' });
    } catch {
      set({ purchasing: false, error: 'Could not restore purchases.' });
    }
  },
}));
nd to restore.' });
    } catch {
      set({ purchasing: false, error: 'Could not restore purchases.' });
    }
  },
}));
