import { test } from '../../../fixtures/csi/testSetup';
import { SignUpDetails } from '../../../data/csi/SignUpWithWeakPassword.json';

const orgNameBoundaryScenarios = [
    { label: 'minimum length (1 character)', orgName: 'z' },
    { label: 'maximum length (100 characters)', orgName: 'z'.repeat(100) },
    { label: 'exceeding maximum length (101 characters)', orgName: 'z'.repeat(101) }
];

for (const { label, orgName } of orgNameBoundaryScenarios) {
    test(`should validate organization name behavior for: ${label}`, async ({ csiSignupPage }) => {
        await csiSignupPage.gotoSignup();
        await csiSignupPage.enterEmail(SignUpDetails.testEmail);

        await csiSignupPage.fillSignupDetails(
            SignUpDetails.FirstName,
            SignUpDetails.LastName,
            orgName,
            'Banking',
            SignUpDetails.PhoneNumber,
            'English',
            '123qweQWE!@#'
        );

        await csiSignupPage.clickCreateAccount();
        await csiSignupPage.expectAccountCreationSuccess();
    })
};

