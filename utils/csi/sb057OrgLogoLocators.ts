import type { Locator, Page } from '@playwright/test';

import { SB057_ORG_LOGO_SRC_FRAGMENT } from './sb057WhiteLabelTestData';

/**
 * SB-057 org logos (Ricoh.png) are present in the DOM but omitted from the a11y tree,
 * so getByRole('img') cannot target them. Match the image URL from recorded-steps/SB-057.txt.
 */
function sb057VisibleOrgLogoImages(page: Page): Locator {
  return page.locator(`img[src*="${SB057_ORG_LOGO_SRC_FRAGMENT}"]`).filter({ visible: true });
}

/** 1st logo: header ApplicationTitle app-logo. */
export function sb057HeaderOrgLogoLocator(page: Page): Locator {
  return sb057VisibleOrgLogoImages(page).first();
}

/** 2nd logo: welcome card AppLogo. */
export function sb057WelcomeCardOrgLogoLocator(page: Page): Locator {
  return sb057VisibleOrgLogoImages(page).last();
}
