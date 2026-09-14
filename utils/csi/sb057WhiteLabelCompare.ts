import fs from 'node:fs';
import path from 'node:path';

import { expect, type Page } from '@playwright/test';

import {
  SB057_THEME_CSS_VARIABLE_KEYS,
  sb057OrgFileSlug,
} from './sb057WhiteLabelTestData';

const SB057_BASELINE_DIR = path.join(process.cwd(), 'tests', 'csi', 'salesAndBilling', 'sb057-baselines');

/** Set via `npm run test:sb057:update-baselines` (Playwright has no `--update-theme` flag). */
export function sb057ShouldUpdateThemeBaseline(): boolean {
  const flag = process.env.SB057_UPDATE_THEME?.trim().toLowerCase();
  return flag === '1' || flag === 'true' || flag === 'yes';
}

export function sb057ThemeBaselinePath(orgSlug = sb057OrgFileSlug()): string {
  return path.join(SB057_BASELINE_DIR, `theme-color-${orgSlug}.json`);
}

export async function extractSb057ThemeCssVariables(
  page: Page,
): Promise<Record<string, string>> {
  const keys = [...SB057_THEME_CSS_VARIABLE_KEYS];
  return page.evaluate((variableKeys) => {
    const style = getComputedStyle(document.documentElement);
    const values: Record<string, string> = {};
    for (const key of variableKeys) {
      let value = style.getPropertyValue(`--${key}`).trim();
      if (!value) {
        value = style.getPropertyValue(key).trim();
      }
      values[key] = value;
    }
    return values;
  }, keys);
}

export async function assertSb057ThemeMatchesBaseline(
  page: Page,
  orgSlug = sb057OrgFileSlug(),
): Promise<void> {
  const baselinePath = sb057ThemeBaselinePath(orgSlug);
  const live = await extractSb057ThemeCssVariables(page);

  if (sb057ShouldUpdateThemeBaseline()) {
    fs.mkdirSync(SB057_BASELINE_DIR, { recursive: true });
    fs.writeFileSync(baselinePath, `${JSON.stringify(live, null, 2)}\n`, 'utf8');
    return;
  }

  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      `SB-057 theme baseline missing: ${baselinePath}. Run npm run test:sb057:update-baselines to capture CSS variables.`,
    );
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as Record<string, string>;
  expect(live, `theme CSS variables vs ${path.basename(baselinePath)}`).toEqual(baseline);
}
