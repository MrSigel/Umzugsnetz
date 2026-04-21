import { NextResponse } from 'next/server';
import { createLeadWithAssignments } from '@/lib/crm/leadMatching';

export const dynamic = 'force-dynamic';

type LeadImportBody = {
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

function getImportKey(request: Request) {
  return request.headers.get('x-umzugsnetz-key') || request.headers.get('x-api-key');
}

function isAuthorized(request: Request) {
  const configuredKey = process.env.LEAD_IMPORT_API_KEY?.trim();
  if (!configuredKey) {
    return true;
  }

  return getImportKey(request) === configuredKey;
}

function isValidBody(body: LeadImportBody) {
  return typeof body.customerName === 'string'
    && typeof body.customerEmail === 'string'
    && typeof body.customerPhone === 'string'
    && typeof body.serviceCode === 'string'
    && typeof body.city === 'string';
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }

  let body: LeadImportBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Ungueltige Anfrage.' }, { status: 400 });
  }

  if (!isValidBody(body)) {
    return NextResponse.json({ error: 'Pflichtfelder fehlen.' }, { status: 400 });
  }

  try {
    const result = await createLeadWithAssignments(body);
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lead-Import fehlgeschlagen.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
