import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants';
import { PRO_TRIAL_MS, isProOn, proFrom, useProStore } from '@/store/proStore';

describe('Pro', () => {
  const now = Date.UTC(2026, 11, 1);

  it('is on while paid, or inside the free trial', () => {
    expect(isProOn({ active: true, trialEnds: null }, now)).toBe(true);
    expect(isProOn({ active: false, trialEnds: now + 1 }, now)).toBe(true);
    expect(isProOn({ active: false, trialEnds: now - 1 }, now)).toBe(false);
    expect(isProOn({ active: false, trialEnds: null }, now)).toBe(false);
  });

  it('reads the pro entitlement from RevenueCat customer info', () => {
    expect(proFrom({ entitlements: { active: {} } })).toEqual({ active: false, expires: null, productId: null, willRenew: false });
    expect(proFrom({ entitlements: { active: { pro: { expirationDate: '2027-01-01T00:00:00Z', productIdentifier: 'crspulse_pro_monthly', willRenew: true } } } }))
      .toEqual({ active: true, expires: Date.parse('2027-01-01T00:00:00Z'), productId: 'crspulse_pro_monthly', willRenew: true });
    expect(proFrom({ entitlements: { active: { pro: { expirationDate: null } } } })).toEqual({ active: true, expires: null, productId: null, willRenew: false });
  });

  it('starts the 7-day trial on the first load and keeps that start', async () => {
    await AsyncStorage.clear();
    await useProStore.getState().load();
    const start = Number(await AsyncStorage.getItem(STORAGE_KEYS.PRO_TRIAL_START));
    expect(useProStore.getState().trialEnds).toBe(start + PRO_TRIAL_MS);
    expect(useProStore.getState().active).toBe(false);
  });
});
