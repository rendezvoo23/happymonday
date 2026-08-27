export type Segment =
  | "all"
  | "paid"
  | "trial"
  | "referral"
  | "active_7d"
  | "inactive_14d";
export type AccessKind = "paid" | "referral" | "trial";
export type AccessStatus = AccessKind | "expired";

export interface UserSummary {
  id: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName: string | null;
  createdAt: string;
  lastActivityAt: string | null;
  remindersEnabled: boolean;
  access: AccessStatus;
  paidUntil: string | null;
  referralAccessUntil: string | null;
  trialEndsAt: string | null;
  trialRequestLimit: number | null;
  activeTokenCount: number;
}

export interface Metrics {
  total_users: number;
  new_users_7d: number;
  active_users_7d: number;
  paid_users: number;
  free_access_users: number;
  shortcut_transactions_7d: number;
  stars_revenue_30d: number;
  daily_activity: Array<{ date: string; users: number }>;
}

export interface Broadcast {
  id: string;
  segment: Segment;
  status:
    | "queued"
    | "processing"
    | "completed"
    | "completed_with_errors"
    | "cancelled";
  audience_size: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  completed_at: string | null;
}

export interface UserDetail {
  user: UserSummary;
  tokens: Array<{
    id: string;
    label: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
  }>;
  payments: Array<{
    id: string;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
    access_granted_until: string | null;
  }>;
  referrals: Array<{
    id: string;
    status: string;
    inviter_rewarded: boolean;
    created_at: string;
    rewarded_at: string | null;
  }>;
  audit: Array<{
    id: string;
    action: string;
    metadata: Record<string, unknown>;
    created_at: string;
    actor_telegram_id: number;
  }>;
}
