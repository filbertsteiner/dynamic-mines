// Who can see/use the operator (house) controls. This is a DEMO-level gate for
// UI visibility only — real authority is enforced on-chain (the vault's
// onlyOwner) and, for custodial mode, by the backend + Fireblocks policy. A
// client-side email check can be spoofed, so it must never be the sole control
// over funds.

export const SUPER_ADMIN_EMAIL = "coreywright7@gmail.com";
const OPERATOR_DOMAIN = "@fireblocks.com";

export function isSuperAdmin(email?: string | null): boolean {
  return !!email && email.toLowerCase() === SUPER_ADMIN_EMAIL;
}

// Operators: the super admin, plus anyone signing in with a Fireblocks account.
export function isOperator(email?: string | null): boolean {
  if (!email) return false;
  const e = email.toLowerCase();
  return e === SUPER_ADMIN_EMAIL || e.endsWith(OPERATOR_DOMAIN);
}
