/** SB-057: wait after custom-org owner login before branding assertions (recorded-steps/Sales&Billing/SB-057.txt). */
export const SB057_POST_LOGIN_WAIT_MS = 5_000;

/** SB-057: Playwright image compare — 95% match → at most 5% differing pixels. */
export const SB057_LOGO_MAX_DIFF_PIXEL_RATIO = 0.05;

/** SB-057: fixed viewport for stable logo snapshots in CI (recorded-steps/SB-057.txt). */
export const SB057_VIEWPORT = { width: 1280, height: 720 } as const;

/** Custom org logo asset file name in image URLs (SB-057 expected: Ricoh.png / app-logo). */
export const SB057_ORG_LOGO_SRC_FRAGMENT = 'Ricoh.png';

/** Default org display name for baseline file naming (`logo-Test-Richo-Org2`, etc.). */
export const SB057_DEFAULT_CUSTOM_THEME_ORG_NAME = 'Test Richo Org2';

export function csiCustomThemeOrgName(): string {
  const name = process.env.CUSTOM_THEME_ORG_NAME?.trim();
  if (name != null && name.length > 0) {
    return name;
  }
  return SB057_DEFAULT_CUSTOM_THEME_ORG_NAME;
}

/** `Test Richo Org2` → `Test-Richo-Org2` for snapshot / JSON file names. */
export function sb057OrgFileSlug(orgName = csiCustomThemeOrgName()): string {
  return orgName.trim().replace(/\s+/g, '-');
}

export type Sb057LogoPlacement = 'header' | 'welcome';

export function sb057LogoSnapshotName(
  orgSlug = sb057OrgFileSlug(),
  placement: Sb057LogoPlacement = 'welcome',
): string {
  return placement === 'welcome' ? `logo-${orgSlug}.png` : `logo-${orgSlug}-header.png`;
}

/** CSS custom properties on `:root` to compare (recorded-steps/Sales&Billing/SB-057.txt). */
export const SB057_THEME_CSS_VARIABLE_KEYS = [
  'color-primary',
  'color-secondary',
  'color-background-body',
  'color-primary-hover',
  'color-light-primary',
  'color-neutral-0',
  'color-neutral-9',
  'color-neutral-10',
  'mod-color-1',
  'mod-color-2',
  'mod-color-3',
  'mod-color-4',
  'mod-color-5',
  'primary-gradient',
] as const;
