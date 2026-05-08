import { test } from '../../../fixtures/csi/testSetup';
import { csiTestEmail, csiTestPassword } from '../../../utils/csi/credentials';
import { writeInvoiceCompareDebugJsonFiles } from '../../../utils/csi/invoiceCompareDebugLog';
import {
  assertInvoicePdfSubsetOfPreviewTemplate,
  extractInvoicePdfText,
  previewKeyValuesToCompareJson,
} from '../../../utils/csi/invoicePdfPreviewCompare';
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
  csiUniquePackageName,
  csiUniqueSalesPartnerName,
  csiUniqueTimestampSuffix,
} from '../../../utils/csi/salesAndBillingTestData';

test.describe('CSI · Sales and Billing', () => {
  test.describe.configure({ timeout: 180_000 });

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

  test.describe('Navigate to Sales Order and create sales order', () => {
    test('Navigate to Sales Order and create sales order', async ({
      csiSalesAndBillingPage,
    }) => {
      const duration = csiSalesOrderDuration();
      const unitsPerModule = csiSalesOrderUnitsPerModule();

      await csiSalesAndBillingPage.openSalesAndBilling();
      await csiSalesAndBillingPage.openSalesOrder();
      await csiSalesAndBillingPage.clickAddSalesOrder();

      const salesOrderDropdownMaxAttempts = 4;
      await csiSalesAndBillingPage.waitForSalesOrderDropdownToSettle();
      await csiSalesAndBillingPage.selectLastOptionByTriggerText(
        'Select Client',
        salesOrderDropdownMaxAttempts,
      );
      await csiSalesAndBillingPage.waitForSalesOrderDropdownToSettle();

      await csiSalesAndBillingPage.selectFirstOptionByTriggerText(
        'Select Sales Partner',
        salesOrderDropdownMaxAttempts,
      );
      await csiSalesAndBillingPage.waitForSalesOrderDropdownToSettle();

      await csiSalesAndBillingPage.selectFirstBillingPartnerOption(salesOrderDropdownMaxAttempts);
      await csiSalesAndBillingPage.waitForSalesOrderDropdownToSettle();

      await csiSalesAndBillingPage.selectFirstOptionByTriggerText(
        'Select Package Type',
        salesOrderDropdownMaxAttempts,
      );
      await csiSalesAndBillingPage.waitForSalesOrderDropdownToSettle();

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
