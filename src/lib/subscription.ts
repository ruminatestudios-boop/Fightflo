const PRO_KEY = "fightflo-pro";
const PAYWALL_SEEN_KEY = "fightflo-paywall-seen";

export type SubscriptionPlan = "monthly" | "annual";

export function isPro(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PRO_KEY) === "true";
}

export function setPro(active: boolean): void {
  if (typeof window === "undefined") return;
  if (active) localStorage.setItem(PRO_KEY, "true");
  else localStorage.removeItem(PRO_KEY);
}

export function hasSeenPaywall(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PAYWALL_SEEN_KEY) === "true";
}

export function setPaywallSeen(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAYWALL_SEEN_KEY, "true");
}

export const PRO_FEATURES = [
  "Unlimited AI fighter sessions",
  "All rhythm archetypes & stadium mode",
  "Advanced 6-signal mode",
  "Crowd & gym ambience",
  "Full workout history",
  "1 streak freeze for bag training",
];

export const PLANS: {
  id: SubscriptionPlan;
  label: string;
  price: string;
  period: string;
  badge?: string;
  perMonth?: string;
}[] = [
  {
    id: "annual",
    label: "Annual",
    price: "£47.99",
    period: "per year",
    badge: "Save 60%",
    perMonth: "£3.99/mo",
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "£9.99",
    period: "per month",
  },
];

/** FlowBag /bag pricing (USD) */
export const FLOWBAG_PLANS: {
  id: SubscriptionPlan;
  label: string;
  price: string;
  period: string;
  badge?: string;
}[] = [
  {
    id: "monthly",
    label: "Monthly",
    price: "$9.99",
    period: "per month",
  },
  {
    id: "annual",
    label: "Annual",
    price: "$79",
    period: "per year",
    badge: "Save 34% — $79/yr",
  },
];

export const FLOWBAG_PRO_FEATURES = [
  "Unlimited combo sessions",
  "Full session history & scores",
  "Combo library & 30-day charts",
  "Corner feedback after rounds (Fighter cam)",
  "Weekly recap push notifications",
];
