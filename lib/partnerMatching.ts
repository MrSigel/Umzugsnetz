type BasicPartner = {
  service?: string | null;
  regions?: string | null;
  status?: string | null;
};

type BasicOrder = {
  service_category?: string | null;
  von_city?: string | null;
  nach_city?: string | null;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function splitRegions(regions?: string | null) {
  return (regions || '')
    .split(/[\n,;|]+/)
    .map(normalizeText)
    .filter(Boolean);
}

export function partnerMatchesService(partnerService?: string | null, orderServiceCategory?: string | null) {
  if (!orderServiceCategory) {
    return true;
  }

  if (!partnerService || partnerService === 'BEIDES') {
    return true;
  }

  if (partnerService === 'UMZUG') {
    return orderServiceCategory === 'PRIVATUMZUG' || orderServiceCategory === 'FIRMENUMZUG';
  }

  if (partnerService === 'ENTRÜMPELUNG') {
    return orderServiceCategory === 'ENTRÜMPELUNG';
  }

  return true;
}

export function partnerMatchesRegions(regions?: string | null, order?: BasicOrder) {
  const regionTokens = splitRegions(regions);
  if (regionTokens.length === 0) {
    return true;
  }

  const cities = [order?.von_city, order?.nach_city]
    .filter(Boolean)
    .map((city) => normalizeText(city as string));

  if (cities.length === 0) {
    return true;
  }

  return cities.some((city) => regionTokens.some((token) => city.includes(token) || token.includes(city)));
}

export function partnerMatchesOrder(partner?: BasicPartner | null, order?: BasicOrder | null) {
  if (!partner || !order) {
    return false;
  }

  return partnerMatchesService(partner.service, order.service_category) && partnerMatchesRegions(partner.regions, order);
}
