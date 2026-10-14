import { test } from '../../../fixtures/csi/testSetup';
import { csiAccountManagementFirstName, csiAccountManagementLastName, } from '../../../utils/csi/accountManagementTestData';
import { SignUpDetails } from '../../../data/csi/SignUpWithWeakPassword.json';
import { randomEmail, orgNameBoundaryScenarios } from '../../../utils/csi/am008OrganizationTestData';

for (const { label, orgName, expected } of orgNameBoundaryScenarios) {
    test(`AM-008: Organization Name Boundary Length -: ${label}`, async ({ csiSignupPage }) => {
        await csiSignupPage.gotoSignup();
        await csiSignupPage.enterEmail(randomEmail());

        await csiSignupPage.fillSignupDetails(
            csiAccountManagementFirstName(),
            csiAccountManagementLastName(),
            orgName(),
            'Banking',
            SignUpDetails.PhoneNumber,
            'English',
            '123qweQWE!@#'
        );

        if (expected === 'truncated') {
            await csiSignupPage.expectOrganizationNameLength(50);
        }

        await csiSignupPage.clickCreateAccount();
        if (expected === 'missing-fields') {
            await csiSignupPage.expectMissingFieldsToast();
        } else {
            await csiSignupPage.expectAccountCreationSuccess();
        }
    });
};

