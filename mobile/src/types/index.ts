// ─── Categories ──────────────────────────────────────────────────────────────

export const CATEGORIES = [
  'CEC',
  'General',
  'Healthcare',
  'STEM',
  'Trades',
  'French',
] as const;

export type Category = (typeof CATEGORIES)[number];

// Program the user's local profile targets — includes programs that map onto
// draw categories (FSW → General, FST → Trades) plus PNP.
export type ProgramCategory = Category | 'FSW' | 'FST' | 'PNP';

// ─── Draws ───────────────────────────────────────────────────────────────────

export type Draw = {
  id: number;
  draw_number: number;
  date: string;
  category: Category | 'General';
  cutoff_score: number;
  invitations_issued: number;
  tie_breaking_rule: string | null;
  notes: string | null;
  created_at: string;
};

export type DrawFilter = 'last_month' | 'last_year' | 'all';

// ─── Dashboard ───────────────────────────────────────────────────────────────

export type DashboardData = {
  user_score: number;
  user_category: ProgramCategory;
  latest_draw: Draw;
  score_difference: number;
  prediction: Prediction;
  recent_draws: Draw[];
};

// ─── Analytics ───────────────────────────────────────────────────────────────

export type Analytics = {
  category: Category | 'all';
  average_cutoff: number;
  highest_cutoff: number;
  lowest_cutoff: number;
  total_draws: number;
  total_invitations: number;
  trend: 'rising' | 'falling' | 'stable';
  trend_percentage: number;
  chart_data: ChartDataPoint[];
};

export type ChartDataPoint = {
  date: string;
  cutoff: number;
  invitations: number;
};

// ─── Prediction ──────────────────────────────────────────────────────────────

export type PredictionStrength = 'strong' | 'moderate' | 'weak';

export type Prediction = {
  strength: PredictionStrength;
  label: string;
  description: string;
  score_needed: number | null;
  estimated_draws: number | null;
};

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Faq:  undefined;
  ReportIssue: undefined;
  SinpCalculator: undefined;
  CrsCalculator: undefined;
  Calculators: undefined;
  ApplicationSetup: undefined;
  DocumentChecklist: undefined;
  DocumentChecklistDetail: { programId: string };
  FswCalculator: undefined;
  BcSirsCalculator: undefined;
  Notifications: undefined;
  ProcessingTimes: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Timeline:  undefined;
  Draws:     undefined;
  Analytics: undefined;
  Settings:  undefined;
};
