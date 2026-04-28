import Stripe from 'stripe';

let cachedClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (cachedClient) return cachedClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe ist noch nicht konfiguriert. Bitte STRIPE_SECRET_KEY setzen.');
  }

  cachedClient = new Stripe(secretKey, {
    typescript: true,
  });
  return cachedClient;
}

export type PartnerPackageCode = 'FREE' | 'PREMIUM' | 'BUSINESS';

export function priceIdForPackage(code: PartnerPackageCode): string | null {
  if (code === 'PREMIUM') return process.env.STRIPE_PRICE_PREMIUM || null;
  if (code === 'BUSINESS') return process.env.STRIPE_PRICE_BUSINESS || null;
  return null;
}

export function appBaseUrl(): string {
  const url = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://umzugsnetz.de';
  return url.replace(/\/$/, '');
}

export function isStripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
