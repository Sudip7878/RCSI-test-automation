import { expect, test } from '../../../fixtures/csi/testSetup';
import { csiTestPassword, csiTestEmail } from '../../../utils/csi/credentials';
import { avmSqlInjectionTestData } from '../../../utils/csi/avmTestData';
import {
    csiAccountManagementFirstName,
    csiAccountManagementLastName,
} from '../../../utils/csi/accountManagementTestData';
import {
    randomEmail
} from '../../../utils/csi/am008OrganizationTestData';

test.describe('SB-033 Add client — SQL injection in org name', () => {
    test('SB-033', async ({ page, csiLoginPage, csiAccountManagementPage }) => {
        test.setTimeout(30_000);

        const password = csiTestPassword();
        const email = csiTestEmail();
        const organizationDetails = {
            firstName: csiAccountManagementFirstName(),
            lastName: csiAccountManagementLastName(),
            ownerEmail: randomEmail(),
            phoneNumber: avmSqlInjectionTestData.phoneNumber,
            organizationName: avmSqlInjectionTestData.sqlInjectionPayload,
            category: avmSqlInjectionTestData.category,
            size: avmSqlInjectionTestData.size,
            subscriptionType: avmSqlInjectionTestData.subscriptionType,
            promoCode: avmSqlInjectionTestData.promoCode,
        };
        const javascriptDialogs: string[] = [];

        page.on('dialog', async (dialog) => {
            javascriptDialogs.push(dialog.message());
            await dialog.dismiss();
        });

        await csiLoginPage.gotoLogin();
        await csiLoginPage.signInWithEmailAndPassword(email, password);
        await csiLoginPage.expectOnHome();

        await csiAccountManagementPage.openOrganizationList();
        await csiAccountManagementPage.startAddOrganization();
        await csiAccountManagementPage.fillNewOrganizationAm009({
            firstName: organizationDetails.firstName,
            lastName: organizationDetails.lastName,
            ownerEmail: organizationDetails.ownerEmail,
            phoneNumber: organizationDetails.phoneNumber,
            organizationName: organizationDetails.organizationName,
            category: organizationDetails.category,
            size: organizationDetails.size,
            plan: organizationDetails.subscriptionType,
            promoCode: organizationDetails.promoCode,
        });

        await csiAccountManagementPage.submitCreateOrganization();
        await csiAccountManagementPage.expectOrganizationCreatedAm015();
        expect(javascriptDialogs).toEqual([]);
    });
});

