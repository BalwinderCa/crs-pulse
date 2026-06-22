import { Platform, type EmitterSubscription } from 'react-native';
import {
  initConnection,
  endConnection,
  flushFailedPurchasesCachedAsPendingAndroid,
  getProducts,
  requestPurchase,
  getAvailablePurchases,
  finishTransaction,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type Purchase,
  type PurchaseError,
} from 'react-native-iap';
import { IAP_SKUS } from '@/constants';
import { reportError } from '@/services/errorReporter';

/**
 * Thin wrapper over react-native-iap for Google Play Billing.
 *
 * The app sells one non-consumable managed product (analytics unlock). The
 * entitlement is "does the user own that SKU", read back from Play via
 * `getAvailablePurchases()` — Play is the source of truth, the local cache in
 * premiumStore is only an offline mirror.
 *
 * Listeners are registered once via `connect()`; purchases (including ones that
 * complete after an interrupted flow) surface through `onPurchase` and must be
 * acknowledged with `finishTransaction` or Play auto-refunds them after 3 days.
 */

let connected = false;
let purchaseUpdateSub: EmitterSubscription | null = null;
let purchaseErrorSub: EmitterSubscription | null = null;

type Handlers = {
  onPurchase: (purchase: Purchase) => void;
  onError: (error: PurchaseError) => void;
};

/** Open the billing connection and wire purchase listeners. Idempotent. */
export async function connect(handlers: Handlers): Promise<boolean> {
  if (connected) return true;

  // Billing is Google Play only. There is no App Store product on iOS, and
  // calling initConnection() there triggers a StoreKit "Sign in to Apple
  // Account" prompt on every launch. Skip billing on non-Android platforms —
  // premiumStore then reports billing unavailable and the gate fails open.
  if (Platform.OS !== 'android') return false;

  try {
    await initConnection();
    // Recommended on Android: clear out any stuck pending purchases.
    if (Platform.OS === 'android') {
      await flushFailedPurchasesCachedAsPendingAndroid().catch(() => {});
    }

    purchaseUpdateSub = purchaseUpdatedListener(async (purchase: Purchase) => {
      try {
        // Acknowledge (non-consumable → isConsumable false) so Play keeps it.
        await finishTransaction({ purchase, isConsumable: false });
      } catch (err) {
        reportError(err, { source: 'iap.finishTransaction' });
      }
      handlers.onPurchase(purchase);
    });

    purchaseErrorSub = purchaseErrorListener((error: PurchaseError) => {
      handlers.onError(error);
    });

    connected = true;
    return true;
  } catch (err) {
    reportError(err, { source: 'iap.connect' });
    return false;
  }
}

/** Tear down listeners + connection (call on app teardown; usually unnecessary). */
export async function disconnect(): Promise<void> {
  purchaseUpdateSub?.remove();
  purchaseErrorSub?.remove();
  purchaseUpdateSub = null;
  purchaseErrorSub = null;
  if (connected) {
    await endConnection().catch(() => {});
    connected = false;
  }
}

/** Fetch the store product(s) so we can show real localized pricing. */
export async function fetchProducts(): Promise<Product[]> {
  try {
    return await getProducts({ skus: IAP_SKUS });
  } catch (err) {
    reportError(err, { source: 'iap.fetchProducts' });
    return [];
  }
}

/**
 * Kick off the purchase flow for a SKU. Resolution arrives asynchronously via
 * the purchase/error listeners registered in `connect()`.
 */
export async function buy(sku: string): Promise<void> {
  // Android takes `skus`, iOS takes `sku`; pass both for cross-platform safety.
  await requestPurchase({ skus: [sku], sku });
}

/** Past non-consumed purchases — used for both restore and entitlement checks. */
export async function getOwnedSkus(): Promise<string[]> {
  try {
    const purchases = await getAvailablePurchases();
    return purchases.map((p) => p.productId);
  } catch (err) {
    reportError(err, { source: 'iap.getOwnedSkus' });
    return [];
  }
}
