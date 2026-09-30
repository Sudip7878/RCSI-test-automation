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

function hasThemeValues(values: Record<string, string>): boolean {
  return Object.values(values).some((value) => value.length > 0);
}

/** True when the baseline JSON is absent, unreadable, or holds no non-empty CSS variable value. */
function isThemeBaselineMissingOrEmpty(baselinePath: string): boolean {
  if (!fs.existsSync(baselinePath)) {
    return true;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as Record<string, string>;
    return !hasThemeValues(parsed);
  } catch {
    return true;
  }
}

export interface Sb057ThemeAssertOptions {
  updateBaselinesCommand?: string;
  /** Capture the baseline from the live app when the JSON is missing or empty instead of failing. */
  createBaselineIfMissingOrEmpty?: boolean;
}

export async function assertSb057ThemeMatchesBaseline(
  page: Page,
  orgSlug = sb057OrgFileSlug(),
  {
    updateBaselinesCommand = 'npm run test:sb057:update-baselines',
    createBaselineIfMissingOrEmpty = false,
  }: Sb057ThemeAssertOptions = {},
): Promise<void> {
  const baselinePath = sb057ThemeBaselinePath(orgSlug);
  const live = await extractSb057ThemeCssVariables(page);

  const shouldCapture =
    sb057ShouldUpdateThemeBaseline() ||
    (createBaselineIfMissingOrEmpty && isThemeBaselineMissingOrEmpty(baselinePath));

  if (shouldCapture) {
    if (!hasThemeValues(live)) {
      throw new Error(`Cannot capture theme baseline ${baselinePath}: no CSS variable values found on the page.`);
    }
    fs.mkdirSync(SB057_BASELINE_DIR, { recursive: true });
    fs.writeFileSync(baselinePath, `${JSON.stringify(live, null, 2)}\n`, 'utf8');
    return;
  }

  if (!fs.existsSync(baselinePath)) {
    throw new Error(
      `Theme baseline missing: ${baselinePath}. Run ${updateBaselinesCommand} to capture CSS variables.`,
    );
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8')) as Record<string, string>;
  expect(live, `theme CSS variables vs ${path.basename(baselinePath)}`).toEqual(baseline);
}
