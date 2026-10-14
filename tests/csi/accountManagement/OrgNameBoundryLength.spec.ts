import { test } from '../../../fixtures/csi/testSetup';
import { csiAccountManagementFirstName, csiAccountManagementLastName, } from '../../../utils/csi/accountManagementTestData';
import { csiTestPassword } from '../../../utils/csi/credentials';
import { SignUpDetails } from '../../../data/csi/SignUpWithWeakPassword.json';
import {
    organizationCategory,
    randomEmail,
    orgNameBoundaryScenarios,
    signupLanguage,
} from '../../../utils/csi/am008OrganizationTestData';

for (const { label, orgName, expected } of orgNameBoundaryScenarios) {
    test(`AM-008: Organization Name Boundary Length -: ${label}`, async ({ csiSignupPage }) => {
        test.setTimeout(30_000);
        await csiSignupPage.gotoSignup();
        await csiSignupPage.enterEmail(randomEmail());
        
        await csiSignupPage.fillSignupDetails(
            csiAccountManagementFirstName(),
            csiAccountManagementLastName(),
            orgName(),
            organizationCategory,
            SignUpDetails.PhoneNumber,
            signupLanguage,
            csiTestPassword()
        );

        if (expected === 'truncated') {
            await csiSignupPage.expectOrganizationNameLength(50);
        }

        await csiSignupPage.clickCreateAccount();
        if (expected === 'missing-fields') {
            await csiSignupPage.expectMissingFieldsToast();
        } else if (expected === 'success-or-duplicate') {
            await csiSignupPage.expectAccountCreationSuccessOrOrganizationAlreadyExists();
        } else {
            await csiSignupPage.expectAccountCreationSuccess();
        }
    });
};

