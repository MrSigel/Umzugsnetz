import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';

type LeadImportPayload = {
  source?: string;
  externalReference?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  serviceCode?: string | null;
  postalCode?: string | null;
  city?: string | null;
  regionLabel?: string | null;
  requestedAt?: string | null;
  payload?: Record<string, unknown>;
};

type PartnerCandidateRow = {
  id: string;
  status: string | null;
  verification_status: string | null;
  package_code: 'FREE' | 'PREMIUM' | 'BUSINESS' | null;
  lead_limit_monthly: number | null;
  lead_limit_used: number | null;
  is_available: boolean | null;
  partner_services: Array<{
    service_code: string | null;
    is_active: boolean | null;
  }> | null;
  service_regions: Array<{
    postal_code: string | null;
    city: string | null;
    radius_km: number | null;
  }> | null;
  package?: {
    code: 'FREE' | 'PREMIUM' | 'BUSINESS';
    priority: number;
    release_delay_seconds: number;
    lead_limit_monthly: number;
    is_active: boolean;
  } | null;
};

type PartnerCandidateQueryRow = Omit<PartnerCandidateRow, 'package'> & {
  package?: PartnerCandidateRow['package'] | Array<NonNullable<PartnerCandidateRow['package']>>;
};

export type LeadAssignmentCandidate = {
  partnerId: string;
  packageCode: 'FREE' | 'PREMIUM' | 'BUSINESS';
  priority: number;
  releaseAt: string;
};

export type MatchLeadInput = {
  leadId: string;
  serviceCode: string;
  postalCode?: string | null;
  city?: string | null;
  requestedAt?: string | null;
};

function normalizeText(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function normalizePostalCode(value?: string | null) {
  return (value || '').replace(/\s+/g, '');
}

function matchesService(candidate: PartnerCandidateRow, serviceCode: string) {
  const normalizedServiceCode = normalizeText(serviceCode);
  const services = (candidate.partner_services || [])
    .filter((entry) => entry.is_active !== false)
    .map((entry) => normalizeText(entry.service_code));

  if (services.length === 0) {
    return true;
  }

  return services.includes(normalizedServiceCode);
}

function matchesRegion(candidate: PartnerCandidateRow, postalCode?: string | null, city?: string | null) {
  const regions = candidate.service_regions || [];
  if (regions.length === 0) {
    return true;
  }

  const normalizedPostalCode = normalizePostalCode(postalCode);
  const normalizedCity = normalizeText(city);

  return regions.some((region) => {
    const regionPostalCode = normalizePostalCode(region.postal_code);
    const regionCity = normalizeText(region.city);

    if (normalizedPostalCode && regionPostalCode && normalizedPostalCode === regionPostalCode) {
      return true;
    }

    if (normalizedCity && regionCity) {
      return normalizedCity.includes(regionCity) || regionCity.includes(normalizedCity);
    }

    return false;
  });
}

function hasLeadCapacity(candidate: PartnerCandidateRow) {
  const used = candidate.lead_limit_used || 0;
  const packageLimit = candidate.package?.lead_limit_monthly ?? candidate.lead_limit_monthly ?? 0;

  if (packageLimit <= 0) {
    return true;
  }

  return used < packageLimit;
}

function isEligible(candidate: PartnerCandidateRow, serviceCode: string, postalCode?: string | null, city?: string | null) {
  if (candidate.status !== 'ACTIVE') {
    return false;
  }

  if (candidate.verification_status !== 'VERIFIED') {
    return false;
  }

  if (candidate.is_available === false) {
    return false;
  }

  if (!candidate.package || candidate.package.is_active === false || !candidate.package_code) {
    return false;
  }

  return hasLeadCapacity(candidate)
    && matchesService(candidate, serviceCode)
    && matchesRegion(candidate, postalCode, city);
}

function buildReleaseAt(requestedAt: string | null | undefined, delaySeconds: number) {
  const base = requestedAt ? new Date(requestedAt) : new Date();
  const timestamp = Number.isNaN(base.getTime()) ? new Date() : base;
  return new Date(timestamp.getTime() + delaySeconds * 1000).toISOString();
}

function normalizeCandidate(candidate: PartnerCandidateQueryRow): PartnerCandidateRow {
  const packageValue = Array.isArray(candidate.package)
    ? candidate.package[0] || null
    : candidate.package || null;

  return {
    ...candidate,
    package: packageValue,
  };
}

export async function createLeadWithAssignments(input: LeadImportPayload) {
  const supabaseAdmin = getSupabaseAdmin();
  const serviceCode = normalizeText(input.serviceCode).toUpperCase();

  if (!serviceCode) {
    throw new Error('Leistungsart fehlt.');
  }

  const now = new Date().toISOString();
  const { data: lead, error: leadError } = await supabaseAdmin
    .from('leads')
    .insert([{
      source: input.source || 'kostenrechner',
      external_reference: input.externalReference || null,
      customer_name: input.customerName || null,
      customer_email: input.customerEmail || null,
      customer_phone: input.customerPhone || null,
      service_code: serviceCode,
      postal_code: input.postalCode || null,
      city: input.city || null,
      region_label: input.regionLabel || null,
      requested_at: input.requestedAt || now,
      status: 'QUEUED',
      payload: input.payload || {},
      updated_at: now,
    }])
    .select('id,requested_at,service_code,postal_code,city')
    .single();

  if (leadError || !lead) {
    throw new Error(leadError?.message || 'Lead konnte nicht gespeichert werden.');
  }

  const { data: candidates, error: candidateError } = await supabaseAdmin
    .from('partners')
    .select(`
      id,
      status,
      verification_status,
      package_code,
      lead_limit_monthly,
      lead_limit_used,
      is_available,
      partner_services(service_code,is_active),
      service_regions(postal_code,city,radius_km),
      package:packages!partners_package_code_fkey(code,priority,release_delay_seconds,lead_limit_monthly,is_active)
    `);

  if (candidateError) {
    throw new Error(candidateError.message);
  }

  const assignments: LeadAssignmentCandidate[] = ((candidates || []) as PartnerCandidateQueryRow[])
    .map(normalizeCandidate)
    .filter((candidate) => isEligible(candidate, lead.service_code, lead.postal_code, lead.city))
    .sort((left, right) => {
      const leftPriority = left.package?.priority ?? 999;
      const rightPriority = right.package?.priority ?? 999;
      return leftPriority - rightPriority;
    })
    .map((candidate) => ({
      partnerId: candidate.id,
      packageCode: candidate.package_code as 'FREE' | 'PREMIUM' | 'BUSINESS',
      priority: candidate.package?.priority ?? 999,
      releaseAt: buildReleaseAt(lead.requested_at, candidate.package?.release_delay_seconds ?? 0),
    }));

  if (assignments.length > 0) {
    const { error: assignmentError } = await supabaseAdmin.from('lead_assignments').insert(
      assignments.map((assignment) => ({
        lead_id: lead.id,
        partner_id: assignment.partnerId,
        package_code: assignment.packageCode,
        priority: assignment.priority,
        release_at: assignment.releaseAt,
        status: 'QUEUED',
        updated_at: now,
      })),
    );

    if (assignmentError) {
      throw new Error(assignmentError.message);
    }
  }

  await supabaseAdmin.from('lead_status_history').insert([{
    lead_id: lead.id,
    from_status: 'NEW',
    to_status: assignments.length > 0 ? 'QUEUED' : 'ARCHIVED',
    note: assignments.length > 0
      ? `${assignments.length} Partner automatisch fuer Matching vorgemerkt.`
      : 'Kein passender Partner fuer automatisches Matching gefunden.',
  }]);

  if (assignments.length === 0) {
    await supabaseAdmin
      .from('leads')
      .update({ status: 'ARCHIVED', updated_at: now })
      .eq('id', lead.id);
  }

  return {
    leadId: lead.id,
    matchedPartners: assignments.length,
    assignments,
  };
}
