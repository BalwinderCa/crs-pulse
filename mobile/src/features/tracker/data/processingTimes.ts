/**
 * IRCC application categories, types, and typical processing times.
 *
 * Mirrors the category/type structure of IRCC's "Check processing times"
 * tool (canada.ca). Times are approximate, based on IRCC's published
 * figures, last reviewed June 2026. Country-specific programs vary
 * widely — those are flagged with `varies`.
 */

export interface ApplicationType {
  id: string;
  label: string;
  /** Typical processing time in months, from IRCC published figures. */
  months: number;
  varies?: boolean;
  /** How the application is submitted, e.g. "Online via Express Entry". */
  method?: string;
  /** Approximate queue size (people waiting for a decision), when IRCC publishes it. */
  peopleWaiting?: number;
}

export interface ApplicationCategory {
  id: string;
  label: string;
  icon: string;
  types: ApplicationType[];
}

export const PROCESSING_TIMES_UPDATED = 'June 8, 2026';

export const APPLICATION_CATEGORIES: ApplicationCategory[] = [
  {
    id: 'temporary',
    label: 'Temporary Residence',
    icon: 'airplane-outline',
    types: [
      { id: 'visitor',   label: 'Visitor visa',          months: 2, varies: true },
      { id: 'supervisa', label: 'Super visa (parents)',  months: 4, varies: true },
      { id: 'study',     label: 'Study permit',          months: 3, varies: true },
      { id: 'work',      label: 'Work permit',           months: 4, varies: true },
    ],
  },
  {
    id: 'economic',
    label: 'Economic Immigration',
    icon: 'briefcase-outline',
    types: [
      { id: 'aip',        label: 'Atlantic Immigration Program',             months: 12 },
      { id: 'ee_cec',     label: 'Canadian Experience Class',                months: 7, method: 'Online via Express Entry', peopleWaiting: 60_900 },
      { id: 'caregivers', label: 'Caregivers (all programs)',                months: 36, varies: true },
      { id: 'ee_pnp',     label: 'Provincial Nominees — Express Entry',      months: 7, method: 'Online via Express Entry' },
      { id: 'pnp_paper',  label: 'Provincial Nominees — non-Express Entry',  months: 14 },
      { id: 'self_emp',   label: 'Self-employed persons (Federal)',          months: 50, varies: true },
      { id: 'qc_business',label: 'Quebec Business Class',                    months: 60, varies: true },
      { id: 'ee_fsw',     label: 'Skilled workers (Federal)',                months: 7, method: 'Online via Express Entry' },
      { id: 'ee_fst',     label: 'Skilled trades (Federal)',                 months: 7, method: 'Online via Express Entry' },
      { id: 'qc_skilled', label: 'Skilled workers (Quebec)',                 months: 21, varies: true },
      { id: 'suv',        label: 'Start-up visa',                            months: 40 },
    ],
  },
  {
    id: 'family',
    label: 'Family Sponsorship',
    icon: 'heart-outline',
    types: [
      { id: 'spouse_inland',  label: 'Spouse / partner (inside Canada)',  months: 25 },
      { id: 'spouse_outland', label: 'Spouse / partner (outside Canada)', months: 16 },
      { id: 'child',          label: 'Dependent child',                   months: 21, varies: true },
      { id: 'parents',        label: 'Parents & grandparents',            months: 33 },
    ],
  },
  {
    id: 'refugees',
    label: 'Refugees',
    icon: 'people-outline',
    types: [
      { id: 'refugee_gov',     label: 'Government-assisted refugees',  months: 24, varies: true },
      { id: 'refugee_private', label: 'Privately sponsored refugees',  months: 36, varies: true },
    ],
  },
  {
    id: 'hc',
    label: 'Humanitarian & Compassionate',
    icon: 'hand-left-outline',
    types: [
      { id: 'hc_case', label: 'Humanitarian and compassionate cases', months: 24, varies: true },
    ],
  },
  {
    id: 'passport',
    label: 'Passport',
    icon: 'book-outline',
    types: [
      { id: 'passport_ca', label: 'Passport (in Canada)', months: 1 },
    ],
  },
  {
    id: 'citizenship',
    label: 'Citizenship',
    icon: 'flag-outline',
    types: [
      { id: 'citizenship', label: 'Citizenship grant',              months: 13 },
      { id: 'cit_proof',   label: 'Proof of citizenship (certificate)', months: 5 },
    ],
  },
  {
    id: 'pr_cards',
    label: 'Permanent Resident Cards',
    icon: 'card-outline',
    types: [
      { id: 'pr_card_renew', label: 'PR card — renewal or replacement', months: 2 },
      { id: 'pr_card_first', label: 'PR card — first card',             months: 2 },
    ],
  },
  {
    id: 'documents',
    label: 'Replacing or Amending Documents',
    icon: 'document-text-outline',
    types: [
      { id: 'vos',   label: 'Verification of status',          months: 10, varies: true },
      { id: 'amend', label: 'Amending immigration documents',  months: 10, varies: true },
    ],
  },
];

export function findApplicationType(
  categoryId: string,
  typeId: string,
): { category: ApplicationCategory; type: ApplicationType } | null {
  const category = APPLICATION_CATEGORIES.find((c) => c.id === categoryId);
  const type = category?.types.find((t) => t.id === typeId);
  return category && type ? { category, type } : null;
}
