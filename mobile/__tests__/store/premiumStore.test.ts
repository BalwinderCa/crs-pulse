import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePremiumStore } from '@/store/premiumStore';
import * as iap from '@/services/iapService';
import { IAP_PRODUCTS, STORAGE_KEYS } from '@/constants';

// The premium store is the monetization core and was previously shipped in a
// syntactically-broken state (duplicate trailing block) that only `tsc` caught.
// Importing the module here is itself a regression guard: if it ever fails to
// parse again, this whole suite fails instead of slipping through to a build.
jest.mock('@/services/iapService', () => ({
  connect: jest.fn(),
  fetchProducts: jest.fn(),
  buy: jest.fn(),
  getOwnedSkus: jest.fn(),
}));

const SKU = IAP_PRODUCTS.ANALYTICS_UNLOCK;
const mockConnect = iap.connect as jest.Mock;
const mockFetchProducts = iap.fetchProducts as jest.Mock;
const mockBuy = iap.buy as jest.Mock;
const mockGetOwnedSkus = iap.getOwnedSkus as jest.Mock;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  usePremiumStore.setState({
    isPremium: false,
    loaded: false,
    purchasing: false,
    price: null,
    error: null,
    billingAvailable: false,
  });
});

describe('premiumStore', () => {
  it('module loads and exposes the expected action shape', () => {
    const s = usePremiumStore.getState();
    expect(typeof s.init).toBe('function');
    expect(typeof s.purchase).toBe('function');
    expect(typeof s.restore).toBe('function');
  });

  it('fails OPEN when billing is unavailable (connect=false)', async () => {
    mockConnect.mockResolvedValue(false);
    await usePremiumStore.getState().init();
    const s = usePremiumStore.getState();
    expect(s.loaded).toBe(true);
    // Consumers MUST unlock the gate when billingAvailable is false (iOS, emulator).
    expect(s.billingAvailable).toBe(false);
    expect(mockFetchProducts).not.toHaveBeenCalled();
  });

  it('grants entitlement when the owned SKU is present', async () => {
    mockConnect.mockResolvedValue(true);
    mockFetchProducts.mockResolvedValue([{ productId: SKU, localizedPrice: '$4.99' }]);
    mockGetOwnedSkus.mockResolvedValue([SKU]);

    await usePremiumStore.getState().init();

    const s = usePremiumStore.getState();
    expect(s.isPremium).toBe(true);
    expect(s.billingAvailable).toBe(true);
    expect(s.price).toBe('$4.99');
    expect(await AsyncStorage.getItem(STORAGE_KEYS.PREMIUM)).toBe('true');
  });

  it('does not grant entitlement when the SKU is not owned (billing available)', async () => {
    mockConnect.mockResolvedValue(true);
    mockFetchProducts.mockResolvedValue([{ productId: SKU, localizedPrice: '$4.99' }]);
    mockGetOwnedSkus.mockResolvedValue([]);

    await usePremiumStore.getState().init();

    const s = usePremiumStore.getState();
    expect(s.isPremium).toBe(false);
    expect(s.billingAvailable).toBe(true);
  });

  it('grants entitlement asynchronously via the purchase listener', async () => {
    let onPurchase: ((p: { productId: string }) => void) | undefined;
    mockConnect.mockImplementation(async (handlers: { onPurchase: (p: { productId: string }) => void }) => {
      onPurchase = handlers.onPurchase;
      return true;
    });
    mockFetchProducts.mockResolvedValue([{ productId: SKU, localizedPrice: '$4.99' }]);
    mockGetOwnedSkus.mockResolvedValue([]);

    await usePremiumStore.getState().init();
    expect(usePremiumStore.getState().isPremium).toBe(false);

    onPurchase?.({ productId: SKU });
    expect(usePremiumStore.getState().isPremium).toBe(true);
  });

  it('restore() surfaces an error when there is no prior purchase', async () => {
    mockGetOwnedSkus.mockResolvedValue([]);
    await usePremiumStore.getState().restore();
    const s = usePremiumStore.getState();
    expect(s.isPremium).toBe(false);
    expect(s.purchasing).toBe(false);
    expect(s.error).toMatch(/no previous purchase/i);
  });

  it('purchase() delegates to the billing buy() call', async () => {
    mockBuy.mockResolvedValue(undefined);
    await usePremiumStore.getState().purchase();
    expect(mockBuy).toHaveBeenCalledWith(SKU);
  });
});
