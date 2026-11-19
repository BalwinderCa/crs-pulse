/** Just the parts of a RevenueCat package the paywall reads (kept loose so tests can build them). */
export type PlanPackage = {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    price: number;
    priceString: string;
    pricePerMonthString?: string | null;
    introPrice?: { price: number; periodUnit: string; periodNumberOfUnits: number } | null;
    defaultOption?: { freePhase?: { billingPeriod: { unit: string; value: number } } | null } | null;
  };
};

export type Plan = {
  id: string;
  yearly: boolean;
  price: string;
  /** "CA$2.08" for a yearly plan, so it compares with monthly. */
  perMonth: string | null;
  /** Whole-percent saving of yearly over 12 months of the monthly plan. */
  savePct: number | null;
  /** Length of the store's free trial in days, or null when there isn't one. */
  trialDays: number | null;
  productId: string;
};

const DAYS: Record<string, number> = { DAY: 1, WEEK: 7, MONTH: 30, YEAR: 365 };

/** Free-trial length: iOS reports an intro price of 0, Android a free pricing phase. */
export function trialDays(p: PlanPackage['product']): number | null {
  const intro = p.introPrice;
  if (intro && intro.price === 0) return (DAYS[intro.periodUnit] ?? 0) * intro.periodNumberOfUnits || null;
  const free = p.defaultOption?.freePhase?.billingPeriod;
  if (free) return (DAYS[free.unit] ?? 0) * free.value || null;
  return null;
}

/** Monthly first (the default choice), then yearly with its per-month price and saving. */
export function toPlans(packages: PlanPackage[]): Plan[] {
  const monthly = packages.find((p) => p.packageType === 'MONTHLY');
  return packages
    .filter((p) => p.packageType === 'ANNUAL' || p.packageType === 'MONTHLY')
    .sort((a, b) => (a.packageType === 'MONTHLY' ? -1 : b.packageType === 'MONTHLY' ? 1 : 0))
    .map((p) => {
      const yearly = p.packageType === 'ANNUAL';
      const save = yearly && monthly && monthly.product.price > 0
        ? Math.round((1 - p.product.price / (monthly.product.price * 12)) * 100)
        : null;
      return {
        id: p.identifier,
        yearly,
        price: p.product.priceString,
        perMonth: yearly ? p.product.pricePerMonthString ?? null : null,
        savePct: save !== null && save > 0 ? save : null,
        trialDays: trialDays(p.product),
        productId: p.product.identifier,
      };
    });
}
