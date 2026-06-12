export type SubscriptionPlan = "monthly" | "annual";

export interface UserNotifications {
  day1Sent?: boolean;
  slippedSentDate?: string;
  postSessionSentDate?: string;
  weeklyRecapSentWeek?: string;
}

export interface UserRecord {
  deviceId: string;
  isPro: boolean;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  plan?: SubscriptionPlan;
  createdAt: Date;
  lastSessionAt?: Date;
  totalSessions: number;
  weeklyCombos: number;
  weekStart?: string;
  notifications: UserNotifications;
}

export interface StoredPushSubscription {
  deviceId: string;
  endpoint: string;
  keys: { p256dh: string; auth: string };
  createdAt: Date;
}
