export type BillingSettings = {
  beneficiary: string;
  iban: string;
  bic: string;
  note: string;
};

export const DEFAULT_BILLING_SETTINGS: BillingSettings = {
  beneficiary: 'Umzugsnetz GmbH',
  iban: 'DE62 1234 5678 9012 3456 78',
  bic: 'GENO DEF1 ABC',
  note: 'Manuelle Überweisungen werden innerhalb von 1–3 Werktagen geprüft.',
};

export function normalizeBooleanSetting(value: unknown, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value === 'true';
  }

  return fallback;
}

export function normalizeNumberSetting(value: unknown, fallback: number) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeBillingSettings(value: unknown): BillingSettings {
  const raw = value && typeof value === 'object' ? value as Partial<BillingSettings> : {};

  return {
    beneficiary: raw.beneficiary || DEFAULT_BILLING_SETTINGS.beneficiary,
    iban: raw.iban || DEFAULT_BILLING_SETTINGS.iban,
    bic: raw.bic || DEFAULT_BILLING_SETTINGS.bic,
    note: raw.note || DEFAULT_BILLING_SETTINGS.note,
  };
}
