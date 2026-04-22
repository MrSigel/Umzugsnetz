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

function normalizeWebsiteUrl(website?: string | null) {
  const raw = normalizeWhitespace(website || '');
  if (!raw) {
    return null;
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw;
  }

  return `https://${raw}`;
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
  website?: string | null;
}): Promise<VerificationResult> {
  const domain = getEmailDomain(input.email);
  const businessDomain = isBusinessEmailDomain(domain);
  const phoneNormalized = normalizeGermanPhoneNumber(input.phone);
  const phoneDigits = phoneNormalized?.replace(/\D/g, '') || '';
  const explicitWebsite = normalizeWebsiteUrl(input.website);
  const fallbackCandidates = businessDomain && domain ? [`https://${domain}`, `https://www.${domain}`] : [];
  const websiteCandidates = explicitWebsite ? [explicitWebsite] : fallbackCandidates;

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

  const hasCompanyName = normalizeWhitespace(input.companyName).length >= 4;
  const hasLocation = normalizeWhitespace(input.location).length >= 2;
  const hasPlausiblePhone = phoneDigits.length >= 11 && phoneDigits.length <= 14;
  const isVerified = hasCompanyName && hasLocation && businessDomain && hasPlausiblePhone && websiteReachable;
  const score =
    (hasCompanyName ? 20 : 0)
    + (hasLocation ? 20 : 0)
    + (businessDomain ? 20 : 0)
    + (hasPlausiblePhone ? 20 : 0)
    + (websiteReachable ? 20 : 0);

  const summaryParts = [
    hasCompanyName ? 'Firmenname plausibel' : 'Firmenname unvollstaendig',
    hasLocation ? 'Standortangabe vorhanden' : 'Standortangabe zu ungenau',
    businessDomain ? 'Geschaeftliche E-Mail erkannt' : 'Freemailer oder private E-Mail erkannt',
    hasPlausiblePhone ? `Telefon plausibel (${phoneNormalized})` : 'Telefonnummer manuell pruefen',
    websiteReachable ? `Website erreichbar (${websiteUrl})` : 'Website nicht erreichbar oder nicht pruefbar',
  ];

  return {
    score,
    status: isVerified ? 'VERIFIED' : 'REVIEW',
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
