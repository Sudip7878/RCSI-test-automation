import { test } from '../../../fixtures/csi/testSetup';
import {
  csiIncidentReporterTestEmail,
  csiIncidentReporterTestPassword,
  csiSystemOwnerTestEmail,
  csiSystemOwnerTestPassword,
} from '../../../utils/csi/credentials';
import { csiIncidentAffectedSystems, csiIncidentDescription } from '../../../utils/csi/incidentReportTestData';

test.describe('CSI · Incident Report', () => {
  test.describe.configure({ timeout: 180_000 });

  test.describe('IR-005 — reporter dashboard', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
      if (
        !process.env.CSI_INCIDENT_REPORTER_TEST_PASSWORD?.length ||
        !process.env.CSI_INCIDENT_REPORTER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiIncidentReporterTestEmail(),
        csiIncidentReporterTestPassword(),
      );
      await csiLoginPage.expectOnHome();
    });

    test('IR-005 add new incident from dashboard', async ({ csiIncidentReportPage }) => {
      const description = csiIncidentDescription();
      const affected = csiIncidentAffectedSystems();

      await csiIncidentReportPage.openDashboard();
      await csiIncidentReportPage.startNewIncidentForm();
      await csiIncidentReportPage.fillMandatoryDropdowns();
      await csiIncidentReportPage.fillDescriptionAndAffectedSystems(description, affected);
      await csiIncidentReportPage.saveUntilSuccessVisible();
    });
  });

  test.describe('IR-001 — assign Incident Reporter role', () => {
    test('IR-001 system owner assigns role; reporter reaches dashboard with Add New Incident', async ({
      page,
      csiLoginPage,
      csiAccountManagementPage,
      csiIncidentReportPage,
    }) => {
      if (
        !process.env.CSI_SYSTEM_OWNER_TEST_PASSWORD?.length ||
        !process.env.CSI_SYSTEM_OWNER_TEST_EMAIL?.trim()?.length ||
        !process.env.CSI_INCIDENT_REPORTER_TEST_PASSWORD?.length ||
        !process.env.CSI_INCIDENT_REPORTER_TEST_EMAIL?.trim()?.length
      ) {
        test.skip();
        return;
      }

      const reporterEmail = csiIncidentReporterTestEmail();
      const reporterPassword = csiIncidentReporterTestPassword();

      await csiLoginPage.gotoLogin();
      await csiLoginPage.signInWithEmailAndPassword(
        csiSystemOwnerTestEmail(),
        csiSystemOwnerTestPassword(),
      );
      await csiLoginPage.expectOnHome();

      await csiAccountManagementPage.openUserListWithSearchReady();
      await csiAccountManagementPage.searchUserListByEmail(reporterEmail);
      await csiAccountManagementPage.expectUserGridShowsEmail(reporterEmail);
      await csiAccountManagementPage.openUserRowActionsMenu(reporterEmail);
      await csiAccountManagementPage.openChangeRoleFromActionsMenu();
      await csiAccountManagementPage.ensureIncidentReporterRoleChecked();
      await csiAccountManagementPage.confirmRoleChange();
      await csiAccountManagementPage.expectRecordUpdatedSuccess();

      await csiLoginPage.logoutViaHeaderMenu();
      await csiLoginPage.expectEmailStepVisible();
      await csiLoginPage.gotoLogin();

      await csiLoginPage.signInWithEmailAndPassword(reporterEmail, reporterPassword);
      await csiLoginPage.expectOnHome();

      const incidentResponse = page.getByRole('link', { name: 'Incident Response' });
      await incidentResponse.waitFor({ state: 'visible', timeout: 60_000 });
      await incidentResponse.click();

      await csiIncidentReportPage.openDashboard();
    });
  });
});
