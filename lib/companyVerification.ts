const FREE_MAIL_PROVIDERS = new Set([
  'gmail.com',
  'googlemail.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'web.de',
  'gmx.de',
  'icloud.com',
  'yahoo.com',
  'yahoo.de',
  't-online.de',
]);

export type VerificationResult = {
  score: number;
  status: 'VERIFIED' | 'REVIEW';
  summary: string;
  websiteUrl: string | null;
  phoneNormalized: string | null;
  websiteReachable: boolean;
  websiteCheckedAt: string;
};

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeGermanPhoneNumber(phone: string) {
  const compact = phone.replace(/[^\d+]/g, '').trim();
  if (!compact) {
    return null;
  }

  if (compact.startsWith('+49')) {
    return compact;
  }

  if (compact.startsWith('0049')) {
    return `+49${compact.slice(4)}`;
  }

  if (compact.startsWith('0')) {
    return `+49${compact.slice(1)}`;
  }

  if (/^\d+$/.test(compact)) {
    return `+49${compact}`;
  }

  return compact;
}

export function getEmailDomain(email: string) {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  return domain || null;
}

export function isBusinessEmailDomain(domain: string | null) {
  if (!domain) {
    return false;
  }

  return !FREE_MAIL_PROVIDERS.has(domain);
}

async function checkWebsite(url: string) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'user-agent': 'UmzugsnetzBot/1.0 (+https://umzugsnetz.de)',
      },
      cache: 'no-store',
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function verifyCompanyProfile(input: {
  companyName: string;
  email: string;
  phone: string;
  location: string;
}): Promise<VerificationResult> {
  const domain = getEmailDomain(input.email);
  const businessDomain = isBusinessEmailDomain(domain);
  const phoneNormalized = normalizeGermanPhoneNumber(input.phone);
  const phoneDigits = phoneNormalized?.replace(/\D/g, '') || '';
  const websiteCandidates = businessDomain && domain ? [`https://${domain}`, `https://www.${domain}`] : [];

  let websiteUrl: string | null = null;
  let websiteReachable = false;
  for (const candidate of websiteCandidates) {
    const reachable = await checkWebsite(candidate);
    if (reachable) {
      websiteUrl = candidate;
      websiteReachable = true;
      break;
    }
  }

  let score = 0;
  if (normalizeWhitespace(input.companyName).length >= 4) score += 25;
  if (normalizeWhitespace(input.location).length >= 2) score += 20;
  if (businessDomain) score += 25;
  if (phoneDigits.length >= 11 && phoneDigits.length <= 14) score += 20;
  if (websiteReachable) score += 30;

  const summaryParts = [
    businessDomain ? 'Unternehmensdomain vorhanden' : 'Freemailer oder keine Unternehmensdomain erkannt',
    websiteReachable ? `Website erreichbar (${websiteUrl})` : 'Keine erreichbare Firmenwebsite automatisch gefunden',
    phoneDigits.length >= 11 && phoneDigits.length <= 14 ? `Telefon plausibel (${phoneNormalized})` : 'Telefonnummer manuell pruefen',
    normalizeWhitespace(input.location).length >= 2 ? 'Standortangabe vorhanden' : 'Standortangabe zu ungenau',
  ];

  return {
    score,
    status: score >= 70 ? 'VERIFIED' : 'REVIEW',
    summary: summaryParts.join(' | '),
    websiteUrl,
    phoneNormalized,
    websiteReachable,
    websiteCheckedAt: new Date().toISOString(),
  };
}

export function normalizePartnerApplicationService(service: string, sourcePage: string) {
  const value = `${service} ${sourcePage}`.toLowerCase();

  if (value.includes('entruempel')) {
    return 'ENTRÜMPELUNG';
  }

  if (value.includes('beide') || value.includes('umzug_entruempelung')) {
    return 'BEIDES';
  }

  return 'UMZUG';
}
