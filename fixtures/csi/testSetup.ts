import { test as base } from '@playwright/test';
import { CsiAccountManagementPage } from '../../pages/csi/AccountManagementPage';
import { CsiAvotechLoginPage } from '../../pages/csi/AvotechLoginPage';
import { CsiSalesAndBillingPage } from '../../pages/csi/SalesAndBillingPage';
import { CsiTrainingPage } from '../../pages/csi/TrainingPage';

type CsiFixtures = {
  csiLoginPage: CsiAvotechLoginPage;
  csiSalesAndBillingPage: CsiSalesAndBillingPage;
  csiAccountManagementPage: CsiAccountManagementPage;
  csiTrainingPage: CsiTrainingPage;
};

export const test = base.extend<CsiFixtures>({
  csiLoginPage: async ({ page }, use) => {
    await use(new CsiAvotechLoginPage(page));
  },
  csiSalesAndBillingPage: async ({ page }, use) => {
    await use(new CsiSalesAndBillingPage(page));
  },
  csiAccountManagementPage: async ({ page }, use) => {
    await use(new CsiAccountManagementPage(page));
  },
  csiTrainingPage: async ({ page }, use) => {
    await use(new CsiTrainingPage(page));
  },
});

export { expect } from '@playwright/test';
