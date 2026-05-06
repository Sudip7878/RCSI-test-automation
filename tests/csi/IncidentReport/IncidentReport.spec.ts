import { test } from '../../../fixtures/csi/testSetup';
import {
  csiIncidentReporterTestEmail,
  csiIncidentReporterTestPassword,
} from '../../../utils/csi/credentials';
import { csiIncidentAffectedSystems, csiIncidentDescription } from '../../../utils/csi/incidentReportTestData';

test.describe('CSI · Incident Report', () => {
  test.describe.configure({ timeout: 180_000 });

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
