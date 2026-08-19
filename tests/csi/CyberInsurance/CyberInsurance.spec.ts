import { test } from '../../../fixtures/csi/testSetup';
import {
  csiPenetrationTesterTestEmail,
  csiPenetrationTesterTestPassword,
  csiTrainingPhisingSysOwnerTestEmail,
  csiTrainingPhisingSysOwnerTestPassword,
} from '../../../utils/csi/credentials';
import {
  csiCyberInsuranceAddress,
  csiCyberInsuranceBusinessDescription,
} from '../../../utils/csi/cyberInsuranceTestData';
import { utcDateBasedNumber } from '../../../utils/dateUtils';

test.describe('CSI · Cyber Insurance', () => {
  test.describe.configure({ timeout: 300_000 });

  test.describe('CI-001 — apply for cyber insurance', () => {
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
      await csiLoginPage.expectOnAccountManagement();
    });

    test('CI-001', async ({ csiCyberInsurancePage }) => {
      const uniqueNumeric = utcDateBasedNumber();

      await csiCyberInsurancePage.openCyberInsurance();
      await csiCyberInsurancePage.submitInsuranceApplication({
        businessDescription: csiCyberInsuranceBusinessDescription(uniqueNumeric),
        address: csiCyberInsuranceAddress(uniqueNumeric),
      });
    });
  });

  test.describe('CI-002 — System Owner submits insurance application', () => {
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
      await csiLoginPage.expectOnHome();
    });

    test('CI-002', async ({ csiCyberInsurancePage }) => {
      const uniqueNumeric = utcDateBasedNumber();

      await csiCyberInsurancePage.openCyberInsurance();
      await csiCyberInsurancePage.submitInsuranceApplication({
        businessDescription: csiCyberInsuranceBusinessDescription(uniqueNumeric),
        address: csiCyberInsuranceAddress(uniqueNumeric),
      });
    });
  });
});
