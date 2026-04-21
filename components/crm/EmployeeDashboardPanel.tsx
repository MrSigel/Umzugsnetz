'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { StatCardGrid } from '@/components/crm/StatCardGrid';

type EmployeeDashboardPayload = {
  profile: {
    full_name: string | null;
    email: string | null;
    primary_role: string | null;
  } | null;
  employee: {
    status: string;
    scope: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  } | null;
  stats: {
    assignedApplicationsCount: number;
    leadCount: number;
    contactRequestCount: number;
  };
  applications: Array<{
    id: string;
    company_name: string;
    contact_name: string;
    email: string;
    location: string;
    status: string;
    verification_status: string;
    assigned_to_email: string | null;
    created_at: string;
  }>;
  leads: Array<{
    id: string;
    customer_name: string | null;
    service_code: string;
    city: string | null;
    status: string;
    requested_at: string;
  }>;
  contactRequests: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    support_category: string;
    status: string;
    created_at: string;
  }>;
};

function formatDate(value: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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

export function EmployeeDashboardPanel({ section }: { section: 'overview' | 'leads' }) {
  const { showToast } = useToast();
  const [payload, setPayload] = useState<EmployeeDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.access_token) {
          throw error || new Error('Sitzung nicht gefunden.');
        }

        const response = await fetch('/api/employee/dashboard', {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        const nextPayload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(nextPayload?.error || 'Mitarbeiterdaten konnten nicht geladen werden.');
        }

        setPayload(nextPayload);
      } catch (error: any) {
        showToast('error', 'Mitarbeiterdaten konnten nicht geladen werden', error.message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [showToast]);

  if (loading) {
    return (
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
        Mitarbeiterdaten werden geladen ...
      </section>
    );
  }

  if (!payload) {
    return (
      <section className="rounded-[2rem] border border-red-200 bg-red-50 p-8 text-sm text-red-700 shadow-sm">
        Es konnten keine Mitarbeiterdaten geladen werden.
      </section>
    );
  }

  if (section === 'overview') {
    return (
      <>
        <StatCardGrid
          items={[
            { label: 'Rolle', value: payload.profile?.primary_role || 'EMPLOYEE', hint: 'Interner Zugriff' },
            { label: 'Status', value: payload.employee?.status || 'AKTIV', hint: 'Mitarbeiterkonto' },
            { label: 'Partneranfragen', value: String(payload.stats.assignedApplicationsCount), hint: 'Zugeordnet oder offen' },
            { label: 'Kontaktanfragen', value: String(payload.stats.contactRequestCount), hint: 'Noch nicht erledigt' },
          ]}
        />

        <SectionCard title="Arbeitskontext" description="Operativer Scope fuer Mitarbeiter ohne Vollzugriff.">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Name:</span> {payload.profile?.full_name || '-'}</p>
              <p><span className="font-semibold text-slate-900">E-Mail:</span> {payload.profile?.email || '-'}</p>
              <p><span className="font-semibold text-slate-900">Status:</span> {payload.employee?.status || '-'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
              <p><span className="font-semibold text-slate-900">Leads im System:</span> {payload.stats.leadCount}</p>
              <p><span className="font-semibold text-slate-900">Letztes Update:</span> {formatDate(payload.employee?.updated_at || null)}</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Aktuelle Partneranfragen">
          <div className="space-y-3">
            {payload.applications.length > 0 ? payload.applications.map((application) => (
              <div key={application.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">{application.company_name}</p>
                <p className="mt-1">Kontakt: {application.contact_name}</p>
                <p className="mt-1">Ort: {application.location}</p>
                <p className="mt-1">Status: {application.status}</p>
                <p className="mt-1">Verifizierung: {application.verification_status}</p>
              </div>
            )) : <p className="text-sm text-slate-500">Keine Partneranfragen im Scope.</p>}
          </div>
        </SectionCard>
      </>
    );
  }

  return (
    <>
      <StatCardGrid
        items={[
          { label: 'Leads gesamt', value: String(payload.stats.leadCount), hint: 'Operativer Bestand' },
          { label: 'Kontaktanfragen', value: String(payload.stats.contactRequestCount), hint: 'Offene Kontakte' },
          { label: 'Partneranfragen', value: String(payload.stats.assignedApplicationsCount), hint: 'Im Mitarbeiter-Scope' },
          { label: 'Status', value: payload.employee?.status || 'AKTIV', hint: 'Mitarbeiterkonto' },
        ]}
      />

      <SectionCard title="Neueste Leads" description="Operative Sicht auf eingehende Leads.">
        <div className="space-y-3">
          {payload.leads.length > 0 ? payload.leads.map((lead) => (
            <div key={lead.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{lead.customer_name || 'Unbekannter Lead'}</p>
              <p className="mt-1">Leistung: {lead.service_code}</p>
              <p className="mt-1">Ort: {lead.city || '-'}</p>
              <p className="mt-1">Status: {lead.status}</p>
              <p className="mt-1">Angefragt: {formatDate(lead.requested_at)}</p>
            </div>
          )) : <p className="text-sm text-slate-500">Noch keine Leads vorhanden.</p>}
        </div>
      </SectionCard>

      <SectionCard title="Neueste Kontaktanfragen">
        <div className="space-y-3">
          {payload.contactRequests.length > 0 ? payload.contactRequests.map((request) => (
            <div key={request.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{request.first_name} {request.last_name}</p>
              <p className="mt-1">{request.email}</p>
              <p className="mt-1">Kategorie: {request.support_category}</p>
              <p className="mt-1">Status: {request.status}</p>
              <p className="mt-1">Erstellt: {formatDate(request.created_at)}</p>
            </div>
          )) : <p className="text-sm text-slate-500">Keine Kontaktanfragen vorhanden.</p>}
        </div>
      </SectionCard>
    </>
  );
}
