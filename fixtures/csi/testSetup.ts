import { test as base } from '@playwright/test';
import { CsiAccountManagementPage } from '../../pages/csi/AccountManagementPage';
import { CsiAvotechLoginPage } from '../../pages/csi/AvotechLoginPage';
import { CsiPackageCreationPage } from '../../pages/csi/CsiPackageCreationPage';
import { CsiIncidentReportPage } from '../../pages/csi/IncidentReportPage';
import { CsiItAssetManagementPage } from '../../pages/csi/ITAssetManagementPage';
import { CsiPhisingPage } from '../../pages/csi/PhisingPage';
import { CsiPolicyManagementPage } from '../../pages/csi/PolicyManagementPage';
import { CsiSalesAndBillingPage } from '../../pages/csi/SalesAndBillingPage';
import { CsiCyberInsurancePage } from '../../pages/csi/CyberInsurancePage';
import { CsiPenetrationTestPage } from '../../pages/csi/PenetrationTestPage';
import { CsiSecurityReportPage } from '../../pages/csi/SecurityReportPage';
import { CsiTrainingPage } from '../../pages/csi/TrainingPage';

type CsiFixtures = {
  csiLoginPage: CsiAvotechLoginPage;
  csiPackagePage: CsiPackageCreationPage;
  csiSalesAndBillingPage: CsiSalesAndBillingPage;
  csiAccountManagementPage: CsiAccountManagementPage;
  csiTrainingPage: CsiTrainingPage;
  csiPhisingPage: CsiPhisingPage;
  csiPolicyManagementPage: CsiPolicyManagementPage;
  csiItAssetManagementPage: CsiItAssetManagementPage;
  csiIncidentReportPage: CsiIncidentReportPage;
  csiSecurityReportPage: CsiSecurityReportPage;
  csiPenetrationTestPage: CsiPenetrationTestPage;
  csiCyberInsurancePage: CsiCyberInsurancePage;
};

export const test = base.extend<CsiFixtures>({
  csiLoginPage: async ({ page }, use) => {
    await use(new CsiAvotechLoginPage(page));
  },
  csiPackagePage: async ({ page }, use) => {
    await use(new CsiPackageCreationPage(page));
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
  csiPhisingPage: async ({ page }, use) => {
    await use(new CsiPhisingPage(page));
  },
  csiPolicyManagementPage: async ({ page }, use) => {
    await use(new CsiPolicyManagementPage(page));
  },
  csiItAssetManagementPage: async ({ page }, use) => {
    await use(new CsiItAssetManagementPage(page));
  },
  csiIncidentReportPage: async ({ page }, use) => {
    await use(new CsiIncidentReportPage(page));
  },
  csiSecurityReportPage: async ({ page }, use) => {
    await use(new CsiSecurityReportPage(page));
  },
  csiPenetrationTestPage: async ({ page }, use) => {
    await use(new CsiPenetrationTestPage(page));
  },
  csiCyberInsurancePage: async ({ page }, use) => {
    await use(new CsiCyberInsurancePage(page));
  },
});

export { expect } from '@playwright/test';
