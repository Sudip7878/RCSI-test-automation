import { expect } from '@playwright/test';

import { test } from '../../../fixtures/csi/testSetup';
import {
  csiCustomOrgOwnerTestEmail,
  csiCustomOrgOwnerTestPassword,
  csiPenetrationTesterTestEmail,
  csiPenetrationTesterTestPassword,
  csiTestEmail,
  csiTestPassword,
  csiTrainingPhisingSysOwnerTestEmail,
  csiTrainingPhisingSysOwnerTestPassword,
} from '../../../utils/csi/credentials';
import { assertSb057ThemeMatchesBaseline } from '../../../utils/csi/sb057WhiteLabelCompare';
import {
  SB057_LOGO_MAX_DIFF_PIXEL_RATIO,
  SB057_VIEWPORT,
  sb057LogoSnapshotName,
  sb057OrgFileSlug,
} from '../../../utils/csi/sb057WhiteLabelTestData';
import {
  csiExistingBillingPartnerNameForSb027,
  csiOrgASalesOrderIdForSb067,
} from '../../../utils/csi/salesAndBillingTestData';
import { writeInvoiceCompareDebugJsonFiles } from '../../../utils/csi/invoiceCompareDebugLog';
import {
  assertInvoicePdfSubsetOfPreviewTemplate,
  extractInvoicePdfText,
  previewKeyValuesToCompareJson,
} from '../../../utils/csi/invoicePdfPreviewCompare';
import {
  buildSb030AddClientFormData,
  sb030AddClientFormSteps,
} from '../../../utils/csi/sb030ClientTestData';
import {
  buildSb031AddClientFormData,
  sb031AddClientFormSteps,
} from '../../../utils/csi/sb031ClientTestData';
import {
  csiPackageDescription,
  csiPackagePricePerModule,
  csiSalesOrderDuration,
  csiSalesOrderUnitsPerModule,
  csiSalesPartnerContactEmail,
  csiSalesPartnerDomain,
  csiSalesPartnerS3BucketName,
  csiSalesPartnerS3BucketUrl,
  csiSalesPartnerSendgridReplyToEmail,
  csiSalesPartnerSendgridSenderName,
  csiExistingPackageNameForSb004,
  csiUniquePackageName,
  csiUniqueSalesPartnerName,
  csiUniqueTimestampSuffix,
} from '../../../utils/csi/salesAndBillingTestData';

test.describe('CSI · Sales and Billing', () => {
  test.describe.configure({ timeout: 180_000 });

  test.describe('CSI_TEST user flows', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (!process.env.CSI_TEST_PASSWORD?.length) {
        test.skip();
        return;
      }

      const email = csiTestEmail();
      const password = csiTestPassword();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(email, password);
      await csiLoginPage.expectOnHome();
    });

    test.describe('Navigate to Package Management and create package', () => {
      test('Navigate to Package Management and create package', async ({
        csiSalesAndBillingPage,
      }) => {
        const packageName = csiUniquePackageName('Package-');
        const packageDescription = csiPackageDescription();
        const unitPrice = csiPackagePricePerModule();

        await csiSalesAndBillingPage.openSalesAndBilling();
        await csiSalesAndBillingPage.openPackageManagement();
        await csiSalesAndBillingPage.clickAddPackage();
        await csiSalesAndBillingPage.fillPackageDetails(packageName, packageDescription);
        await csiSalesAndBillingPage.selectSalesPartnerAvotech();
        await csiSalesAndBillingPage.selectAllModulesAndSetUnitPrice(unitPrice);
        await csiSalesAndBillingPage.submitPackage();
        await csiSalesAndBillingPage.expectPackageCreated(packageName);
      });
    });

    test.describe('SB-004 create package with duplicate name', () => {
      test('SB-004', async ({ csiSalesAndBillingPage }) => {
        const packageName = csiExistingPackageNameForSb004();
        const unitPrice = csiPackagePricePerModule();

        await csiSalesAndBillingPage.openSalesAndBilling();
        await csiSalesAndBillingPage.openPackageManagement();
        await csiSalesAndBillingPage.clickAddPackage();
        await csiSalesAndBillingPage.fillPackageDetails(packageName, csiPackageDescription());
        await csiSalesAndBillingPage.selectSalesPartnerAvotech();
        await csiSalesAndBillingPage.selectAllModulesAndSetUnitPrice(unitPrice);
        await csiSalesAndBillingPage.submitPackage();
        await csiSalesAndBillingPage.expectPackageDuplicateNameRejected();
      });
    });

    test.describe('SB-027 create billing partner with duplicate name', () => {
      test('SB-027', async ({ csiSalesAndBillingPage }) => {
        const billingPartnerName = csiExistingBillingPartnerNameForSb027();

        await csiSalesAndBillingPage.openBillingPartnerList();
        await csiSalesAndBillingPage.clickAddBillingPartner();
        await csiSalesAndBillingPage.fillBillingPartnerFormSb027(billingPartnerName);
        await csiSalesAndBillingPage.submitPackage();
        await csiSalesAndBillingPage.expectBillingPartnerDuplicateNameRejected();
      });
    });

    test.describe('SB-030 add client with duplicate org name', () => {
      test('SB-030', async ({ csiSalesAndBillingPage }) => {
        const formData = buildSb030AddClientFormData();

        await csiSalesAndBillingPage.openClientList();
        await csiSalesAndBillingPage.clickAddClient();
        await csiSalesAndBillingPage.fillAddClientFormSb030(sb030AddClientFormSteps(formData));
        await csiSalesAndBillingPage.submitPackage();
        await csiSalesAndBillingPage.expectClientDuplicateNameRejected();
      });
    });

    test.describe('SB-031 add client with duplicate owner email', () => {
      test('SB-031', async ({ csiSalesAndBillingPage }) => {
        const formData = buildSb031AddClientFormData();

        await csiSalesAndBillingPage.openClientList();
        await csiSalesAndBillingPage.clickAddClient();
        await csiSalesAndBillingPage.fillAddClientFormSb030(sb031AddClientFormSteps(formData));
        await csiSalesAndBillingPage.submitPackage();
        await csiSalesAndBillingPage.expectClientDuplicateEmailRejected();
      });
    });

    test.describe('Navigate to Sales Order and create sales order', () => {
      test('Navigate to Sales Order and create sales order', async ({
        csiSalesAndBillingPage,
      }) => {
        const duration = csiSalesOrderDuration();
        const unitsPerModule = csiSalesOrderUnitsPerModule();

        await csiSalesAndBillingPage.openSalesAndBilling();
        await csiSalesAndBillingPage.openSalesOrder();
        const salesOrderDropdownMaxAttempts = 4;

        await csiSalesAndBillingPage.clickAddSalesOrder();
        await csiSalesAndBillingPage.selectLastOptionByTriggerText(
          'Select Client',
          salesOrderDropdownMaxAttempts,
        );
        await csiSalesAndBillingPage.selectFirstOptionByTriggerText(
          'Select Sales Partner',
          salesOrderDropdownMaxAttempts,
        );
        await csiSalesAndBillingPage.selectFirstBillingPartnerOption(salesOrderDropdownMaxAttempts);
        await csiSalesAndBillingPage.selectFirstOptionByTriggerText(
          'Select Package Type',
          salesOrderDropdownMaxAttempts,
        );

        const salesOrderDatePickerMaxAttempts = 4;
        await csiSalesAndBillingPage.pickTodaySalesStartDate(salesOrderDatePickerMaxAttempts);
        await csiSalesAndBillingPage.fillSalesOrderDuration(duration);
        await csiSalesAndBillingPage.selectFirstBillingMode();
        await csiSalesAndBillingPage.selectAllSalesOrderModulesAndSetUnits(unitsPerModule);
        await csiSalesAndBillingPage.continueSalesOrderToReview();
        await csiSalesAndBillingPage.submitPackage();
        await csiSalesAndBillingPage.expectSalesOrderCreated();
      });
    });

    test.describe('SB-052 sales order review pricing totals', () => {
      test('SB-052', async ({ csiSalesAndBillingPage }) => {
        const duration = csiSalesOrderDuration();
        const unitsPerModule = csiSalesOrderUnitsPerModule();
        const salesOrderDropdownMaxAttempts = 4;
        const salesOrderDatePickerMaxAttempts = 4;

        await csiSalesAndBillingPage.openSalesAndBilling();
        await csiSalesAndBillingPage.openSalesOrder();
        await csiSalesAndBillingPage.clickAddSalesOrder();
        await csiSalesAndBillingPage.selectLastOptionByTriggerText(
          'Select Client',
          salesOrderDropdownMaxAttempts,
        );
        await csiSalesAndBillingPage.selectFirstOptionByTriggerText(
          'Select Sales Partner',
          salesOrderDropdownMaxAttempts,
        );
        await csiSalesAndBillingPage.selectFirstBillingPartnerOption(salesOrderDropdownMaxAttempts);
        await csiSalesAndBillingPage.selectFirstOptionByTriggerText(
          'Select Package Type',
          salesOrderDropdownMaxAttempts,
        );
        await csiSalesAndBillingPage.pickTodaySalesStartDate(salesOrderDatePickerMaxAttempts);
        await csiSalesAndBillingPage.fillSalesOrderDuration(duration);
        await csiSalesAndBillingPage.selectFirstBillingMode();
        await csiSalesAndBillingPage.selectAllSalesOrderModulesAndSetUnits(unitsPerModule);
        await csiSalesAndBillingPage.continueSalesOrderToReview();
        await csiSalesAndBillingPage.expectSalesOrderReviewStepReady();
        await csiSalesAndBillingPage.expectSb052SalesOrderReviewPricingConsistent();
      });
    });

    test.describe('Navigate to Sales Partner list and create sales partner', () => {
      test('Navigate to Sales Partner list and create sales partner', async ({
        csiSalesAndBillingPage,
      }) => {
        const uniqueSuffix = csiUniqueTimestampSuffix();
        const partnerName = csiUniqueSalesPartnerName();

        await csiSalesAndBillingPage.openSalesPartnerList();
        await csiSalesAndBillingPage.clickAddSalesPartner();
        await csiSalesAndBillingPage.fillSalesPartnerBasicInformation({
          partnerName,
          domain: csiSalesPartnerDomain(),
          s3BucketName: csiSalesPartnerS3BucketName(),
          s3BucketUrl: csiSalesPartnerS3BucketUrl(),
          sendgridSenderName: csiSalesPartnerSendgridSenderName(),
          sendgridReplyToEmail: csiSalesPartnerSendgridReplyToEmail(),
          salesPartnerContactEmail: csiSalesPartnerContactEmail(),
          subdomainExampleHost: `test-${uniqueSuffix}.com`,
        });
        await csiSalesAndBillingPage.clickNextOnAddSalesPartnerWizard();
        await csiSalesAndBillingPage.fillSalesPartnerEmailTemplateStep(uniqueSuffix);
        await csiSalesAndBillingPage.clickNextOnAddSalesPartnerWizard();
        await csiSalesAndBillingPage.submitAddSalesPartnerWizard();
        await csiSalesAndBillingPage.expectSalesPartnerCreated(partnerName);
      });
    });

    test.describe('SB-062 invoice PDF matches on-page preview semantics', () => {
      test('SB-062', async ({ csiSalesAndBillingPage }) => {
        await csiSalesAndBillingPage.openInvoiceList();
        await csiSalesAndBillingPage.openFirstInvoiceViewDetails();
        await csiSalesAndBillingPage.expectInvoiceDetailPreviewReady();

        const previewFullText = await csiSalesAndBillingPage.readInvoiceTemplatePreviewText();
        const previewKeyValues = await csiSalesAndBillingPage.readInvoiceTemplateKeyValues();
        const previewJson = previewKeyValuesToCompareJson(previewKeyValues);
        const pdfBuffer = await csiSalesAndBillingPage.downloadInvoicePdfBytes();
        const pdfText = await extractInvoicePdfText(pdfBuffer);

        // write `debug-output/invoice-compare/invoice-template-snapshot.json` and `invoice-pdf-snapshot.json`.
        await writeInvoiceCompareDebugJsonFiles({
          previewCompareJson: previewJson,
          previewKeyValues,
          previewFullText,
          pdfText,
        });

        assertInvoicePdfSubsetOfPreviewTemplate(previewJson, previewFullText, pdfText);
      });
    });
  });

  test.describe('SB-067 cross-org ViewSalesOrder access denied', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_PENETRATION_TESTER_TEST_PASSWORD?.length ||
        !process.env.CSI_PENETRATION_TESTER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiPenetrationTesterTestEmail(),
        csiPenetrationTesterTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('SB-067', async ({ csiSalesAndBillingPage }) => {
      const salesOrderId = csiOrgASalesOrderIdForSb067();
      await csiSalesAndBillingPage.openViewSalesOrder(salesOrderId);
      await csiSalesAndBillingPage.expectViewSalesOrderNoPermissionMessage();
    });
  });

  test.describe('SB-056 restricted hub module access', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_TRAINING_PHISING_SYS_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_TRAINING_PHISING_SYS_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiTrainingPhisingSysOwnerTestEmail(),
        csiTrainingPhisingSysOwnerTestPassword(),
      );
    });

    test('SB-056', async ({ csiSalesAndBillingPage }) => {
      await csiSalesAndBillingPage.expectSb056TrainingAndPhishingNavVisible();
      await csiSalesAndBillingPage.navigateSb056TrainingPhishingThenAccountManagement();
      await csiSalesAndBillingPage.expectSb056RestrictedHubModulesNotVisible();
    });
  });

  test.describe('SB-057 custom org white-label branding', () => {
    test.use({ viewport: SB057_VIEWPORT });

    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_CUSTOM_ORG_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_CUSTOM_ORG_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiCustomOrgOwnerTestEmail(),
        csiCustomOrgOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('SB-057', async ({ csiSalesAndBillingPage }) => {
      await csiSalesAndBillingPage.waitSb057PostLoginSettle();
      await csiSalesAndBillingPage.expectSb057LogosVisible();

      const orgSlug = sb057OrgFileSlug();
      const logoCompareOptions = {
        maxDiffPixelRatio: SB057_LOGO_MAX_DIFF_PIXEL_RATIO,
        timeout: 30_000,
      };

      await expect(csiSalesAndBillingPage.sb057WelcomeCardOrgLogo()).toHaveScreenshot(
        sb057LogoSnapshotName(orgSlug, 'welcome'),
        logoCompareOptions,
      );

      if ((await csiSalesAndBillingPage.sb057VisibleOrgLogoImages().count()) >= 2) {
        await expect(csiSalesAndBillingPage.sb057HeaderOrgLogo()).toHaveScreenshot(
          sb057LogoSnapshotName(orgSlug, 'header'),
          logoCompareOptions,
        );
      }

      await assertSb057ThemeMatchesBaseline(csiSalesAndBillingPage.page, orgSlug);
    });
  });
});
