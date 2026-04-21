'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { StatCardGrid } from '@/components/crm/StatCardGrid';

type PartnerDashboardPayload = {
  partner: {
    name: string;
    email: string | null;
    phone: string | null;
    status: string;
    verification_status: string | null;
    package_code: string | null;
    lead_limit_used: number | null;
    lead_limit_monthly: number | null;
    is_available: boolean | null;
    bonus_tokens: number | null;
    website_url: string | null;
    verified_at: string | null;
    onboarding_completed_at: string | null;
  };
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  package: {
    name: string;
    monthly_price: number;
    lead_limit_monthly: number;
    priority: number;
    release_delay_seconds: number;
    is_active: boolean;
  } | null;
  subscription: {
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    provider: string;
  } | null;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    status: string;
    paid_at: string | null;
    created_at: string;
    provider: string;
  }>;
  walletTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    created_at: string;
  }>;
  services: Array<{
    service_code: string;
    is_active: boolean;
  }>;
  regions: Array<{
    country_code: string;
    postal_code: string | null;
    city: string | null;
    radius_km: number | null;
  }>;
  assignments: Array<{
    id: string;
    status: string;
    priority: number;
    release_at: string | null;
    viewed_at: string | null;
    created_at: string;
    lead: {
      customer_name: string | null;
      service_code: string;
      city: string | null;
      postal_code: string | null;
      status: string;
      requested_at: string;
    } | null;
  }>;
  stats: {
    availableLeadCount: number;
    queuedLeadCount: number;
    leadLimitRemaining: number;
  };
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatMoney(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  }).format(amount);
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-600">{description}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function PartnerDashboardPanel({ section }: { section: 'overview' | 'profile' | 'billing' | 'leads' }) {
  const { showToast } = useToast();
  const [payload, setPayload] = useState<PartnerDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.access_token) {
          throw error || new Error('Sitzung nicht gefunden.');
        }

        const response = await fetch('/api/partner/dashboard', {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        const nextPayload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(nextPayload?.error || 'Partnerdaten konnten nicht geladen werden.');
        }

        setPayload(nextPayload);
      } catch (error: any) {
        showToast('error', 'Partnerdaten konnten nicht geladen werden', error.message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [showToast]);

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Partnerdaten werden geladen ...
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
        Es konnten keine Partnerdaten geladen werden.
      </section>
    );
  }

  if (section === 'overview') {
    return (
      <>
        <StatCardGrid
          items={[
            { label: 'Verifizierung', value: payload.partner.verification_status || 'PENDING', hint: 'Aktueller Freigabestatus' },
            { label: 'Paket', value: payload.partner.package_code || 'FREE', hint: payload.package?.name || 'Kein Paket' },
            { label: 'Verfuegbare Leads', value: String(payload.stats.availableLeadCount), hint: 'Bereits freigegeben' },
            { label: 'Offene Freigaben', value: String(payload.stats.queuedLeadCount), hint: 'Noch in Warteschlange' },
            { label: 'Lead-Limit Rest', value: String(payload.stats.leadLimitRemaining), hint: 'Monatlich verbleibend' },
            { label: 'Bonus-Token', value: String(payload.partner.bonus_tokens || 0), hint: 'Kostenlose Anfragen' },
          ]}
        />

        <SectionCard title="Partnerstatus" description="Aktueller Betriebs- und Freigabestatus des Partnerkontos.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">{payload.partner.name}</p>
              <p className="mt-2 text-sm text-slate-600">Status: {payload.partner.status}</p>
              <p className="mt-1 text-sm text-slate-600">Verfuegbar: {payload.partner.is_available ? 'Ja' : 'Nein'}</p>
              <p className="mt-1 text-sm text-slate-600">Onboarding: {formatDate(payload.partner.onboarding_completed_at)}</p>
              <p className="mt-1 text-sm text-slate-600">Verifiziert am: {formatDate(payload.partner.verified_at)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Aktive Leistungen</p>
              <p className="mt-2 text-sm text-slate-600">
                {payload.services.length > 0 ? payload.services.filter((entry) => entry.is_active).map((entry) => entry.service_code).join(', ') : 'Keine Leistungen hinterlegt'}
              </p>
              <p className="mt-4 text-sm font-semibold text-slate-900">Einsatzgebiete</p>
              <p className="mt-2 text-sm text-slate-600">
                {payload.regions.length > 0
                  ? payload.regions.map((entry) => `${entry.postal_code || '-'} ${entry.city || '-'}`.trim()).join(' | ')
                  : 'Keine Regionen hinterlegt'}
              </p>
            </div>
          </div>
        </SectionCard>
      </>
    );
  }

  if (section === 'profile') {
    return (
      <>
        <SectionCard title="Firmenprofil" description="Hinterlegte Stammdaten fuer Matching, Sichtbarkeit und Verifizierung.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Firma:</span> {payload.partner.name}</p>
              <p><span className="font-semibold text-slate-900">Ansprechpartner:</span> {payload.profile?.full_name || '-'}</p>
              <p><span className="font-semibold text-slate-900">E-Mail:</span> {payload.profile?.email || payload.partner.email || '-'}</p>
              <p><span className="font-semibold text-slate-900">Telefon:</span> {payload.profile?.phone || payload.partner.phone || '-'}</p>
              <p><span className="font-semibold text-slate-900">Website:</span> {payload.partner.website_url || '-'}</p>
            </div>
            <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Verifizierung:</span> {payload.partner.verification_status || 'PENDING'}</p>
              <p><span className="font-semibold text-slate-900">Paket:</span> {payload.package?.name || payload.partner.package_code || '-'}</p>
              <p><span className="font-semibold text-slate-900">Lead-Limit:</span> {payload.partner.lead_limit_used || 0} / {payload.partner.lead_limit_monthly || 0}</p>
              <p><span className="font-semibold text-slate-900">Bonus-Token:</span> {payload.partner.bonus_tokens || 0}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Leistungen und Regionen">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Leistungsarten</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {payload.services.length > 0 ? payload.services.map((entry) => (
                  <span key={entry.service_code} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    {entry.service_code}
                  </span>
                )) : <span className="text-sm text-slate-500">Keine Leistungen hinterlegt</span>}
              </div>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-900">Einsatzgebiete</p>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                {payload.regions.length > 0 ? payload.regions.map((entry, index) => (
                  <p key={`${entry.postal_code}-${entry.city}-${index}`}>
                    {entry.country_code} | {entry.postal_code || '-'} {entry.city || '-'} | Radius {entry.radius_km || 0} km
                  </p>
                )) : <p className="text-slate-500">Keine Regionen hinterlegt</p>}
              </div>
            </div>
          </div>
        </SectionCard>
      </>
    );
  }

  if (section === 'billing') {
    return (
      <>
        <StatCardGrid
          items={[
            { label: 'Paketpreis', value: payload.package ? formatMoney(payload.package.monthly_price) : formatMoney(0), hint: payload.package?.name || 'Kein Paket' },
            { label: 'Abo-Status', value: payload.subscription?.status || 'INCOMPLETE', hint: payload.subscription?.provider || 'STRIPE' },
            { label: 'Lead-Limit', value: `${payload.partner.lead_limit_used || 0}/${payload.partner.lead_limit_monthly || 0}`, hint: 'Aktuelle Nutzung' },
            { label: 'Bonus-Token', value: String(payload.partner.bonus_tokens || 0), hint: 'Noch verfuegbar' },
          ]}
        />

        <SectionCard title="Abo und Paket">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Paket:</span> {payload.package?.name || payload.partner.package_code || '-'}</p>
              <p><span className="font-semibold text-slate-900">Prioritaet:</span> {payload.package?.priority || '-'}</p>
              <p><span className="font-semibold text-slate-900">Release-Delay:</span> {payload.package?.release_delay_seconds || 0} Sekunden</p>
              <p><span className="font-semibold text-slate-900">Abo-Zeitraum:</span> {formatDate(payload.subscription?.current_period_start || null)} bis {formatDate(payload.subscription?.current_period_end || null)}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Kuendigung zum Periodenende:</span> {payload.subscription?.cancel_at_period_end ? 'Ja' : 'Nein'}</p>
              <p><span className="font-semibold text-slate-900">Verifizierung:</span> {payload.partner.verification_status || 'PENDING'}</p>
              <p><span className="font-semibold text-slate-900">Partnerstatus:</span> {payload.partner.status}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Letzte Zahlungen">
          <div className="space-y-3">
            {payload.payments.length > 0 ? payload.payments.map((payment) => (
              <div key={payment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{formatMoney(payment.amount, payment.currency)}</p>
                <p className="mt-1">Status: {payment.status}</p>
                <p className="mt-1">Erfasst: {formatDate(payment.created_at)}</p>
                <p className="mt-1">Bezahlt: {formatDate(payment.paid_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">Noch keine Zahlungen vorhanden.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Wallet-Historie">
          <div className="space-y-3">
            {payload.walletTransactions.length > 0 ? payload.walletTransactions.map((entry) => (
              <div key={entry.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{entry.type}</p>
                <p className="mt-1">{formatMoney(entry.amount)}</p>
                <p className="mt-1">{entry.description || 'Ohne Beschreibung'}</p>
                <p className="mt-1">{formatDate(entry.created_at)}</p>
              </div>
            )) : <p className="text-sm text-slate-500">Noch keine Wallet-Transaktionen vorhanden.</p>}
          </div>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <StatCardGrid
        items={[
          { label: 'Verfuegbar', value: String(payload.stats.availableLeadCount), hint: 'Freigegebene Leads' },
          { label: 'In Warteschlange', value: String(payload.stats.queuedLeadCount), hint: 'Noch nicht freigegeben' },
          { label: 'Lead-Limit Rest', value: String(payload.stats.leadLimitRemaining), hint: 'Diesen Monat' },
          { label: 'Paket', value: payload.partner.package_code || 'FREE', hint: payload.package?.name || 'Kein Paket' },
        ]}
      />

      <SectionCard title="Letzte Lead-Zuweisungen" description="Leadfreigaben nach Paket, Region und Matching-Status.">
        <div className="space-y-3">
          {payload.assignments.length > 0 ? payload.assignments.map((assignment) => (
            <div key={assignment.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{assignment.lead?.customer_name || 'Unbekannter Lead'}</p>
              <p className="mt-1">Leistung: {assignment.lead?.service_code || '-'}</p>
              <p className="mt-1">Ort: {assignment.lead?.postal_code || '-'} {assignment.lead?.city || '-'}</p>
              <p className="mt-1">Assignment-Status: {assignment.status}</p>
              <p className="mt-1">Lead-Status: {assignment.lead?.status || '-'}</p>
              <p className="mt-1">Freigabe: {formatDate(assignment.release_at)}</p>
              <p className="mt-1">Angesehen: {formatDate(assignment.viewed_at)}</p>
            </div>
          )) : <p className="text-sm text-slate-500">Noch keine Lead-Zuweisungen vorhanden.</p>}
        </div>
      </SectionCard>
    </>
  );
}
