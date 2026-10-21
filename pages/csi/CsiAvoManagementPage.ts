import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from '../BasePage';

export class CsiAvoManagementPage extends BasePage {
    // 1. Define reusable locators
    private readonly avomanagementLink: Locator;
    private readonly organizationLink: Locator;
    private readonly addButton: Locator;
    private readonly organizationDialog: Locator;
    private readonly createOrganizationButton: Locator;
    private readonly ownerfirstnameInput: Locator;
    private readonly ownerlastnameInput: Locator;
    private readonly owneremailInput: Locator;
    private readonly phoneNumberInput: Locator;
    private readonly organizationNameInput: Locator;
    private readonly organizationTypeInput: Locator;
    private readonly organizationSizeInput: Locator;
    private readonly subscriptionType: Locator;
    private readonly promoCode: Locator;

    constructor(page: Page) {
        super(page);

        // Initialize locators
        this.avomanagementLink = this.page.getByText('Avo Management', { exact: true });
        this.organizationLink = this.page.getByText('Organization');
        this.addButton = this.page.getByRole('button', { name: 'Add' });
        this.organizationDialog = this.page.getByRole('dialog').filter({
            has: this.page.getByText('Create new organization', { exact: true }),
        });
        this.createOrganizationButton = this.organizationDialog.getByRole('button', { name: 'Create organization' });
        this.ownerfirstnameInput = this.organizationDialog.getByRole('textbox', { name: 'First name' });
        this.ownerlastnameInput = this.organizationDialog.getByRole('textbox', { name: 'Last name' });
        this.owneremailInput = this.organizationDialog.getByRole('textbox', { name: 'Owner email' });
        this.phoneNumberInput = this.organizationDialog.getByRole('textbox', { name: 'Phone number' });
        this.organizationNameInput = this.organizationDialog.getByRole('textbox', { name: 'Organization name' });
        this.organizationTypeInput = this.organizationDialog.locator('div.vscomp-value', { hasText: 'Category' });
        this.organizationSizeInput = this.organizationDialog.locator('div.vscomp-value', { hasText: 'Size' });
        this.subscriptionType = this.organizationDialog.locator('.vscomp-toggle-button', { hasText: 'Plan' })
        this.promoCode = this.organizationDialog.locator('#b12-Dropdown_promoCode');
        this.createOrganizationButton = this.organizationDialog.getByRole('button', { name: 'Create organization' })
    }

    // 2. Action methods
    async navigateToAvoManagement() {

        await this.waitForElement(this.avomanagementLink, 30_000);
        await this.avomanagementLink.click();
    }

    async navigateToOrganization() {

        await this.waitForElement(this.organizationLink, 30_000);
        await this.organizationLink.click();
    }

    async clickAddButton() {
        await this.waitForElement(this.addButton, 30_000);
        await this.addButton.click();
    }


    async expectOrganizationCreated() {
        await expect(this.page.getByText('Record created.', { exact: true })).toBeVisible({ timeout: 60_000 });
    }


    async fillOrganizationDetails(details: {
        firstName: string;
        lastName: string;
        ownerEmail: string;
        phoneNumber: string;
        organizationName: string;
        category: string;
        size: string;
        subscriptionType: string;
        promoCode: string;
    }) {
        await this.waitForElement(this.organizationDialog, 30_000);
        await this.waitForElement(this.ownerfirstnameInput, 30_000);
        await this.ownerfirstnameInput.fill(details.firstName);
        await this.ownerlastnameInput.fill(details.lastName);
        await this.owneremailInput.fill(details.ownerEmail);
        await this.phoneNumberInput.fill(details.phoneNumber);
        await this.organizationNameInput.fill(details.organizationName);


        await this.page.waitForTimeout(2000);
        await this.organizationTypeInput.click();

        await this.page.locator('.vscomp-dropbox:visible')
            .getByText(details.category, { exact: true })
            .click({ timeout: 30_000 });

        await this.organizationSizeInput.click();
        await this.page.locator('.vscomp-dropbox:visible')
            .getByText(details.size, { exact: true })
            .click({ timeout: 30_000 });

        await this.subscriptionType.click();
        await this.page.locator('.vscomp-dropbox:visible')
            .getByText(details.subscriptionType, { exact: true })
            .click({ timeout: 30_000 });

        await this.promoCode.click()
        await this.promoCode.selectOption({ label: details.promoCode })
    }

    async clickCreateOrganizationButton() {
        await this.createOrganizationButton.click()
    }

}