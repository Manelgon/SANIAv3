
export const PHONE_PREFIXES = [
    { value: '+34', label: '🇪🇸 +34', country: 'Spain' },
    { value: '+1', label: '🇺🇸 +1', country: 'USA' },
    { value: '+44', label: '🇬🇧 +44', country: 'UK' },
    { value: '+33', label: '🇫🇷 +33', country: 'France' },
    { value: '+49', label: '🇩🇪 +49', country: 'Germany' },
    { value: '+39', label: '🇮🇹 +39', country: 'Italy' },
    { value: '+351', label: '🇵🇹 +351', country: 'Portugal' },
    { value: '+41', label: '🇨🇭 +41', country: 'Switzerland' },
    { value: '+32', label: '🇧🇪 +32', country: 'Belgium' },
    { value: '+31', label: '🇳🇱 +31', country: 'Netherlands' },
    { value: '+46', label: '🇸🇪 +46', country: 'Sweden' },
    { value: '+47', label: '🇳🇴 +47', country: 'Norway' },
    { value: '+45', label: '🇩🇰 +45', country: 'Denmark' },
    { value: '+358', label: '🇫🇮 +358', country: 'Finland' },
    { value: '+353', label: '🇮🇪 +353', country: 'Ireland' },
    { value: '+30', label: '🇬🇷 +30', country: 'Greece' },
    { value: '+48', label: '🇵🇱 +48', country: 'Poland' },
    { value: '+43', label: '🇦🇹 +43', country: 'Austria' },
    { value: '+36', label: '🇭🇺 +36', country: 'Hungary' },
    { value: '+420', label: '🇨🇿 +420', country: 'Czech Republic' },
    { value: '+40', label: '🇷🇴 +40', country: 'Romania' },
    { value: '+359', label: '🇧🇬 +359', country: 'Bulgaria' },
    { value: '+385', label: '🇭🇷 +385', country: 'Croatia' },
    { value: '+386', label: '🇸🇮 +386', country: 'Slovenia' },
    { value: '+421', label: '🇸🇰 +421', country: 'Slovakia' },
    { value: '+372', label: '🇪🇪 +372', country: 'Estonia' },
    { value: '+371', label: '🇱🇻 +371', country: 'Latvia' },
    { value: '+370', label: '🇱🇹 +370', country: 'Lithuania' },
    { value: '+356', label: '🇲🇹 +356', country: 'Malta' },
    { value: '+357', label: '🇨🇾 +357', country: 'Cyprus' },
    { value: '+352', label: '🇱🇺 +352', country: 'Luxembourg' },
    { value: '+52', label: '🇲🇽 +52', country: 'Mexico' },
    { value: '+54', label: '🇦🇷 +54', country: 'Argentina' },
    { value: '+55', label: '🇧🇷 +55', country: 'Brazil' },
    { value: '+56', label: '🇨🇱 +56', country: 'Chile' },
    { value: '+57', label: '🇨🇴 +57', country: 'Colombia' },
    { value: '+51', label: '🇵🇪 +51', country: 'Peru' },
    { value: '+58', label: '🇻🇪 +58', country: 'Venezuela' },
    { value: '+593', label: '🇪🇨 +593', country: 'Ecuador' },
    { value: '+591', label: '🇧🇴 +591', country: 'Bolivia' },
    { value: '+595', label: '🇵🇾 +595', country: 'Paraguay' },
    { value: '+598', label: '🇺🇾 +598', country: 'Uruguay' },
    { value: '+507', label: '🇵🇦 +507', country: 'Panama' },
    { value: '+506', label: '🇨🇷 +506', country: 'Costa Rica' },
    { value: '+503', label: '🇸🇻 +503', country: 'El Salvador' },
    { value: '+502', label: '🇬🇹 +502', country: 'Guatemala' },
    { value: '+504', label: '🇭🇳 +504', country: 'Honduras' },
    { value: '+505', label: '🇳🇮 +505', country: 'Nicaragua' },
    { value: '+1-809', label: '🇩🇴 +1-809', country: 'Dominican Republic' }
];

export const splitPhone = (fullPhone: string | null | undefined): { prefix: string, number: string } => {
    if (!fullPhone) return { prefix: '+34', number: '' };

    // Sort prefixes by length (descending) to match longest prefixes first (e.g. +1-809 before +1)
    const sortedPrefixes = [...PHONE_PREFIXES].sort((a, b) => b.value.length - a.value.length);

    for (const p of sortedPrefixes) {
        if (fullPhone.startsWith(p.value)) {
            return {
                prefix: p.value,
                number: fullPhone.slice(p.value.length).trim()
            };
        }
    }

    // Default fallback if no matching prefix found
    return { prefix: '+34', number: fullPhone };
};
