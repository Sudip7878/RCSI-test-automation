import { expect, test } from '../../../fixtures/csi/testSetup';
import { csiTestPassword, csiTestEmail } from '../../../utils/csi/credentials';
import { avmSqlInjectionTestData } from '../../../utils/csi/avmTestData';

test.describe('SB-033 Add client — SQL injection in org name', () => {
    test('SB-033', async ({ page, csiLoginPage, csiAccountManagementPage }) => {
        test.setTimeout(30_000);

        const password = csiTestPassword();
        const email = csiTestEmail();
        const organizationDetails = {
            firstName: avmSqlInjectionTestData.xssPayload,
            lastName: avmSqlInjectionTestData.xssPayload,
            ownerEmail: avmSqlInjectionTestData.xssPayload,
            phoneNumber: avmSqlInjectionTestData.xssPayload,
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
        await csiAccountManagementPage.expectCreateOrganizationOwnerEmailValidationErrorAm016();
        expect(javascriptDialogs).toEqual([]);
    });
});

