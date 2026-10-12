import { test } from '../../../fixtures/csi/testSetup';
import {
    csiGroupManagerName,
    csiGroupMemberEmail,
    csiSystemOwnerTestEmail,
    csiSystemOwnerTestPassword,
} from '../../../utils/csi/credentials';

test.describe('Users in Multiple Groups', () => {
    test.beforeEach(async ({ csiLoginPage }) => {
        await csiLoginPage.gotoLogin();
        await csiLoginPage.signInWithEmailAndPassword(
            csiSystemOwnerTestEmail(),
            csiSystemOwnerTestPassword(),
        );
        await csiLoginPage.expectOnHome();
    });

    test('AM -044 User in multiple groups', async ({ csiAccountManagementPage }) => {
        test.setTimeout(240_000);

        const timestamp = Date.now();
        const groupTitles = [`Test Group ${timestamp} A`, `Test Group ${timestamp} B`];
        const managerName = csiGroupManagerName();
        const memberEmail = csiGroupMemberEmail();

        for (const groupTitle of groupTitles) {
            await csiAccountManagementPage.openGroupList();
            await csiAccountManagementPage.startCreateGroupAm041(groupTitle);
            await csiAccountManagementPage.selectGroupManagerAm041(managerName);
            await csiAccountManagementPage.addGroupMemberByEmailAm041(memberEmail);
            await csiAccountManagementPage.saveGroupCreationAm041();
        }

        // checking both groups have same member 
        for (const groupTitle of groupTitles) {
            await csiAccountManagementPage.openGroupListWithSearchReadyAm041();
            await csiAccountManagementPage.searchAndExpectGroupInGridAm041(groupTitle);
            await csiAccountManagementPage.openGroupAndExpectMemberEmailAm041(groupTitle, memberEmail);
        }
    });
});
