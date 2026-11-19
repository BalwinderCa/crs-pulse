import { toPlans, trialDays, type PlanPackage } from '@/features/pro/plans';

const monthly: PlanPackage = { identifier: '$rc_monthly', packageType: 'MONTHLY',
  product: { identifier: 'crspulse_pro_monthly', price: 3.99, priceString: 'CA$3.99',
    introPrice: { price: 0, periodUnit: 'WEEK', periodNumberOfUnits: 1 } } };
const yearly: PlanPackage = { identifier: '$rc_annual', packageType: 'ANNUAL',
  product: { identifier: 'crspulse_pro_yearly', price: 24.99, priceString: 'CA$24.99', pricePerMonthString: 'CA$2.08',
    defaultOption: { freePhase: { billingPeriod: { unit: 'DAY', value: 7 } } } } };

describe('Pro plans', () => {
  it('puts monthly first, then yearly with its per-month price and saving', () => {
    const [m, y] = toPlans([yearly, monthly]);
    expect(y).toMatchObject({ yearly: true, price: 'CA$24.99', perMonth: 'CA$2.08', savePct: 48, trialDays: 7 });
    expect(m).toMatchObject({ yearly: false, price: 'CA$3.99', perMonth: null, savePct: null, trialDays: 7 });
  });

  it('reads free trials from iOS intro prices and Android free phases, and ignores paid intros', () => {
    expect(trialDays(monthly.product)).toBe(7);
    expect(trialDays(yearly.product)).toBe(7);
    expect(trialDays({ ...monthly.product, introPrice: { price: 0.99, periodUnit: 'MONTH', periodNumberOfUnits: 1 } })).toBeNull();
    expect(trialDays({ ...monthly.product, introPrice: null })).toBeNull();
  });

  it('shows no saving when yearly costs as much as 12 months, or there is no monthly plan', () => {
    expect(toPlans([{ ...monthly, product: { ...monthly.product, price: 2 } }, yearly])[1]!.savePct).toBeNull();
    expect(toPlans([yearly])[0]!.savePct).toBeNull();
  });
});
