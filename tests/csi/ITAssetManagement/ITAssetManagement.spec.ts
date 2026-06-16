import * as os from 'os';
import * as path from 'path';
import { expect, test } from '../../../fixtures/csi/testSetup';
import {
  csiOrgASystemOwnerTestEmail,
  csiOrgASystemOwnerTestPassword,
  csiOrgBSystemOwnerTestEmail,
  csiOrgBSystemOwnerTestPassword,
  csiItAssetManagerTestEmail,
  csiItAssetManagerTestPassword,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
  csiTestEmail,
  csiTestPassword,
} from '../../../utils/csi/credentials';
import {
  buildIa003BulkClientMachineWorkbook,
  csiIa003BulkBaseNumeric,
  saveIa003EditedWorkbookArtifact,
} from '../../../utils/csi/itAssetBulkUpload';
import {
  csiOrgAAssetFormId,
  csiOrgBAssetFormId,
  csiItAssetDisplayName,
  csiItAssetIa016EditedDisplayName,
  csiItAssetIncrementOsVersionString,
  csiItAssetIpAddress,
  csiItAssetLocation,
  csiItAssetOsVersion,
  csiItAssetPurchaseCost,
  csiItAssetSerialFromModelNumber,
  csiItAssetStateLabelDisposed,
  csiItAssetStateLabelExpired,
  csiItAssetStateLabelInRepair,
  csiItAssetStateLabelInStore,
  csiItAssetStateLabelInUse,
  csiItAssetSupplier,
  csiItAssetUniqueNumeric,
  csiItAssetWebsite,
} from '../../../utils/csi/itAssetManagementTestData';
import {
  csiItAssetPurchaseOrderPurposeRemark,
  ia011DeliveryNotesPdfFileName,
  ia011DeliveryNotesPdfPath,
  ia011PurchaseInvoicePdfFileName,
  ia011PurchaseInvoicePdfPath,
  ia011QuotationPdfFileName,
  ia011QuotationPdfPath,
} from '../../../utils/csi/itAssetPurchaseTestData';

test.describe('CSI · IT Asset Management', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ csiLoginPage }) => {
    if (!process.env.CSI_TEST_PASSWORD?.length) {
      test.skip();
      return;
    }

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword());
    await csiLoginPage.expectOnHome();
  });

  test.describe('IA-001 add client machine asset', () => {
    test('IA-001', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();
      const displayName = csiItAssetDisplayName(uniqueNumeric);
      const modelNumber = uniqueNumeric;
      const serialNumber = csiItAssetSerialFromModelNumber(modelNumber);

      await csiItAssetManagementPage.openClientMachineList();
      await csiItAssetManagementPage.startAddAsset();
      await csiItAssetManagementPage.selectCategoryDesktopComputers();

      const identityParams = {
        displayName,
        modelNumber,
        serialNumber,
        osVersion: csiItAssetOsVersion(),
        ipAddress: csiItAssetIpAddress(),
      };
      await csiItAssetManagementPage.fillAssetIdentity(identityParams);

      await csiItAssetManagementPage.fillAssetStateAndLocation(
        { location: csiItAssetLocation() },
        identityParams,
      );

      await csiItAssetManagementPage.fillSupplierAndCommercial(
        {
          website: csiItAssetWebsite(),
          purchaseCost: csiItAssetPurchaseCost(),
        },
        identityParams,
      );

      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectAssetVisibleInGridAfterAcquisitionSort(displayName);
    });
  });

  /**
   * IA-020: create (In Store) → view/assert → edit from view → state chain with grid pagination finder
   * (recorded-steps/ITAssetManagement/IA-020.txt). Suite `beforeEach` login.
   */
  test.describe('IA-020 client machine asset state lifecycle', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-020', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();
      const displayName = csiItAssetDisplayName(uniqueNumeric);
      const modelNumber = uniqueNumeric;
      const serialNumber = csiItAssetSerialFromModelNumber(modelNumber);

      await csiItAssetManagementPage.openClientMachineList();
      await csiItAssetManagementPage.startAddAssetIa020();
      await csiItAssetManagementPage.selectCategoryDesktopComputersIa020();

      const identityParams = {
        displayName,
        modelNumber,
        serialNumber,
        osVersion: csiItAssetOsVersion(),
        ipAddress: csiItAssetIpAddress(),
      };
      await csiItAssetManagementPage.fillAssetIdentityIa020(identityParams);

      await csiItAssetManagementPage.fillAssetStateAndLocationUsingStateOptionIa020(
        {
          location: csiItAssetLocation(),
          stateOptionName: csiItAssetStateLabelInStore,
        },
        identityParams,
      );

      await csiItAssetManagementPage.fillSupplierAndCommercialIa020(
        {
          website: csiItAssetWebsite(),
          purchaseCost: csiItAssetPurchaseCost(),
        },
        identityParams,
      );

      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();
      await csiItAssetManagementPage.openClientMachineList();

      await csiItAssetManagementPage.expectClientMachineAutogenerateGridShowsAssetName(displayName);

      await csiItAssetManagementPage.clickViewOnClientMachineAutogenerateGridRowByAssetName(displayName);
      await csiItAssetManagementPage.expectItAssetDetailViewShowsAssetState(csiItAssetStateLabelInStore);

      const stateTransitions: readonly string[] = [
        csiItAssetStateLabelInUse,
        csiItAssetStateLabelInRepair,
        csiItAssetStateLabelInUse,
        csiItAssetStateLabelDisposed,
      ];

      for (const nextState of stateTransitions) {
        await csiItAssetManagementPage.clickEditOnItAssetViewPage();
        await csiItAssetManagementPage.expectItAssetEditFormReady();
        await csiItAssetManagementPage.selectAssetStateOnItAssetEditForm(nextState);
        await csiItAssetManagementPage.saveNewAsset();
        await csiItAssetManagementPage.openClientMachineList();
        await csiItAssetManagementPage.clickViewOnClientMachineAutogenerateGridRowByAssetName(displayName);
        await csiItAssetManagementPage.expectItAssetDetailViewShowsAssetState(nextState);
      }

      const uniqueNumeric2 = csiItAssetUniqueNumeric();
      const displayName2 = csiItAssetDisplayName(uniqueNumeric2);
      const modelNumber2 = uniqueNumeric2;
      const serialNumber2 = csiItAssetSerialFromModelNumber(modelNumber2);

      await csiItAssetManagementPage.openClientMachineList();
      await csiItAssetManagementPage.startAddAssetIa020();
      await csiItAssetManagementPage.selectCategoryDesktopComputersIa020();

      const identityParams2 = {
        displayName: displayName2,
        modelNumber: modelNumber2,
        serialNumber: serialNumber2,
        osVersion: csiItAssetOsVersion(),
        ipAddress: csiItAssetIpAddress(),
      };
      await csiItAssetManagementPage.fillAssetIdentityIa020(identityParams2);

      await csiItAssetManagementPage.fillAssetStateAndLocationUsingStateOptionIa020(
        {
          location: csiItAssetLocation(),
          stateOptionName: csiItAssetStateLabelExpired,
        },
        identityParams2,
      );

      await csiItAssetManagementPage.fillSupplierAndCommercialIa020(
        {
          website: csiItAssetWebsite(),
          purchaseCost: csiItAssetPurchaseCost(),
        },
        identityParams2,
      );

      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();
      await csiItAssetManagementPage.openClientMachineList();

      await csiItAssetManagementPage.expectClientMachineAutogenerateGridShowsAssetName(displayName2);
      await csiItAssetManagementPage.clickViewOnClientMachineAutogenerateGridRowByAssetName(displayName2);
      await csiItAssetManagementPage.expectItAssetDetailViewShowsAssetState(csiItAssetStateLabelExpired);
    });
  });

  /**
   * IA-003: bulk XLSX → per-row Purchase Cost → Import (see recorded-steps/ITAssetManagement/IA-003/IA-003.txt).
   */
  test.describe('IA-003 bulk client machine upload', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-003', async ({ csiItAssetManagementPage }) => {
      const baseNumeric = csiIa003BulkBaseNumeric();

      await csiItAssetManagementPage.gotoItAssetManagementClientMachineBulkUrl();
      await csiItAssetManagementPage.startBulkUploadAssetIa003();
      const downloadedPath = await csiItAssetManagementPage.downloadBulkAssetTemplateIa003(os.tmpdir());
      const parsed = path.parse(downloadedPath);
      const editedPath = path.join(parsed.dir, `${parsed.name}${baseNumeric}${parsed.ext || '.xlsx'}`);
      const assetNames = buildIa003BulkClientMachineWorkbook({
        downloadedTemplatePath: downloadedPath,
        outputPath: editedPath,
        baseNumeric,
      });
      saveIa003EditedWorkbookArtifact(editedPath);

      await csiItAssetManagementPage.uploadBulkCompletedTemplateIa003(editedPath);
      await csiItAssetManagementPage.clickBulkUploadContinueWhenEnabled();

      for (const assetName of assetNames) {
        await csiItAssetManagementPage.fixBulkAssetMissingPurchaseCostIa003(assetName, '100');
      }

      await csiItAssetManagementPage.importBulkAssetsIa003();
    });
  });

  /**
   * IA-011: purchase order wizard — purpose, date, supplier, three PDFs, assets, Create
   * (recorded-steps/ITAssetManagement/IA-011.txt). Same login as suite `beforeEach`.
   */
  test.describe('IA-011 purchase order creation', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-011', async ({ csiItAssetManagementPage }) => {
      const purpose = csiItAssetPurchaseOrderPurposeRemark();

      await csiItAssetManagementPage.gotoItAssetPurchaseEditUrl();
      await csiItAssetManagementPage.fillItAssetPurchasePurpose(purpose);
      await csiItAssetManagementPage.pickItAssetPurchaseOrderDateToday();
      await csiItAssetManagementPage.selectItAssetPurchaseSupplierByName(csiItAssetSupplier);
      await csiItAssetManagementPage.selectPurchaseWizardQuotationTab();
      await csiItAssetManagementPage.uploadPurchaseWizardDocument(ia011QuotationPdfPath, ia011QuotationPdfFileName);
      await csiItAssetManagementPage.selectPurchaseWizardDeliveryNotesTab();
      await csiItAssetManagementPage.uploadPurchaseWizardDocument(
        ia011DeliveryNotesPdfPath,
        ia011DeliveryNotesPdfFileName,
      );
      await csiItAssetManagementPage.selectPurchaseWizardPurchaseInvoicesTab();
      await csiItAssetManagementPage.uploadPurchaseWizardDocument(
        ia011PurchaseInvoicePdfPath,
        ia011PurchaseInvoicePdfFileName,
      );
      await csiItAssetManagementPage.clickPurchaseWizardNext();
      await csiItAssetManagementPage.clickPurchaseWizardSearchAsset();
      await csiItAssetManagementPage.selectFirstThreePurchaseWizardAssetRows();
      await csiItAssetManagementPage.clickPurchaseWizardNext();
      await csiItAssetManagementPage.clickPurchaseWizardCreate();
      await csiItAssetManagementPage.expectItAssetPurchaseListWithRemark(purpose);
    });
  });

  /**
   * IA-016: edit first desktop row — asset name + OS version; grid assertions (IA-016.txt).
   */
  test.describe('IA-016 edit client machine asset', () => {
    test('IA-016', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();

      await csiItAssetManagementPage.gotoItAssetManagementClientMachineDesktopListUrl();
      await csiItAssetManagementPage.clickDesktopComputersExpectClientMachineGrid();
      await csiItAssetManagementPage.clickEditOnFirstClientMachineAssetRow();
      await csiItAssetManagementPage.expectItAssetEditFormReady();

      const currentName = await csiItAssetManagementPage.readItAssetEditFormAssetName();
      const newName = csiItAssetIa016EditedDisplayName(currentName, uniqueNumeric);
      const currentOs = await csiItAssetManagementPage.readItAssetEditFormOsVersion();
      const newOs = csiItAssetIncrementOsVersionString(currentOs);

      await csiItAssetManagementPage.fillItAssetEditFormAssetName(newName);
      await csiItAssetManagementPage.fillItAssetEditFormOsVersion(newOs);
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectClientMachineGridCellVisibleExact(newName);
      await csiItAssetManagementPage.expectClientMachineGridRowShowsOsVersionForAsset(newName, newOs);
    });
  });

  /**
   * IA-025: create client machine (IA-001) → desktop list → edit same row by Asset Name (IA-016-style),
   * assign first User → View row and assert User visible (recorded-steps/ITAssetManagement/IA-025.txt).
   * Single login: suite `beforeEach`.
   */
  test.describe('IA-025 create then edit client machine with user and view', () => {
    test.describe.configure({ timeout: 300_000 });

    test('IA-025', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();
      const displayName = csiItAssetDisplayName(uniqueNumeric);
      const modelNumber = uniqueNumeric;
      const serialNumber = csiItAssetSerialFromModelNumber(modelNumber);

      await csiItAssetManagementPage.openClientMachineList();
      await csiItAssetManagementPage.startAddAsset();
      await csiItAssetManagementPage.selectCategoryDesktopComputers();

      const identityParams = {
        displayName,
        modelNumber,
        serialNumber,
        osVersion: csiItAssetOsVersion(),
        ipAddress: csiItAssetIpAddress(),
      };
      await csiItAssetManagementPage.fillAssetIdentity(identityParams);

      await csiItAssetManagementPage.fillAssetStateAndLocation(
        { location: csiItAssetLocation() },
        identityParams,
      );

      await csiItAssetManagementPage.fillSupplierAndCommercial(
        {
          website: csiItAssetWebsite(),
          purchaseCost: csiItAssetPurchaseCost(),
        },
        identityParams,
      );

      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectAssetVisibleInGridAfterAcquisitionSort(displayName);

      await csiItAssetManagementPage.gotoItAssetManagementClientMachineDesktopListUrl();
      await csiItAssetManagementPage.clickDesktopComputersExpectClientMachineGrid();
      await csiItAssetManagementPage.clickEditOnClientMachineGridRowByAssetNameIa025(displayName);
      await csiItAssetManagementPage.expectItAssetEditFormReady();

      const currentName = await csiItAssetManagementPage.readItAssetEditFormAssetName();
      const newName = csiItAssetIa016EditedDisplayName(currentName, uniqueNumeric);
      const currentOs = await csiItAssetManagementPage.readItAssetEditFormOsVersion();
      const newOs = csiItAssetIncrementOsVersionString(currentOs);

      await csiItAssetManagementPage.fillItAssetEditFormAssetName(newName);
      await csiItAssetManagementPage.fillItAssetEditFormOsVersion(newOs);
      const assignedUserLabel = await csiItAssetManagementPage.selectFirstUserOnItAssetEditFormIa025();
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectClientMachineGridRowShowsOsVersionForAssetAfterAcquisitionSortIa025(
        newName,
        newOs,
      );

      await csiItAssetManagementPage.gotoItAssetManagementClientMachineDesktopListUrl();
      await csiItAssetManagementPage.clickDesktopComputersExpectClientMachineGrid();
      await csiItAssetManagementPage.clickViewOnClientMachineGridRowByAssetNameIa025(newName);
      await csiItAssetManagementPage.expectItAssetViewShowsTextIa025(assignedUserLabel);
    });
  });
});

/**
 * IA-008: System Owner adds a client machine asset.
 * Same flow as IA-001 but authenticated as CSI_SYSTEM_OWNER_TEST_EMAIL.
 * (recorded-steps/ITAssetManagement/IA-008.txt)
 */
test.describe('CSI · IT Asset Management — system owner', () => {
  test.describe.configure({ timeout: 180_000 });

  test.beforeEach(async ({ csiLoginPage }) => {
    if (!process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length) {
      test.skip();
      return;
    }

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(csiSystemOwnerTestEmail(), csiSystemOwnerTestPassword());
    await csiLoginPage.expectOnHome();
  });

  test.describe('IA-008 system owner adds client machine asset', () => {
    test('IA-008', async ({ csiItAssetManagementPage }) => {
      const uniqueNumeric = csiItAssetUniqueNumeric();
      const displayName = csiItAssetDisplayName(uniqueNumeric);
      const modelNumber = uniqueNumeric;
      const serialNumber = csiItAssetSerialFromModelNumber(modelNumber);

      await csiItAssetManagementPage.openClientMachineList();
      await csiItAssetManagementPage.startAddAsset();
      await csiItAssetManagementPage.selectCategoryDesktopComputers();

      const identityParams = {
        displayName,
        modelNumber,
        serialNumber,
        osVersion: csiItAssetOsVersion(),
        ipAddress: csiItAssetIpAddress(),
      };
      await csiItAssetManagementPage.fillAssetIdentity(identityParams);

      await csiItAssetManagementPage.fillAssetStateAndLocation(
        { location: csiItAssetLocation() },
        identityParams,
      );

      await csiItAssetManagementPage.fillSupplierAndCommercial(
        {
          website: csiItAssetWebsite(),
          purchaseCost: csiItAssetPurchaseCost(),
        },
        identityParams,
      );

      await csiItAssetManagementPage.pickPurchaseDateToday();
      await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday();
      await csiItAssetManagementPage.saveNewAsset();

      await csiItAssetManagementPage.expectAssetVisibleInGridAfterAcquisitionSort(displayName);
    });
  });
});

/**
 * IA-015: IT Asset Manager edits an existing purchase order.
 * Requires CSI_IT_ASSET_MANAGER_TEST_EMAIL login and CSI_IA015_PURCHASE_PURPOSE to identify the row.
 * (recorded-steps/ITAssetManagement/IA-015.txt)
 */
test.describe('CSI · IT Asset Management — IT asset manager', () => {
  test.describe.configure({ timeout: 300_000 });

  test.beforeEach(async ({ csiLoginPage }) => {
    if (!process.env.CSI_IT_ASSET_MANAGER_TEST_PASSWORD?.length) {
      test.skip();
      return;
    }

    await csiLoginPage.gotoLogin();
    await csiLoginPage.signInWithEmailAndPassword(csiItAssetManagerTestEmail(), csiItAssetManagerTestPassword());
    await csiLoginPage.expectOnHome();
  });

  /**
   * IA-022: IT Asset Manager filters Client Machine grid by Asset State (In Use, Disposed),
   * restores all filters, then sorts by Asset State both ways and verifies the total
   * record count is unchanged after each sort.
   * (recorded-steps/ITAssetManagement/IA-022.txt). Same login as IA-015.
   */
  test.describe('IA-022 filter and sort assets by state', () => {
    test('IA-022', async ({ csiItAssetManagementPage }) => {
      await csiItAssetManagementPage.openClientMachineListViaNav();

      // Capture the unfiltered total immediately after the grid loads — before any
      // scrolling or filtering — so both sort assertions compare against a stable baseline.
      const totalRecordsBefore = await csiItAssetManagementPage.readAssetGridTotalRecordCount();

      // Scroll to Asset State column and confirm it is present in the grid
      await csiItAssetManagementPage.scrollToAndVerifyAssetStateColumnHeader();

      // --- Filter 1: show In Use only ---
      await csiItAssetManagementPage.openAssetStateColumnFilter();
      await csiItAssetManagementPage.applyAssetStateColumnFilter(['In Use']);
      await csiItAssetManagementPage.expectAllVisibleAssetStateCellsMatch('In Use');

      // --- Filter 2: show Disposed only ---
      await csiItAssetManagementPage.openAssetStateColumnFilter();
      await csiItAssetManagementPage.applyAssetStateColumnFilter(['Disposed']);
      await csiItAssetManagementPage.expectAllVisibleAssetStateCellsMatch('Disposed');

      // --- Filter 3: restore all states ---
      await csiItAssetManagementPage.openAssetStateColumnFilter();
      await csiItAssetManagementPage.applyAssetStateColumnFilter(['Disposed', 'Expired', 'In Store', 'In Use']);

      // --- Sort 1: first click → ascending; first row should be Disposed ---
      await csiItAssetManagementPage.clickAssetStateColumnHeaderToSort();
      await csiItAssetManagementPage.expectFirstAssetStateGridCellIs('Disposed');
      expect(
        await csiItAssetManagementPage.readAssetGridTotalRecordCount(),
        'record count must not change after sort 1',
      ).toBe(totalRecordsBefore);

      // --- Sort 2: second click → descending; first row should be In Use ---
      await csiItAssetManagementPage.clickAssetStateColumnHeaderToSort();
      await csiItAssetManagementPage.expectFirstAssetStateGridCellIs('In Use');
      expect(
        await csiItAssetManagementPage.readAssetGridTotalRecordCount(),
        'record count must not change after sort 2',
      ).toBe(totalRecordsBefore);
    });
  });

  /**
   * IA-017: IT Asset Manager selects the first 10 assets on the Desktop Computers tab,
   * opens Bulk Edit, toggles each asset's OS Version between 'Windows 11 24H2' and '11',
   * saves, then verifies each row shows the updated value.
   * (recorded-steps/ITAssetManagement/IA-017.txt). Same login as IA-015 and IA-022.
   */
  test.describe('IA-017 bulk update OS version', () => {
    test('IA-017', async ({ csiItAssetManagementPage }) => {
      await csiItAssetManagementPage.openClientMachineListViaNav();

      // Read first 10 Asset IDs for post-save verification (grid at left scroll, Asset ID column visible)
      const assetIds = await csiItAssetManagementPage.readClientMachineGridFirstNAssetIds(10);

      // Check the row header checkboxes for the first 10 rows
      await csiItAssetManagementPage.selectClientMachineGridFirstNRows(10);

      // Open bulk edit form and wait for all 10 panels to render
      await csiItAssetManagementPage.clickBulkEditAndWaitForForm(10);

      // Toggle OS Version for each of the 10 panels; track new values for assertion
      const newOsVersions = await csiItAssetManagementPage.fillBulkEditOsVersionToggle(10);

      await csiItAssetManagementPage.saveBulkEditAndWaitForGrid();

      // Verify updated OS Version in the grid by row position (same sort order after save)
      await csiItAssetManagementPage.verifyOsVersionForFirstNRows(newOsVersions);
    });
  });

  test.describe('IA-015 edit existing purchase order', () => {
    test('IA-015', async ({ csiItAssetManagementPage }) => {
      await csiItAssetManagementPage.gotoItAssetPurchaseListUrl();

      // Read the first row's state at runtime — Purpose is the runtime identifier for this test run
      const preState = await csiItAssetManagementPage.readFirstPurchaseGridRowState();
      const { purpose } = preState;

      await csiItAssetManagementPage.clickEditOnPurchaseGridRowByPurpose(purpose);
      await csiItAssetManagementPage.waitForPurchaseEditFormReady();

      // Swap supplier by position (1st ↔ 2nd); add options via popup if fewer than 2 exist
      const newSupplierName = await csiItAssetManagementPage.swapPurchaseEditSupplierAndGetNewName();

      // Delete first doc if 3 are present; otherwise upload Test Quotation.pdf
      const newDocCount = await csiItAssetManagementPage.countAndHandlePurchaseDocuments(ia011QuotationPdfPath);

      await csiItAssetManagementPage.clickPurchaseWizardNext();
      await csiItAssetManagementPage.clickPurchaseWizardSearchAsset();
      await csiItAssetManagementPage.selectFirstPurchaseWizardAssetRow();
      await csiItAssetManagementPage.clickPurchaseWizardNext();
      await csiItAssetManagementPage.clickPurchaseWizardSave();

      await csiItAssetManagementPage.expectPurchaseGridRowAfterEdit(
        purpose,
        newSupplierName,
        newDocCount,
        preState.linkedCount + 1,
      );
    });
  });
});

test.describe('CSI · IT Asset Management — org asset isolation', () => {
  test.describe.configure({ timeout: 120_000 });

  /**
   * IA-048: Org A owner cannot open Org B asset view and vice versa.
   * Form ids in `data/csi/itAssetManagement.json` (recorded-steps/ITAssetManagement/IA-048.txt).
   */
  test.describe('IA-048 cross-org ViewAsset access denied', () => {
    test('IA-048', async ({ csiLoginPage, csiItAssetManagementPage }) => {
      if (
        !process.env.CSI_ORG_A_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_A_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_ORG_B_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_ORG_B_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgASystemOwnerTestEmail(),
        csiOrgASystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiItAssetManagementPage.openViewAsset(csiOrgBAssetFormId());
      await csiItAssetManagementPage.expectViewAssetSomethingWentWrong();

      await csiLoginPage.gotoHome();
      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiOrgBSystemOwnerTestEmail(),
        csiOrgBSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiItAssetManagementPage.openViewAsset(csiOrgAAssetFormId());
      await csiItAssetManagementPage.expectViewAssetSomethingWentWrong();
    });
  });
});
