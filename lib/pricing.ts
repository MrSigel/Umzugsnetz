export type PricingTierId = 'standard' | 'priorisiert' | 'exklusiv';

export type PricingTier = {
  id: PricingTierId;
  alias: string;
  label: string;
  name: string;
  price: number;
};

export type PricingConfig = {
  umzug: PricingTier[];
  entruempelung: PricingTier[];
};

export type OrderServiceCategory = 'PRIVATUMZUG' | 'FIRMENUMZUG' | 'ENTRÜMPELUNG';

const DEFAULT_UMZUG_PRICING: PricingTier[] = [
  { id: 'standard', alias: 'Standard Anfragen', label: 'BASIC', name: 'Standard Anfragen', price: 25 },
  { id: 'priorisiert', alias: 'Priorisierte Anfragen', label: 'PRO', name: 'Priorisierte Anfragen', price: 35 },
  { id: 'exklusiv', alias: 'Exklusive Anfragen', label: 'VIP', name: 'Exklusive Anfragen', price: 45 },
];

const DEFAULT_ENTRUEMPELUNG_PRICING: PricingTier[] = [
  { id: 'standard', alias: 'Standard Anfragen', label: 'BASIC', name: 'Standard Anfragen', price: 25 },
  { id: 'priorisiert', alias: 'Priorisierte Anfragen', label: 'PRO', name: 'Priorisierte Anfragen', price: 30 },
  { id: 'exklusiv', alias: 'Exklusive Anfragen', label: 'VIP', name: 'Exklusive Anfragen', price: 35 },
];

export const DEFAULT_PRICING_CONFIG: PricingConfig = {
  umzug: DEFAULT_UMZUG_PRICING,
  entruempelung: DEFAULT_ENTRUEMPELUNG_PRICING,
};

export const PLAN_META: Record<string, { title: string; description: string; features: string[] }> = {
  'Standard Anfragen': {
    title: 'BASIC',
    description: 'Sofort startklar für offene Anfragen in Ihrer Region.',
    features: [
      'Standard-Zugriff auf neue Anfragen',
      'Volle Nutzung des Marktplatzes',
      'Ideal für den Einstieg',
    ],
  },
  'Priorisierte Anfragen': {
    title: 'PRO',
    description: 'Früherer Zugriff auf neue Anfragen mit höherer Sichtbarkeit.',
    features: [
      'Bevorzugte Reihenfolge im Marktplatz',
      'Bessere Chancen bei stark nachgefragten Regionen',
      'Schnellerer Zugriff auf neue Anfragen',
    ],
  },
  'Exklusive Anfragen': {
    title: 'VIP',
    description: 'Maximale Priorität bei den wertvollsten Kundenanfragen.',
    features: [
      'Höchste Priorität bei neuen Anfragen',
      'Frühester Zugriff auf exklusive Anfragen',
      'Ideal für hohe Abschlussquoten',
    ],
  },
};

function normalizePricingTier(
  rawItem: Partial<PricingTier> & Record<string, unknown>,
  fallbackTier: PricingTier,
): PricingTier {
  const priceValue = typeof rawItem.price === 'number'
    ? rawItem.price
    : Number(rawItem.price ?? fallbackTier.price);

  return {
    id: (rawItem.id as PricingTierId) || fallbackTier.id,
    alias: typeof rawItem.alias === 'string'
      ? rawItem.alias
      : typeof rawItem.name === 'string'
        ? rawItem.name
        : fallbackTier.alias,
    label: typeof rawItem.label === 'string' ? rawItem.label : fallbackTier.label,
    name: typeof rawItem.name === 'string' ? rawItem.name : fallbackTier.name,
    price: Number.isFinite(priceValue) ? priceValue : fallbackTier.price,
  };
}

function normalizePricingGroup(rawGroup: unknown, fallbackGroup: PricingTier[]): PricingTier[] {
  if (!Array.isArray(rawGroup)) {
    return fallbackGroup;
  }

  return fallbackGroup.map((fallbackTier) => {
    const rawTier = rawGroup.find((entry) => entry && typeof entry === 'object' && (entry as PricingTier).id === fallbackTier.id);
    if (!rawTier || typeof rawTier !== 'object') {
      return fallbackTier;
    }

    return normalizePricingTier(rawTier as Partial<PricingTier>, fallbackTier);
  });
}

export function normalizePricingConfig(rawValue: unknown): PricingConfig {
  const rawConfig = rawValue && typeof rawValue === 'object' ? rawValue as Record<string, unknown> : {};

  return {
    umzug: normalizePricingGroup(rawConfig.umzug, DEFAULT_UMZUG_PRICING),
    entruempelung: normalizePricingGroup(rawConfig.entruempelung, DEFAULT_ENTRUEMPELUNG_PRICING),
  };
}

export function getPricingGroup(config: PricingConfig, serviceCategory: string) {
  return serviceCategory === 'ENTRÜMPELUNG' ? config.entruempelung : config.umzug;
}

export function getLeadPrice(
  config: PricingConfig,
  partnerCategory: string | null | undefined,
  serviceCategory: string | null | undefined,
) {
  const pricingGroup = getPricingGroup(config, serviceCategory || 'PRIVATUMZUG');
  const tier = pricingGroup.find((entry) => entry.alias === partnerCategory) || pricingGroup[0];
  return tier?.price ?? 0;
}

export function getTierForCategory(config: PricingConfig, category: string | null | undefined) {
  return config.umzug.find((entry) => entry.alias === category) || DEFAULT_UMZUG_PRICING[0];
}
