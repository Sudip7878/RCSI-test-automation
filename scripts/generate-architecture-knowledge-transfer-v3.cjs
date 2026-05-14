/**
 * Generates architecture/Knowledge_Transfer_v3.docx — CSI regression KT with ordered steps from spec + key page flows.
 * Run from repo root: node scripts/generate-architecture-knowledge-transfer-v3.cjs
 */
const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');

const outDir = path.join(__dirname, '..', 'architecture');
const outFile = path.join(outDir, 'Knowledge_Transfer_v3.docx');

function p(text, opts = {}) {
  return new Paragraph({ children: [new TextRun({ text, ...opts })], ...opts });
}

function labeled(label, value) {
  return new Paragraph({
    children: [
      new TextRun({ text: label, bold: true }),
      new TextRun({ text: value }),
    ],
  });
}

function h3(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_3 });
}

/** Numbered steps from test / page implementation (plain text for GPT QnA). */
function numberedSteps(steps) {
  return steps.map(
    (t, i) =>
      new Paragraph({
        children: [new TextRun(`${i + 1}. ${t}`)],
        spacing: { after: 100 },
      }),
  );
}

const intro = [
  new Paragraph({
    text: 'CSI-QA-testing — Knowledge Transfer v3',
    heading: HeadingLevel.TITLE,
  }),
  p('Purpose: retrieval-friendly map of Playwright tests — file locations, credentials, ordered steps as implemented in test code (and PH-024 wizard detail from PhisingPage.ts), plus outcomes.'),
  p('Repository: tests/csi, pages/csi, utils/csi, fixtures/csi/testSetup.ts, recorded-steps/.'),
  new Paragraph({ text: 'Shared conventions', heading: HeadingLevel.HEADING_1 }),
  labeled(
    'Fixtures: ',
    'fixtures/csi/testSetup.ts — csiLoginPage, csiTrainingPage, csiPhisingPage, csiPolicyManagementPage, csiItAssetManagementPage, csiSalesAndBillingPage, csiAccountManagementPage, csiIncidentReportPage.',
  ),
  labeled('Base URL: ', 'CSI_BASE_URL (.env.example).'),
  labeled('Credentials: ', 'utils/csi/credentials.ts — env vars; passwords not committed.'),
  labeled('Recorded steps: ', 'recorded-steps/<Area>/ for human-readable parallels.'),
  new Paragraph({
    text: 'Tests in this document',
    heading: HeadingLevel.HEADING_1,
  }),
  p('TR-025, SB-056, TR-033, PH-020, PH-024, PM-016, PM-024, PM-026, IA-003, IA-011, IA-016, IA-025.'),
  p('Ordered steps follow each test() body top-to-bottom. In specs, each line is typically await <fixture>.<method>(...). PM-* steps below spell out await and const where the spec does.'),
];

const tests = [
  {
    title: 'TR-025 — Training Admin generates completion report',
    spec: 'tests/csi/training/Training.spec.ts — describe "TR-025 Course report PDF export" (inside "CSI_TEST user flows").',
    page: 'pages/csi/TrainingPage.ts',
    login: 'beforeEach: CSI_TEST_EMAIL / CSI_TEST_PASSWORD (skip if CSI_TEST_PASSWORD unset). Suite timeout 180_000.',
    steps: [
      'await csiLoginPage.gotoLogin()',
      'await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword())',
      'await csiLoginPage.expectOnHome()',
      'await csiTrainingPage.openCourseReport()',
      'const pdf = await csiTrainingPage.downloadCourseReportPdf()',
    ],
    assertions: [
      'expect(pdf.length).toBeGreaterThan(512)',
      'expect(pdf.subarray(0, 8).toString("latin1").startsWith("%PDF")).toBe(true)',
    ],
  },
  {
    title: 'SB-056 — Org hub module access (restricted user)',
    spec: 'tests/csi/salesAndBilling/SalesAndBilling.spec.ts — describe "SB-056 restricted hub module access".',
    page: 'pages/csi/SalesAndBillingPage.ts',
    login:
      'beforeEach only: CSI_TRAINING_PHISING_SYS_OWNER_TEST_EMAIL / CSI_TRAINING_PHISING_SYS_OWNER_TEST_PASSWORD (skip if unset). No CSI_TEST beforeEach for this describe.',
    steps: [
      'await csiLoginPage.gotoLogin()',
      'await csiLoginPage.signInWithEmailAndPassword(csiTrainingPhisingSysOwnerTestEmail(), csiTrainingPhisingSysOwnerTestPassword())',
      'await csiSalesAndBillingPage.expectSb056TrainingAndPhishingNavVisible()',
      'await csiSalesAndBillingPage.navigateSb056TrainingPhishingThenAccountManagement()',
      'await csiSalesAndBillingPage.expectSb056RestrictedHubModulesNotVisible()',
    ],
    assertions: [
      'Restricted hub user sees Training + Phishing + Account Management path; disallowed modules (e.g. Sales & Billing) stay absent — see page implementation for exact locators.',
    ],
  },
  {
    title: 'TR-033 — Manager views group progress on dashboard',
    spec: 'tests/csi/training/Training.spec.ts — describe "TR-033 course dashboard manager view".',
    page: 'pages/csi/TrainingPage.ts',
    login:
      'beforeEach: CSI_ORG_TEST_EMAIL / CSI_ORG_TEST_PASSWORD (skip if either unset). Separate from CSI_TEST Training block.',
    steps: [
      'await csiLoginPage.gotoLogin()',
      'await csiLoginPage.signInWithEmailAndPassword(csiOrgTestEmail(), csiOrgTestPassword())',
      'await csiLoginPage.expectOnHome()',
      'await csiTrainingPage.openCourseDashboard()',
      'await csiTrainingPage.switchToManagerViewAndSettle()',
      'await csiTrainingPage.expectTr033ManagerDashboardSectionsVisible()',
    ],
    assertions: ['Manager dashboard sections visible per TrainingPage (see recorded-steps/Training/TR-033.txt).'],
  },
  {
    title: 'PH-020 — Phishing Admin views campaign results',
    spec: 'tests/csi/Phising/Phising.spec.ts — describe "PH-020 phishing dashboard view" under "Phishing admin".',
    page: 'pages/csi/PhisingPage.ts',
    login:
      'beforeEach: CSI_PHISING_ADMIN_TEST_EMAIL / CSI_PHISING_ADMIN_TEST_PASSWORD (skip if unset). Describe kept separate from PH-024 so admin session does not precede CSI_TEST for PH-024.',
    steps: [
      'await csiLoginPage.gotoLogin()',
      'await csiLoginPage.signInWithEmailAndPassword(csiPhisingAdminTestEmail(), csiPhisingAdminTestPassword())',
      'await csiLoginPage.expectOnHome()',
      'await csiPhisingPage.openPhishingDashboard()',
      'await csiPhisingPage.expectPh020PhishingDashboardSectionsVisible()',
    ],
    assertions: ['Dashboard sections/widgets asserted in PhisingPage expectPh020PhishingDashboardSectionsVisible.'],
  },
  {
    title: 'PH-024 — Super Admin creates email template',
    spec: 'tests/csi/Phising/Phising.spec.ts — describe "PH-024 email template creation".',
    page: 'pages/csi/PhisingPage.ts — createAndPublishPh024EmailTemplate',
    login: 'beforeEach: CSI_TEST_EMAIL / CSI_TEST_PASSWORD.',
    steps: [
      'await csiLoginPage.gotoLogin(); await csiLoginPage.signInWithEmailAndPassword(csiTestEmail(), csiTestPassword()); await csiLoginPage.expectOnHome()',
      'const suffix = csiPh024UniqueSuffix()',
      'csiPhisingPage.createAndPublishPh024EmailTemplate({ uniqueSuffix: suffix, landingPageHost: CSI_PH024_LANDING_PAGE_HOST }) — wizard substeps in pages/csi/PhisingPage.ts:',
      '  (a) openPh024NewEmailTemplateEditor()',
      '  (b) Fill display name / subject (regex-named textboxes); check Template content',
      '  (c) Sender email #Input_sender_email; Reply-to textbox',
      '  (d) Rich text iframe contenteditable: fill paragraph text',
      '  (e) Phishing Landing Page tab: HTTPS URL = landingPageHost',
      '  (f) Phishing Training tab → Save & Preview → next',
      '  (g) #Input_name2; sleeps; Location / Category / Language VirtualSelects (data-block) → first visible option each',
      '  (h) Description textarea; next',
      '  (i) Two course dropdown toggles → first visible option each; next',
      '  (j) Publish → expect "Record updated." → expect title with suffix on page',
    ],
    assertions: [
      'Record updated toast; template title visible matching Title{suffixed} pattern.',
      'Spec is one test() call; detailed UI order lives in PhisingPage.ts as above.',
    ],
  },
  {
    title: 'PM-016 — Employee acknowledges compulsory policy',
    spec: 'tests/csi/PolicyManagement/PolicyManagement.spec.ts — describe "PM-016 distribute-now policy...".',
    page: 'pages/csi/PolicyManagementPage.ts',
    login:
      'Root beforeEach on whole file: CSI_TEST_EMAIL / CSI_TEST_PASSWORD. Suite timeout 300_000. Acknowledger = same csiTestEmail().',
    steps: [
      'const unique = csiPolicyUniqueSuffix(); acknowledgerEmail = csiTestEmail(); acknowledgerSearchToken = csiDistributionUserSearchToken(acknowledgerEmail); dueInDays = csiPolicyDistributionDueInDays()',
      'await csiPolicyManagementPage.openPolicyTemplateLibrary()',
      'await csiPolicyManagementPage.cloneFirstPolicyTemplate()',
      'await csiPolicyManagementPage.appendUniqueSuffixToPolicyTitle(unique)',
      'await csiPolicyManagementPage.fillPolicyReferenceNumber(unique)',
      'await csiPolicyManagementPage.selectOwnerSuperAdmin()',
      'const downloadPath = await csiPolicyManagementPage.downloadTemplateTo(os.tmpdir())',
      'const editedPath = csiPolicyManagementPage.buildEditedDocxPath(downloadPath, unique)',
      'await prependLineToDocx({ sourcePath: downloadPath, destPath: editedPath, line: unique })',
      'await csiPolicyManagementPage.uploadEditedDocx(editedPath); await csiPolicyManagementPage.expectDocxUploaded()',
      'await csiPolicyManagementPage.goToNextWizardStep()',
      'await csiPolicyManagementPage.waitForAcknowledgementSection()',
      'await csiPolicyManagementPage.selectAcknowledgementTypeCompulsory()',
      'await csiPolicyManagementPage.checkDistributePolicyNowRadio()',
      'await csiPolicyManagementPage.fillAcknowledgementDurationAndDue(dueInDays)',
      'await csiPolicyManagementPage.selectReviewNotRequiredNo(); await csiPolicyManagementPage.fillReviewDueInDays(dueInDays)',
      'await csiPolicyManagementPage.searchIndividualsAndSelectAcknowledgerUser(acknowledgerEmail, acknowledgerSearchToken)',
      'await csiPolicyManagementPage.publishPolicyFromWizard(); await csiPolicyManagementPage.expectPolicyPublished()',
      'await csiPolicyManagementPage.gotoMyPolicies()',
      'await csiPolicyManagementPage.openToBeAcknowledgedTab(); await csiPolicyManagementPage.waitForAcknowledgementPolicyCardsAfterTab()',
      'await csiPolicyManagementPage.searchMyPoliciesByPolicySuffix(unique)',
      'await csiPolicyManagementPage.clickViewOnFirstMyPoliciesAcknowledgementCard()',
      'await csiPolicyManagementPage.completePolicyAcknowledgementExpectSuccess()',
    ],
    assertions: ['Policy published; acknowledgement completed from MyPolicies for policy searched by suffix.'],
  },
  {
    title: 'PM-024 — Policy Author submits major update',
    spec: 'tests/csi/PolicyManagement/PolicyManagement.spec.ts — describe "PM-024 submit major policy update".',
    page: 'pages/csi/PolicyManagementPage.ts',
    login: 'Root beforeEach: CSI_TEST_EMAIL / CSI_TEST_PASSWORD.',
    steps: [
      'const newSuffix = csiPolicyUniqueSuffix()',
      'await csiPolicyManagementPage.gotoAvotechViewPolicies()',
      'await csiPolicyManagementPage.openPublishedPoliciesTab()',
      'await csiPolicyManagementPage.waitPublishedPoliciesGridSettled()',
      'await csiPolicyManagementPage.sortViewPoliciesByVersionColumn()',
      'await csiPolicyManagementPage.clickFirstPublishedRowUpdateVersionOne()',
      'await csiPolicyManagementPage.clickPolicyTitleBreadcrumbLink()',
      'const previousFull = (await csiPolicyManagementPage.policyTitleInput.inputValue()).trim(); const newFullTitle = replacePolicyTitleLastToken(previousFull, newSuffix)',
      'await csiPolicyManagementPage.policyTitleInput.fill(newFullTitle)',
      'await csiPolicyManagementPage.clickPolicyTitleBreadcrumbLink()',
      'await csiPolicyManagementPage.clickPolicyUpdateWizardNextFirst(); await csiPolicyManagementPage.clickPolicyUpdateWizardNextExact()',
      'await csiPolicyManagementPage.clickSubmitForReReview()',
      'await csiPolicyManagementPage.ensureMajorUpdateRadioChecked()',
      'await csiPolicyManagementPage.clickSubmitAfterReReviewMajorUpdate()',
      'await csiPolicyManagementPage.expectPolicyUpdatedToast()',
    ],
    assertions: ['Stops at Policy Updated toast — no approve/publish/version-2 in PM-024.'],
  },
  {
    title: 'PM-026 — Owner approves major update (version 2 on grid)',
    spec: 'tests/csi/PolicyManagement/PolicyManagement.spec.ts — describe "PM-026 policy update approval from Published Policies".',
    page: 'pages/csi/PolicyManagementPage.ts',
    login: 'Root beforeEach: CSI_TEST_EMAIL / CSI_TEST_PASSWORD.',
    steps: [
      'const newSuffix = csiPolicyUniqueSuffix()',
      'await csiPolicyManagementPage.gotoAvotechViewPolicies(); await csiPolicyManagementPage.openPublishedPoliciesTab(); await csiPolicyManagementPage.waitPublishedPoliciesGridSettled(); await csiPolicyManagementPage.sortViewPoliciesByVersionColumn()',
      'await csiPolicyManagementPage.clickFirstPublishedRowUpdateVersionOne()',
      'await csiPolicyManagementPage.clickPolicyTitleBreadcrumbLink()',
      'const previousFull = (await csiPolicyManagementPage.policyTitleInput.inputValue()).trim(); const newFullTitle = replacePolicyTitleLastToken(previousFull, newSuffix); await csiPolicyManagementPage.policyTitleInput.fill(newFullTitle); await csiPolicyManagementPage.clickPolicyTitleBreadcrumbLink()',
      'await csiPolicyManagementPage.clickPolicyUpdateWizardNextFirst(); await csiPolicyManagementPage.clickPolicyUpdateWizardNextExact()',
      'await csiPolicyManagementPage.clickSubmitForReReview(); await csiPolicyManagementPage.ensureMajorUpdateRadioChecked(); await csiPolicyManagementPage.clickSubmitAfterReReviewMajorUpdate()',
      'await csiPolicyManagementPage.expectPolicyUpdatedToast()',
      'await csiPolicyManagementPage.searchViewPoliciesGrid(newFullTitle); await csiPolicyManagementPage.expectPolicyTitleVisibleInPublishedGrid(newFullTitle)',
      'await csiPolicyManagementPage.openReviewLinkForRowWithPolicyTitle(newFullTitle)',
      'await csiPolicyManagementPage.approvePublishThenSecondPublishExpectApprovalSent()',
      'await csiPolicyManagementPage.searchViewPoliciesGrid(newFullTitle); await csiPolicyManagementPage.expectPolicyTitleVisibleInPublishedGrid(newFullTitle)',
      'await csiPolicyManagementPage.sortViewPoliciesByVersionColumn()',
      'await csiPolicyManagementPage.expectPublishedRowVersionColumnIs(newFullTitle, "2")',
    ],
    assertions: [
      'Published grid shows policy title; version column value "2" for that row after dual publish flow.',
      'Same test file does not run a separate MyPolicies full re-ack after version bump.',
    ],
  },
  {
    title: 'IA-003 — Bulk upload IT assets via template',
    spec: 'tests/csi/ITAssetManagement/ITAssetManagement.spec.ts — describe "IA-003 bulk client machine upload".',
    page: 'pages/csi/ITAssetManagementPage.ts',
    utils: 'utils/csi/itAssetBulkUpload.ts — buildIa003BulkClientMachineWorkbook, saveIa003EditedWorkbookArtifact',
    login: 'IT Asset suite beforeEach: CSI_TEST_EMAIL / CSI_TEST_PASSWORD. Describe timeout 300_000.',
    steps: [
      'const baseNumeric = csiIa003BulkBaseNumeric()',
      'await csiItAssetManagementPage.gotoItAssetManagementClientMachineBulkUrl()',
      'await csiItAssetManagementPage.startBulkUploadAsset()',
      'const downloadedPath = await csiItAssetManagementPage.downloadBulkAssetTemplateTo(os.tmpdir())',
      'Build editedPath: path.join(parsed.dir, `${parsed.name}${baseNumeric}${parsed.ext || ".xlsx"}`) from path.parse(downloadedPath)',
      'const assetNames = buildIa003BulkClientMachineWorkbook({ downloadedTemplatePath: downloadedPath, outputPath: editedPath, baseNumeric })',
      'saveIa003EditedWorkbookArtifact(editedPath)',
      'await csiItAssetManagementPage.uploadBulkCompletedTemplate(editedPath)',
      'await csiItAssetManagementPage.expectBulkTemplateUploadedToast()',
      'await csiItAssetManagementPage.clickBulkUploadContinueWhenEnabled()',
      'for (const assetName of assetNames) { await csiItAssetManagementPage.clickBulkAssetRowByName(assetName); await csiItAssetManagementPage.clickFirstMissingFieldsTag(); await csiItAssetManagementPage.fillBulkAssetPurchaseCostAndSave("100"); await csiItAssetManagementPage.expectBulkAssetRowStatus(assetName, "OK") }',
      'await csiItAssetManagementPage.importBulkAssetsAndExpectClientMachineListUrl()',
    ],
    assertions: ['Import completes and navigation ends on client machine list URL.'],
  },
  {
    title: 'IA-011 — Create Purchase Order with documents and linked assets',
    spec: 'tests/csi/ITAssetManagement/ITAssetManagement.spec.ts — describe "IA-011 purchase order creation".',
    page: 'pages/csi/ITAssetManagementPage.ts',
    utils: 'utils/csi/itAssetPurchaseTestData.ts — PDF paths and filenames',
    login: 'Suite beforeEach CSI_TEST. Describe timeout 300_000.',
    steps: [
      'const purpose = csiItAssetPurchaseOrderPurposeRemark()',
      'await csiItAssetManagementPage.gotoItAssetPurchaseEditUrl()',
      'await csiItAssetManagementPage.fillItAssetPurchasePurpose(purpose)',
      'await csiItAssetManagementPage.pickItAssetPurchaseOrderDateToday()',
      'await csiItAssetManagementPage.selectItAssetPurchaseSupplierByName(csiItAssetSupplier)',
      'await csiItAssetManagementPage.selectPurchaseWizardQuotationTab(); await csiItAssetManagementPage.uploadPurchaseWizardDocument(ia011QuotationPdfPath, ia011QuotationPdfFileName)',
      'await csiItAssetManagementPage.selectPurchaseWizardDeliveryNotesTab(); await csiItAssetManagementPage.uploadPurchaseWizardDocument(ia011DeliveryNotesPdfPath, ia011DeliveryNotesPdfFileName)',
      'await csiItAssetManagementPage.selectPurchaseWizardPurchaseInvoicesTab(); await csiItAssetManagementPage.uploadPurchaseWizardDocument(ia011PurchaseInvoicePdfPath, ia011PurchaseInvoicePdfFileName)',
      'await csiItAssetManagementPage.clickPurchaseWizardNext()',
      'await csiItAssetManagementPage.clickPurchaseWizardSearchAsset()',
      'await csiItAssetManagementPage.selectFirstThreePurchaseWizardAssetRows()',
      'await csiItAssetManagementPage.clickPurchaseWizardNext()',
      'await csiItAssetManagementPage.clickPurchaseWizardCreate()',
      'await csiItAssetManagementPage.expectItAssetPurchaseListWithRemark(purpose)',
    ],
    assertions: ['Purchase list route with purpose/remark visible.'],
  },
  {
    title: 'IA-016 — Edit single desktop asset (name + OS)',
    spec: 'tests/csi/ITAssetManagement/ITAssetManagement.spec.ts — describe "IA-016 edit client machine asset".',
    page: 'pages/csi/ITAssetManagementPage.ts',
    utils: 'utils/csi/itAssetManagementTestData.ts — csiItAssetIa016EditedDisplayName, csiItAssetIncrementOsVersionString, csiItAssetUniqueNumeric',
    login: 'Suite beforeEach CSI_TEST.',
    steps: [
      'const uniqueNumeric = csiItAssetUniqueNumeric()',
      'await csiItAssetManagementPage.gotoItAssetManagementClientMachineDesktopListUrl()',
      'await csiItAssetManagementPage.clickDesktopComputersExpectClientMachineGrid()',
      'await csiItAssetManagementPage.clickEditOnFirstClientMachineAssetRow()',
      'await csiItAssetManagementPage.expectItAssetEditFormReady()',
      'const currentName = await csiItAssetManagementPage.readItAssetEditFormAssetName(); const newName = csiItAssetIa016EditedDisplayName(currentName, uniqueNumeric)',
      'const currentOs = await csiItAssetManagementPage.readItAssetEditFormOsVersion(); const newOs = csiItAssetIncrementOsVersionString(currentOs)',
      'await csiItAssetManagementPage.fillItAssetEditFormAssetName(newName); await csiItAssetManagementPage.fillItAssetEditFormOsVersion(newOs)',
      'await csiItAssetManagementPage.saveNewAsset()',
      'await csiItAssetManagementPage.expectClientMachineGridCellVisibleExact(newName)',
      'await csiItAssetManagementPage.expectClientMachineGridRowShowsOsVersionForAsset(newName, newOs)',
    ],
    assertions: [
      'Desktop Wijmo grid: .datagrid-runtime (IA-016 path). OS assertion uses horizontal scroll; do not click OS Version header for sorting.',
    ],
  },
  {
    title: 'IA-025 — Create asset, assign user on edit, verify on View',
    spec: 'tests/csi/ITAssetManagement/ITAssetManagement.spec.ts — describe "IA-025 create then edit client machine with user and view".',
    page: 'pages/csi/ITAssetManagementPage.ts',
    utils: 'Same test data helpers as IA-001 + IA-016; User via selectFirstUserOnItAssetEditFormIa025 (3s wait before opening User VirtualSelect in page).',
    login: 'Suite beforeEach CSI_TEST. Describe timeout 300_000.',
    steps: [
      'const uniqueNumeric = csiItAssetUniqueNumeric(); const displayName = csiItAssetDisplayName(uniqueNumeric); const modelNumber = uniqueNumeric; const serialNumber = csiItAssetSerialFromModelNumber(modelNumber)',
      'await csiItAssetManagementPage.openClientMachineList(); await csiItAssetManagementPage.startAddAsset(); await csiItAssetManagementPage.selectCategoryDesktopComputers()',
      'await csiItAssetManagementPage.fillAssetIdentity({ displayName, modelNumber, serialNumber, osVersion: csiItAssetOsVersion(), ipAddress: csiItAssetIpAddress() })',
      'await csiItAssetManagementPage.fillAssetStateAndLocation({ location: csiItAssetLocation() })',
      'await csiItAssetManagementPage.fillSupplierAndCommercial({ website: csiItAssetWebsite(), purchaseCost: csiItAssetPurchaseCost() })',
      'await csiItAssetManagementPage.pickPurchaseDateToday(); await csiItAssetManagementPage.pickWarrantyOrEndDateOneMonthFromToday()',
      'await csiItAssetManagementPage.saveNewAsset()',
      'await csiItAssetManagementPage.expectAssetVisibleInGridAfterAcquisitionSort(displayName)',
      'await csiItAssetManagementPage.gotoItAssetManagementClientMachineDesktopListUrl(); await csiItAssetManagementPage.clickDesktopComputersExpectClientMachineGrid()',
      'await csiItAssetManagementPage.clickEditOnClientMachineGridRowByAssetNameIa025(displayName)',
      'await csiItAssetManagementPage.expectItAssetEditFormReady()',
      'const currentName = await csiItAssetManagementPage.readItAssetEditFormAssetName(); const newName = csiItAssetIa016EditedDisplayName(currentName, uniqueNumeric)',
      'const currentOs = await csiItAssetManagementPage.readItAssetEditFormOsVersion(); const newOs = csiItAssetIncrementOsVersionString(currentOs)',
      'await csiItAssetManagementPage.fillItAssetEditFormAssetName(newName); await csiItAssetManagementPage.fillItAssetEditFormOsVersion(newOs)',
      'const assignedUserLabel = await csiItAssetManagementPage.selectFirstUserOnItAssetEditFormIa025()',
      'await csiItAssetManagementPage.saveNewAsset()',
      'await csiItAssetManagementPage.expectClientMachineGridRowShowsOsVersionForAssetAfterAcquisitionSortIa025(newName, newOs)',
      'await csiItAssetManagementPage.gotoItAssetManagementClientMachineDesktopListUrl(); await csiItAssetManagementPage.clickDesktopComputersExpectClientMachineGrid()',
      'await csiItAssetManagementPage.clickViewOnClientMachineGridRowByAssetNameIa025(newName)',
      'await csiItAssetManagementPage.expectItAssetViewShowsTextIa025(assignedUserLabel)',
    ],
    assertions: [
      'Create path matches IA-001 grid assertion; desktop list uses acquisition + row match by name for Edit/View; user visible on view screen (substring-friendly locator).',
    ],
  },
];

function buildTestSection(t) {
  const children = [
    new Paragraph({ text: t.title, heading: HeadingLevel.HEADING_2 }),
    labeled('Spec: ', t.spec),
    labeled('Primary page: ', t.page),
  ];
  if (t.utils) {
    children.push(labeled('Utils / data: ', t.utils));
  }
  children.push(labeled('Auth / timeouts: ', t.login));
  children.push(h3('Ordered steps (from test code)'));
  children.push(...numberedSteps(t.steps));
  children.push(h3('Assertions / outcomes'));
  children.push(...numberedSteps(t.assertions));
  return children;
}

const doc = new Document({
  sections: [
    {
      properties: {},
      children: [...intro, ...tests.flatMap(buildTestSection)],
    },
  ],
});

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outFile, buf);
  // eslint-disable-next-line no-console
  console.log('Wrote', outFile);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
