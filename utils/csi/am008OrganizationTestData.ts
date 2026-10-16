import { randomInt, randomUUID } from 'node:crypto';

export const randomOrganizationName = (length: number) => {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length }, () => characters[randomInt(characters.length)]).join('');
};

export  const randomCjkOrganizationName = (length: number) =>
    Array.from({ length }, () => String.fromCodePoint(randomInt(0x4e00, 0xa000))).join('');

export const randomEmail = () => `${randomUUID()}@example.com`;

export const organizationCategory = 'Banking';
export const signupLanguage = 'English';
export const phoneNumber = '1234567890';

export const orgNameBoundaryScenarios = [
    { label: 'minimum length (1 character)', orgName: () => randomOrganizationName(1), expected: 'success-or-duplicate' },
    { label: 'maximum length (50 characters)', orgName: () => randomOrganizationName(50), expected: 'success' },
    { label: 'exceeding maximum length (51 characters)', orgName: () => randomOrganizationName(51), expected: 'truncated' },
    { label: 'spaces only', orgName: () => ' '.repeat(10), expected: 'missing-fields' },
    { label: 'CJK characters', orgName: () => randomCjkOrganizationName(5), expected: 'success' },
];
