import { expect, test } from '../../../fixtures/csi/testSetup';
import { csiTestPassword, csiTestEmail } from '../../../utils/csi/credentials';
import { avmSqlInjectionTestData } from '../../../utils/csi/avmTestData';
import {
    randomEmail,
    randomOrganizationName,
} from '../../../utils/csi/am008OrganizationTestData';

test.describe('SB - 033 Add client — SQL injection in org name', () => {
    test('SB - 033', async ({ page, csiLoginPage, csiAvoManagementPage }) => {
        test.setTimeout(30_000);

        const password = csiTestPassword();
        const email = csiTestEmail();
        const organizationDetails = {
            firstName: avmSqlInjectionTestData.xssPayload,
            lastName: avmSqlInjectionTestData.xssPayload,
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

        // Navigate to Avo Management Page
        await csiAvoManagementPage.navigateToAvoManagement();
        await csiAvoManagementPage.navigateToOrganization();
        await csiAvoManagementPage.clickAddButton();

        await csiAvoManagementPage.fillOrganizationDetails(organizationDetails);

        await csiAvoManagementPage.clickCreateOrganizationButton();
        await csiAvoManagementPage.expectOrganizationCreated();
        expect(javascriptDialogs).toEqual([]);
    });
});

