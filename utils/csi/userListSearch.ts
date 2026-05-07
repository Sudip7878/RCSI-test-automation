/**
 * IR-001: user list search uses the local-part substring before the first '.'
 * (e.g. `dax.manning+12@...` → `dax`).
 */
export function csiUserListSearchTokenFromEmail(email: string): string {
  const local = email.trim().split('@')[0] ?? '';
  const i = local.indexOf('.');
  return i === -1 ? local : local.slice(0, i);
}
