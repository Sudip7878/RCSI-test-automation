export const avmSqlInjectionTestData = {
    //xssPayload: '<script>alert("xss")</script>',
    sqlInjectionPayload: '; DROP TABLE organizations; --',
    phoneNumber: '1234567890',
    category: 'Banking',
    size: '2-4',
    subscriptionType: 'CyberGO FREE (Yearly)',
    promoCode: 'AVO2026',
} as const;
