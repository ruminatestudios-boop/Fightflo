/** Client-safe — true when Pro gates should be open (local dev) */
export function isClientProUnlocked(): boolean {
  if (process.env.NEXT_PUBLIC_PRO_FEATURES_BYPASS === "true") return true;
  if (process.env.NEXT_PUBLIC_PRO_FEATURES_BYPASS === "false") return false;
  return process.env.NODE_ENV === "development";
}
