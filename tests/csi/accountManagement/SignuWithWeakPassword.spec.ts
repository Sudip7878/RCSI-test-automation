import { test } from '../../../fixtures/csi/testSetup';
import { SignUpDetails } from '../../../data/csi/SignUpWithWeakPassword.json';
// 1. Define your scenarios with an assertion flag
const weakPasswordScenarios = [
  { label: 'too short (123)', password: '123', shouldShowError: true },
  { label: 'common word (password)', password: 'password', shouldShowError: true },
  { label: '7-character password', password: '1234567', shouldShowError: true },
  { label: 'empty password', password: '', shouldShowError: false }, // <--- Marked as false
];

test.describe('Signup with weak password validations', () => {
  
  // 2. Loop through each scenario to generate individual tests dynamically
  for (const { label, password, shouldShowError } of weakPasswordScenarios) {
    test(`should validate password behavior for: ${label}`, async ({ csiSignupPage }) => {
      
      await csiSignupPage.gotoSignup();
      await csiSignupPage.enterEmail(SignUpDetails.testEmail);

      // Fill form with current password from loop
      await csiSignupPage.fillSignupDetails(
        SignUpDetails.FirstName,
        SignUpDetails.LastName,
        SignUpDetails.OrganizationName,
        'Banking',
        SignUpDetails.PhoneNumber,
        'English',
        password
      );

      // 3. Conditionally check the correct error state based on the scenario
      if (shouldShowError) {
        await csiSignupPage.expectWeakPasswordError();
      } else {
        await csiSignupPage.expectNoPasswordError();
      }
      
    });
  }
});