/** Client-safe — true when Pro gates should be open */
export function isClientProUnlocked(): boolean {
  if (process.env.NEXT_PUBLIC_PRO_FEATURES_BYPASS === "true") return true;
  return false;
}
