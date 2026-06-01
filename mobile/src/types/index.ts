// ─── Auth ────────────────────────────────────────────────────────────────────

export type AuthUser = {
  id: number;
  email: string;
  name: string;
  email_verified_at: string | null;
  created_at: string;
};

export type LoginPayload = {
  email: string;
  password: string;
  device_name: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  device_name: string;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
  expires_at: string;
};

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

// ─── User Profile ────────────────────────────────────────────────────────────

export type UserProfile = {
  id: number;
  user_id: number;
  crs_score: number;
  category: Category;
  notifications_enabled: boolean;
  weekly_summary_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type UpdateProfilePayload = {
  name?: string;
  crs_score?: number;
  category?: Category;
  notifications_enabled?: boolean;
  weekly_summary_enabled?: boolean;
};

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

export type DrawsResponse = {
  data: Draw[];
  meta: PaginationMeta;
  links: PaginationLinks;
};

export type DrawFilter = 'last_month' | 'last_year' | 'all';

// ─── Dashboard ───────────────────────────────────────────────────────────────

export type DashboardData = {
  user_score: number;
  user_category: Category;
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

// ─── Notifications ───────────────────────────────────────────────────────────

export type NotificationType =
  | 'new_draw'
  | 'score_threshold'
  | 'weekly_summary';

export type AppNotification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
};

export type NotificationsResponse = {
  data: AppNotification[];
  meta: PaginationMeta;
  unread_count: number;
};

export type DeviceTokenPayload = {
  token: string;
  platform: 'android' | 'ios';
};

// ─── Shared ───────────────────────────────────────────────────────────────────

export type PaginationMeta = {
  current_page: number;
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
};

export type PaginationLinks = {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
};

export type ApiError = {
  message: string;
  errors?: Record<string, string[]>;
  status: number;
};

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

// ─── Navigation ──────────────────────────────────────────────────────────────

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Draws: undefined;
  Analytics: undefined;
  Settings: undefined;
};
