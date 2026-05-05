import { expect, type Locator, type Page } from '@playwright/test';

export abstract class BasePage {
  constructor(readonly page: Page) {}

  async waitForElement(locator: Locator, timeout = 15_000) {
    await expect(locator).toBeVisible({ timeout });
    return locator;
  }
}
