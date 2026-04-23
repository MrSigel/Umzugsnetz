'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Bell, LogOut, Menu, Search, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  baseNavigation,
  emptyStateBySection,
  kpiIcons,
  liveContentItems,
  sectionDescriptions,
  statusToneMap,
  toneClassMap,
  type AdminSectionId,
  type ContentRecord,
  type NavItem,
  type PortalLead,
  type PortalNotification,
  type PortalPartner,
  type PortalResponse,
  type PortalSetting,
  type PortalTeam,
  type PortalTicket,
  type PortalTransaction,
  type StaffRole,
  type StatusTone,
} from './dashboard-data';

type Column<T extends string> = {
  key: T;
  label: string;
};

type DistributionItem = {
  id: string;
  leadId: string;
  customer: string;
  area: string;
  suggestedPartners: Array<{ id: string; name: string }>;
  status: string;
};

const EMPTY_LEADS: PortalLead[] = [];
const EMPTY_PARTNERS: PortalPartner[] = [];
const EMPTY_TRANSACTIONS: PortalTransaction[] = [];
const EMPTY_NOTIFICATIONS: PortalNotification[] = [];
const EMPTY_SETTINGS: PortalSetting[] = [];
const EMPTY_TEAM: PortalTeam[] = [];
const EMPTY_TICKETS: NonNullable<PortalResponse['tickets']> = [];

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  } catch {
    return '-';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '-';
  }
}

function getLeadStatusTone(status?: string | null): StatusTone {
  return statusToneMap[String(status || '')] || 'slate';
}

function leadStatusLabel(status?: string | null) {
  const value = String(status || 'Neu');
  if (value === 'Kontaktiert') return 'GeprÃ¼ft';
  if (value === 'Angebot') return 'Gesendet';
  if (value === 'Gebucht') return 'Abgeschlossen';
  if (value === 'Abgelehnt') return 'Storniert';
  return value;
}

function StatusBadge({ label, tone }: { label: string; tone?: StatusTone }) {
  const resolvedTone = tone || statusToneMap[label] || 'slate';
  return <span className={cx('inline-flex rounded-full border px-3 py-1 text-xs font-black', toneClassMap[resolvedTone])}>{label}</span>;
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h2>
          {description ? <p className="mt-1 text-sm font-medium text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  change,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  tone: StatusTone;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.7rem] border border-white/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-blue/8 blur-3xl" />
      <div className={cx('relative flex h-12 w-12 items-center justify-center rounded-2xl border', toneClassMap[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="relative mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="relative mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="relative mt-2 text-sm font-semibold text-slate-500">{change}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
      <p className="text-base font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(2,118,200,0.12),transparent_28%),linear-gradient(180deg,#f6f9fc,#eef4f8)] p-6">
      <div className="rounded-[2rem] border border-white/80 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <Image src="/logo_transparent.png" alt="Umzugsnetz" width={180} height={44} className="mx-auto h-11 w-auto" priority />
        <p className="mt-5 font-black text-slate-950">LÃ¤dt Dashboard...</p>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(2,118,200,0.12),transparent_28%),linear-gradient(180deg,#f6f9fc,#eef4f8)] p-6">
      <div className="rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <Image src="/logo_transparent.png" alt="Umzugsnetz" width={180} height={44} className="mx-auto h-11 w-auto" priority />
        <p className="mt-5 font-black text-slate-950">{message}</p>
      </div>
    </main>
  );
}

function Sidebar({
  items,
  active,
  onSelect,
  mobileOpen,
  onClose,
}: {
  items: NavItem[];
  active: AdminSectionId;
  onSelect: (id: AdminSectionId) => void;
  mobileOpen: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <div className={cx('fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden', mobileOpen ? 'block' : 'hidden')} onClick={onClose} />
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-white/70 bg-white/95 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center justify-between">
          <Image src="/logo_transparent.png" alt="Umzugsnetz" width={170} height={44} className="h-10 w-auto" priority />
          <button type="button" onClick={onClose} className="rounded-2xl border border-slate-200 p-2 text-slate-500 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              className={cx(
                'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all',
                active === item.id ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span className="text-sm font-black">{item.label}</span>
              </span>
              {item.counter ? (
                <span className={cx('rounded-full px-2.5 py-1 text-[11px] font-black', active === item.id ? 'bg-white/15 text-white' : 'bg-white text-slate-500')}>
                  {item.counter}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}

function HeaderBar({
  active,
  search,
  onSearch,
  onOpenMenu,
  notifications,
  role,
  userEmail,
  onLogout,
}: {
  active: AdminSectionId;
  search: string;
  onSearch: (value: string) => void;
  onOpenMenu: () => void;
  notifications: PortalNotification[];
  role: StaffRole;
  userEmail?: string | null;
  onLogout: () => void;
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <header className="mb-6 rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={onOpenMenu} className="rounded-2xl border border-slate-200 p-3 text-slate-600 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-brand-blue">
              <Sparkles className="h-4 w-4" />
              Interne VerwaltungsoberflÃ¤che
            </div>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{baseNavigation[role].find((item) => item.id === active)?.label}</h1>
            <p className="mt-1 text-sm font-medium text-slate-500">{sectionDescriptions[active]}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1 sm:w-[280px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
            <input
              value={search}
              onChange={(event) => onSearch(event.target.value)}
              placeholder="Suche in Live-Daten"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none transition-colors focus:border-brand-blue"
            />
          </label>
          <div className="relative">
            <button type="button" onClick={() => { setShowNotifications((value) => !value); setShowProfile(false); }} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
              <Bell className="h-4 w-4 text-brand-blue" />
              {notifications.length} Hinweise
            </button>
            {showNotifications ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[320px] rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                {notifications.length ? (
                  <div className="space-y-2">
                    {notifications.slice(0, 5).map((item) => (
                      <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                        <p className="text-sm font-black text-slate-900">{item.title || 'Hinweis'}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{item.message || '-'}</p>
                        <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{formatDateTime(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">Keine Hinweise vorhanden.</p>
                )}
              </div>
            ) : null}
          </div>
          <div className="relative">
            <button type="button" onClick={() => { setShowProfile((value) => !value); setShowNotifications(false); }} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-left">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-blue text-white">
                {role === 'ADMIN' ? 'AD' : 'MA'}
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">{role === 'ADMIN' ? 'Admin Profil' : 'Mitarbeiter Profil'}</p>
                <p className="max-w-[180px] truncate text-xs font-medium text-slate-500">{userEmail || 'Live-System aktiv'}</p>
              </div>
            </button>
            {showProfile ? (
              <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-[260px] rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                  <p className="text-sm font-black text-slate-900">{role === 'ADMIN' ? 'Admin' : 'Mitarbeiter'}</p>
                  <p className="mt-1 break-all text-xs font-medium text-slate-500">{userEmail || '-'}</p>
                </div>
                <button type="button" onClick={onLogout} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-3 text-sm font-black text-white">
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

function DataTable<T extends { id: string }>({
  columns,
  rows,
  renderCell,
}: {
  columns: Column<string>[];
  rows: T[];
  renderCell: (row: T, key: string) => React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-[1.7rem] border border-slate-100">
      <div className="hidden grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-4 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-[0.16em] text-slate-400 md:grid" style={{ ['--cols' as string]: columns.length }}>
        {columns.map((column) => (
          <div key={column.key}>{column.label}</div>
        ))}
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-4 px-5 py-4 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]" style={{ ['--cols' as string]: columns.length }}>
            {columns.map((column) => (
              <div key={column.key} className="min-w-0">
                <p className="mb-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 md:hidden">{column.label}</p>
                <div className="text-sm font-semibold text-slate-700">{renderCell(row, column.key)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

async function patchPortal(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) {
    throw new Error('Bitte einloggen.');
  }

  const response = await fetch('/api/admin/portal', {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error || 'Aenderung konnte nicht gespeichert werden.');
  }

  return payload as PortalResponse;
}

function DashboardSection({
  leads,
  kpiCards,
  notifications,
  activities,
  search,
}: {
  leads: PortalLead[];
  kpiCards: Array<{ id: string; label: string; value: string; change: string; tone: StatusTone; icon: React.ComponentType<{ className?: string }> }>;
  notifications: PortalNotification[];
  activities: Array<{ id: string; title: string; meta: string; time: string; tone: StatusTone }>;
  search: string;
}) {
  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leads.slice(0, 8);
    return leads
      .filter((lead) => [lead.order_number, lead.customer_name, lead.city, lead.service_category].join(' ').toLowerCase().includes(query))
      .slice(0, 8);
  }, [leads, search]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {kpiCards.map((item) => (
          <KpiCard key={item.id} {...item} />
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.35fr_0.9fr]">
        <SectionCard title="Letzte Anfragen" description="Aktuelle Leads aus der Orders-Tabelle.">
          {filteredLeads.length ? (
            <DataTable<PortalLead>
              columns={[
                { key: 'customer', label: 'Kunde' },
                { key: 'service', label: 'Leistung' },
                { key: 'city', label: 'Stadt' },
                { key: 'price', label: 'Preis' },
                { key: 'status', label: 'Status' },
              ]}
              rows={filteredLeads.map((lead) => ({ ...lead, id: lead.id }))}
              renderCell={(row, key) => {
                if (key === 'customer') {
                  return (
                    <div>
                      <p className="font-black text-slate-900">{row.customer_name || 'Ohne Namen'}</p>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{row.order_number || row.id} Â· {formatDateTime(row.created_at)}</p>
                    </div>
                  );
                }
                if (key === 'service') return row.service_category || '-';
                if (key === 'city') return row.city || '-';
                if (key === 'price') return formatCurrency(row.estimated_price);
                if (key === 'status') return <StatusBadge label={leadStatusLabel(row.status)} tone={getLeadStatusTone(row.status)} />;
                return '-';
              }}
            />
          ) : (
            <EmptyState {...emptyStateBySection.dashboard} />
          )}
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Hinweise" description="Aktuelle Benachrichtigungen aus dem System.">
            {notifications.length ? (
              <div className="space-y-3">
                {notifications.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black text-slate-900">{item.title || 'Hinweis'}</p>
                      <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{formatDateTime(item.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-500">{item.message || '-'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Keine Hinweise vorhanden" text="In `notifications` liegen aktuell keine EintrÃ¤ge vor." />
            )}
          </SectionCard>

          <SectionCard title="AktivitÃ¤ten" description="Automatisch aus echten Leads, Tickets und Transaktionen abgeleitet.">
            {activities.length ? (
              <div className="space-y-3">
                {activities.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
                    <span className={cx('mt-1 h-3 w-3 rounded-full', item.tone === 'red' ? 'bg-red-500' : item.tone === 'emerald' ? 'bg-emerald-500' : item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'blue' ? 'bg-brand-blue' : 'bg-slate-400')} />
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">{item.meta}</p>
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Keine AktivitÃ¤ten vorhanden" text="Sobald neue Leads, Tickets oder Transaktionen eintreffen, erscheinen sie hier." />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function RequestsSection({ leads, search, onSave }: { leads: PortalLead[]; search: string; onSave: (payload: PortalResponse) => void }) {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return leads;
    return leads.filter((lead) => [lead.customer_name, lead.city, lead.service_category, lead.status, lead.order_number].join(' ').toLowerCase().includes(query));
  }, [leads, search]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [status, setStatus] = useState('Neu');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedLeadId('');
      return;
    }
    if (!filtered.some((lead) => lead.id === selectedLeadId)) {
      setSelectedLeadId(filtered[0].id);
    }
  }, [filtered, selectedLeadId]);

  const selectedLead = filtered.find((lead) => lead.id === selectedLeadId) || filtered[0];

  useEffect(() => {
    if (!selectedLead) return;
    setStatus(String(selectedLead.status || 'Neu'));
    setNotes(String(selectedLead.notes || ''));
  }, [selectedLead]);

  const saveLead = async () => {
    if (!selectedLead) return;
    setSaving(true);
    try {
      onSave(await patchPortal({
        action: 'updateLead',
        id: selectedLead.id,
        status,
        notes,
        scope: 'all',
      }));
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : 'Anfrage konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <SectionCard title="Anfragen" description="Nur echte Leads aus dem System.">
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedLeadId(row.id)}
                className={cx(
                  'w-full rounded-[1.5rem] border p-4 text-left transition-all',
                  selectedLeadId === row.id ? 'border-brand-blue bg-brand-blue/5 shadow-[0_12px_30px_rgba(2,118,200,0.12)]' : 'border-slate-100 bg-slate-50/80 hover:border-slate-200',
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">{row.customer_name || 'Ohne Namen'}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{row.customer_email || '-'} · {row.customer_phone || '-'}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-500">{row.service_category || '-'} · {row.von_city || '-'} → {row.nach_city || '-'}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <StatusBadge label={leadStatusLabel(row.status)} tone={getLeadStatusTone(row.status)} />
                    <span className="text-sm font-black text-slate-900">{formatCurrency(row.estimated_price)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.requests} />
        )}
      </SectionCard>

      <SectionCard title="Anfrage bearbeiten" description="Status und Notizen direkt speichern.">
        {selectedLead ? (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
              <p className="font-black text-slate-900">{selectedLead.customer_name || 'Ohne Namen'}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{selectedLead.order_number || selectedLead.id}</p>
              <p className="mt-3 text-sm font-semibold text-slate-600">{selectedLead.service_category || '-'} · {formatDate(selectedLead.move_date)}</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Status</label>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {['Neu', 'Kontaktiert', 'Angebot', 'Gebucht', 'Abgelehnt'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Notizen</label>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={8} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </div>
            <button type="button" onClick={saveLead} disabled={saving} className="w-full rounded-2xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60">
              {saving ? 'Speichert...' : 'Anfrage speichern'}
            </button>
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.requests} />
        )}
      </SectionCard>
    </div>
  );
}

function PartnersSection({ partners, search, onSave }: { partners: PortalPartner[]; search: string; onSave: (payload: PortalResponse) => void }) {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return partners;
    return partners.filter((partner) => [partner.name, partner.email, partner.phone, partner.regions, partner.category, partner.status].join(' ').toLowerCase().includes(query));
  }, [partners, search]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [partnerStatus, setPartnerStatus] = useState('ACTIVE');
  const [partnerCategory, setPartnerCategory] = useState('Standard Anfragen');
  const [partnerRegions, setPartnerRegions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!filtered.length) {
      setSelectedPartnerId('');
      return;
    }
    if (!filtered.some((partner) => partner.id === selectedPartnerId)) {
      setSelectedPartnerId(filtered[0].id);
    }
  }, [filtered, selectedPartnerId]);

  const selectedPartner = filtered.find((partner) => partner.id === selectedPartnerId) || filtered[0];

  useEffect(() => {
    if (!selectedPartner) return;
    setPartnerStatus(String(selectedPartner.status || 'ACTIVE'));
    setPartnerCategory(String(selectedPartner.category || 'Standard Anfragen'));
    setPartnerRegions(String(selectedPartner.regions || ''));
  }, [selectedPartner]);

  const savePartner = async () => {
    if (!selectedPartner) return;
    setSaving(true);
    try {
      onSave(await patchPortal({
        action: 'updatePartner',
        id: selectedPartner.id,
        status: partnerStatus,
        category: partnerCategory,
        regions: partnerRegions,
        scope: 'all',
      }));
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : 'Partner konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <SectionCard title="Partner" description="Reale Partnerdaten aus Supabase.">
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedPartnerId(row.id)}
                className={cx(
                  'w-full rounded-[1.5rem] border p-4 text-left transition-all',
                  selectedPartnerId === row.id ? 'border-brand-blue bg-brand-blue/5 shadow-[0_12px_30px_rgba(2,118,200,0.12)]' : 'border-slate-100 bg-slate-50/80 hover:border-slate-200',
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-black text-slate-900">{row.name || 'Unbenannter Partner'}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{[row.email, row.phone].filter(Boolean).join(' · ') || row.id}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-500">{row.regions || 'Keine Regionen'} · {row.service || 'BEIDES'}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <StatusBadge label={String(row.status || 'Unbekannt')} />
                    <span className="text-sm font-black text-slate-900">{formatCurrency(row.balance)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.partners} />
        )}
      </SectionCard>

      <SectionCard title="Partner bearbeiten" description="Status, Kategorie und Regionen aktualisieren.">
        {selectedPartner ? (
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
              <p className="font-black text-slate-900">{selectedPartner.name || 'Unbenannter Partner'}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{selectedPartner.email || '-'} · {selectedPartner.phone || '-'}</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Status</label>
              <select value={partnerStatus} onChange={(event) => setPartnerStatus(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {['ACTIVE', 'PENDING', 'SUSPENDED'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Kategorie</label>
              <select value={partnerCategory} onChange={(event) => setPartnerCategory(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {['Standard Anfragen', 'Priorisierte Anfragen', 'Exklusive Anfragen'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Regionen</label>
              <textarea value={partnerRegions} onChange={(event) => setPartnerRegions(event.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </div>
            <button type="button" onClick={savePartner} disabled={saving} className="w-full rounded-2xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60">
              {saving ? 'Speichert...' : 'Partner speichern'}
            </button>
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.partners} />
        )}
      </SectionCard>
    </div>
  );
}

function DistributionSection({ items, onSave }: { items: DistributionItem[]; onSave: (payload: PortalResponse) => void }) {
  const [savingLeadId, setSavingLeadId] = useState('');

  const assignPartner = async (leadId: string, partnerId: string) => {
    setSavingLeadId(leadId);
    try {
      onSave(await patchPortal({
        action: 'assignLeadPartner',
        id: leadId,
        partnerId,
        scope: 'all',
      }));
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : 'Lead konnte nicht zugewiesen werden.');
    } finally {
      setSavingLeadId('');
    }
  };

  return (
    <SectionCard title="Lead-Verteilung" description="Offene Leads mit tatsaechlich passenden Partnern auf Basis der Regionen.">
      {items.length ? (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-[1.7rem] border border-slate-100 bg-slate-50/80 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-black text-slate-950">{item.customer}</p>
                    <StatusBadge label={item.status} tone={item.status === 'Ohne Match' ? 'red' : item.status === 'Offen' ? 'amber' : 'blue'} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-500">{item.leadId} · {item.area}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.suggestedPartners.length ? item.suggestedPartners.map((partner) => (
                      <button
                        key={partner.id}
                        type="button"
                        onClick={() => assignPartner(item.id, partner.id)}
                        disabled={savingLeadId === item.id}
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-brand-blue hover:text-brand-blue disabled:opacity-60"
                      >
                        {savingLeadId === item.id ? 'Speichert...' : partner.name}
                      </button>
                    )) : <span className="text-sm font-medium text-slate-500">Kein regionaler Partner gefunden.</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState {...emptyStateBySection.distribution} />
      )}
    </SectionCard>
  );
}

function BillingSection({ transactions }: { transactions: PortalTransaction[] }) {
  const totals = useMemo(() => {
    const totalRevenue = transactions.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0);
    const openCount = transactions.filter((item) => String(item.type || '').toLowerCase().includes('offen')).length;
    return {
      totalRevenue,
      transactionCount: transactions.length,
      openCount,
    };
  }, [transactions]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
      <SectionCard title="Abrechnung" description="Echte Finanzbewegungen aus der Transactions-Tabelle.">
        {transactions.length ? (
          <DataTable<PortalTransaction>
            columns={[
              { key: 'type', label: 'Typ' },
              { key: 'description', label: 'Beschreibung' },
              { key: 'created', label: 'Datum' },
              { key: 'amount', label: 'Betrag' },
            ]}
            rows={transactions}
            renderCell={(row, key) => {
              if (key === 'type') return row.type || '-';
              if (key === 'description') return row.description || '-';
              if (key === 'created') return formatDateTime(row.created_at);
              if (key === 'amount') return formatCurrency(row.amount);
              return '-';
            }}
          />
        ) : (
          <EmptyState {...emptyStateBySection.billing} />
        )}
      </SectionCard>

      <SectionCard title="Finanzstatus" description="Direkt aus den vorhandenen Transaktionen berechnet.">
        <div className="space-y-4">
          {[
            ['Gesamtumsatz', formatCurrency(totals.totalRevenue)],
            ['Transaktionen', String(totals.transactionCount)],
            ['Offene Buchungen', String(totals.openCount)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.7rem] border border-slate-100 bg-slate-50/80 p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ContentSection({ search }: { search: string }) {
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return liveContentItems;
    return liveContentItems.filter((item) => [item.title, item.category, item.owner, item.route].join(' ').toLowerCase().includes(query));
  }, [search]);

  return (
    <SectionCard title="Inhalte" description="TatsÃ¤chlich vorhandene Ratgeber- und FAQ-Inhalte der Website.">
      {filtered.length ? (
        <DataTable<ContentRecord>
          columns={[
            { key: 'title', label: 'Titel' },
            { key: 'category', label: 'Kategorie' },
            { key: 'owner', label: 'Verantwortlich' },
            { key: 'route', label: 'Route' },
            { key: 'status', label: 'Status' },
          ]}
          rows={filtered}
          renderCell={(row, key) => {
            if (key === 'title') return row.title;
            if (key === 'category') return row.category;
            if (key === 'owner') return row.owner;
            if (key === 'route') return <Link href={row.route} className="font-black text-brand-blue hover:underline">{row.route}</Link>;
            if (key === 'status') return <StatusBadge label={row.status} />;
            return '-';
          }}
        />
      ) : (
        <EmptyState {...emptyStateBySection.content} />
      )}
    </SectionCard>
  );
}

function SettingsSection({ settings, team, onSave }: { settings: PortalSetting[]; team: PortalTeam[]; onSave: (payload: PortalResponse) => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingSettingId, setSavingSettingId] = useState('');
  const [savingTeamId, setSavingTeamId] = useState('');

  useEffect(() => {
    const nextDrafts: Record<string, string> = {};
    settings.forEach((item) => {
      nextDrafts[item.id] = typeof item.value === 'object' ? JSON.stringify(item.value, null, 2) : String(item.value ?? '');
    });
    setDrafts(nextDrafts);
  }, [settings]);

  const saveSetting = async (item: PortalSetting) => {
    const raw = drafts[item.id] ?? '';
    let value: unknown = raw;
    try {
      value = JSON.parse(raw);
    } catch {
      value = raw;
    }

    setSavingSettingId(item.id);
    try {
      onSave(await patchPortal({
        action: 'updateSetting',
        id: item.id,
        key: item.key,
        value,
        scope: 'all',
      }));
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : 'Einstellung konnte nicht gespeichert werden.');
    } finally {
      setSavingSettingId('');
    }
  };

  const updateTeamStatus = async (member: PortalTeam, status: string) => {
    setSavingTeamId(member.id);
    try {
      onSave(await patchPortal({
        action: 'updateTeam',
        id: member.id,
        status,
        scope: 'all',
      }));
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : 'Team-Status konnte nicht gespeichert werden.');
    } finally {
      setSavingTeamId('');
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionCard title="Systemeinstellungen" description="Echte Eintraege aus `system_settings`.">
        {settings.length ? (
          <div className="space-y-4">
            {settings.map((item) => (
              <div key={item.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.key || 'Schluessel'}</p>
                <textarea
                  value={drafts[item.id] ?? ''}
                  onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
                  rows={6}
                  className="mt-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                />
                <button type="button" onClick={() => saveSetting(item)} disabled={savingSettingId === item.id} className="mt-3 rounded-2xl bg-brand-blue px-4 py-2.5 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60">
                  {savingSettingId === item.id ? 'Speichert...' : 'Speichern'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.settings} />
        )}
      </SectionCard>

      <SectionCard title="Team" description="Aktuelle Nutzerstruktur aus `team`.">
        {team.length ? (
          <div className="space-y-3">
            {team.map((member) => (
              <div key={member.id} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-black text-slate-900">{member.email || 'Ohne E-Mail'}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">{member.role || '-'} · {formatDateTime(member.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={String(member.status || 'PENDING')} onChange={(event) => updateTeamStatus(member, event.target.value)} disabled={savingTeamId === member.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue disabled:opacity-60">
                      {['PENDING', 'ACTIVE', 'DISABLED'].map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <StatusBadge label={String(member.status || 'Unbekannt')} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Kein Team geladen" text="In der `team`-Tabelle liegen aktuell keine sichtbaren Eintraege vor." />
        )}
      </SectionCard>
    </div>
  );
}

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSectionId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [portal, setPortal] = useState<PortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeePassword, setEmployeePassword] = useState('');
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [ticketSavingSessionId, setTicketSavingSessionId] = useState('');
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  useEffect(() => {
    const loadPortal = async () => {
      setLoading(true);
      setError('');
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        setCurrentUserEmail(sessionData.session?.user?.email || '');
        if (!token) {
          setError('Bitte einloggen.');
          return;
        }

        const response = await fetch('/api/admin/portal?scope=all', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          setError(payload?.error || 'Dashboard konnte nicht geladen werden.');
          return;
        }

        setPortal(payload);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Dashboard konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    loadPortal();
  }, []);

  const role = portal?.role || 'EMPLOYEE';
  const leads = portal?.leads ?? EMPTY_LEADS;
  const partners = portal?.partners ?? EMPTY_PARTNERS;
  const transactions = portal?.transactions ?? EMPTY_TRANSACTIONS;
  const notifications = portal?.notifications ?? EMPTY_NOTIFICATIONS;
  const settings = portal?.settings ?? EMPTY_SETTINGS;
  const team = portal?.team ?? EMPTY_TEAM;
  const tickets = portal?.tickets ?? EMPTY_TICKETS;

  const navigation = useMemo(() => {
    return baseNavigation[role].map((item) => {
      if (item.id === 'requests') return { ...item, counter: String(leads.length) };
      if (item.id === 'partners') return { ...item, counter: String(partners.length) };
      if (item.id === 'distribution') return { ...item, counter: String(leads.filter((lead) => ['Neu', 'Kontaktiert', 'Angebot'].includes(String(lead.status || ''))).length) };
      if (item.id === 'employees') return { ...item, counter: String(team.length) };
      if (item.id === 'tickets') return { ...item, counter: String(tickets.length) };
      if (item.id === 'billing') return { ...item, counter: String(transactions.length) };
      if (item.id === 'settings') return { ...item, counter: String(settings.length || team.length) };
      return item;
    });
  }, [role, leads, partners, tickets.length, transactions.length, settings.length, team.length]);

  const distributionItems = useMemo<DistributionItem[]>(() => {
    return leads
      .filter((lead) => ['Neu', 'Kontaktiert', 'Angebot'].includes(String(lead.status || '')))
      .slice(0, 20)
      .map((lead) => {
        const city = String(lead.city || lead.von_city || '').trim();
        const matches = partners
          .filter((partner) => String(partner.regions || '').toLowerCase().includes(city.toLowerCase()))
          .map((partner) => ({ id: partner.id, name: partner.name || 'Partner' }))
          .filter((partner) => Boolean(partner.id && partner.name));

        return {
          id: lead.id,
          leadId: lead.order_number || lead.id,
          customer: lead.customer_name || 'Ohne Namen',
          area: city || 'Keine Region',
          suggestedPartners: matches,
          status: matches.length ? 'Offen' : 'Ohne Match',
        };
      });
  }, [leads, partners]);

  const kpiCards = useMemo(() => {
    const now = new Date();
    const todayString = now.toDateString();
    const newToday = leads.filter((lead) => lead.created_at && new Date(lead.created_at).toDateString() === todayString).length;
    const openLeads = leads.filter((lead) => !['Gebucht', 'Abgelehnt'].includes(String(lead.status || ''))).length;
    const activePartners = partners.filter((partner) => String(partner.status || '').toUpperCase() === 'ACTIVE' || String(partner.status || '').toLowerCase() === 'aktiv').length;
    const complaints = notifications.filter((item) => `${item.title || ''} ${item.message || ''}`.toLowerCase().includes('reklam')).length
      + tickets.filter((item) => String(item.support_category || '').toLowerCase().includes('reklam')).length;

    return [
      { id: 'today', label: 'Neue Leads heute', value: String(newToday), change: 'seit 00:00 Uhr', tone: 'blue' as StatusTone, icon: kpiIcons.leadsToday },
      { id: 'open', label: 'Offene Leads', value: String(openLeads), change: 'ohne Abschluss oder Storno', tone: 'amber' as StatusTone, icon: kpiIcons.openLeads },
      { id: 'partners', label: 'Aktive Partner', value: String(activePartners), change: `${partners.length} Partner gesamt`, tone: 'emerald' as StatusTone, icon: kpiIcons.activePartners },
      { id: 'conversion', label: 'Conversion-Rate', value: `${portal?.kpis?.closeRate || 0}%`, change: `${portal?.kpis?.orders || 0} Abschluesse`, tone: 'slate' as StatusTone, icon: kpiIcons.conversion },
      { id: 'revenue', label: 'Umsatz', value: formatCurrency(portal?.kpis?.revenue || 0), change: `${transactions.length} Transaktionen`, tone: 'blue' as StatusTone, icon: kpiIcons.revenue },
      { id: 'complaints', label: 'Reklamationen', value: String(complaints), change: `${tickets.length} Tickets im System`, tone: complaints > 0 ? 'red' as StatusTone : 'slate' as StatusTone, icon: kpiIcons.complaints },
    ];
  }, [leads, notifications, partners, portal?.kpis?.closeRate, portal?.kpis?.orders, portal?.kpis?.revenue, tickets, transactions.length]);

  const activities = useMemo(() => {
    const leadActivities = leads.slice(0, 3).map((lead) => ({
      id: `lead-${lead.id}`,
      title: `Lead ${lead.order_number || lead.id} eingegangen`,
      meta: `${lead.customer_name || 'Ohne Namen'} Â· ${lead.city || lead.von_city || 'Ohne Stadt'}`,
      time: formatDateTime(lead.created_at),
      tone: getLeadStatusTone(lead.status),
    }));
    const transactionActivities = transactions.slice(0, 2).map((item) => ({
      id: `tx-${item.id}`,
      title: item.type || 'Transaktion',
      meta: item.description || formatCurrency(item.amount),
      time: formatDateTime(item.created_at),
      tone: Number(item.amount || 0) >= 0 ? 'emerald' as StatusTone : 'red' as StatusTone,
    }));
    const ticketActivities = tickets.slice(0, 2).map((ticket) => ({
      id: `ticket-${ticket.session_id}`,
      title: ticket.user_name || 'Support-Ticket',
      meta: ticket.last_message || 'Neue Nachricht',
      time: formatDateTime(ticket.last_at),
      tone: ticket.unread_count ? 'amber' as StatusTone : 'slate' as StatusTone,
    }));

    return [...leadActivities, ...transactionActivities, ...ticketActivities]
      .filter((item) => item.time !== '-')
      .slice(0, 7);
  }, [leads, tickets, transactions]);

  const handlePortalSave = (payload: PortalResponse) => {
    setPortal(payload);
    setError('');
  };

  const createEmployee = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!employeeEmail.trim() || employeePassword.length < 8) {
      setError('E-Mail und Passwort mit mindestens 8 Zeichen erforderlich.');
      return;
    }

    setEmployeeSubmitting(true);
    setError('');
    try {
      const payload = await patchPortal({
          action: 'createTeamMember',
          email: employeeEmail.trim().toLowerCase(),
          password: employeePassword,
          role: 'EMPLOYEE',
          scope: 'all',
        });
      handlePortalSave(payload);
      setEmployeeEmail('');
      setEmployeePassword('');
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : 'Mitarbeiter konnte nicht erstellt werden.');
    } finally {
      setEmployeeSubmitting(false);
    }
  };

  const markTicketRead = async (ticket: PortalTicket) => {
    setTicketSavingSessionId(ticket.session_id);
    setError('');
    try {
      handlePortalSave(await patchPortal({
        action: 'markTicketRead',
        sessionId: ticket.session_id,
        scope: 'all',
      }));
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : 'Ticket konnte nicht aktualisiert werden.');
    } finally {
      setTicketSavingSessionId('');
    }
  };

  if (loading) return <LoadingState />;
  if (error || !portal) return <ErrorState message={error || 'Dashboard konnte nicht geladen werden.'} />;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(2,118,200,0.12),transparent_28%),linear-gradient(180deg,#f6f9fc,#eef4f8)] text-slate-900">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(2,118,200,0.16),transparent_60%)]" />
      <div className="relative lg:grid lg:min-h-screen lg:grid-cols-[290px_1fr]">
        <Sidebar items={navigation} active={activeSection} onSelect={setActiveSection} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          <HeaderBar
            active={activeSection}
            search={search}
            onSearch={setSearch}
            onOpenMenu={() => setMobileOpen(true)}
            notifications={notifications}
            role={role}
            userEmail={currentUserEmail || null}
            onLogout={handleLogout}
          />

          {activeSection === 'dashboard' ? <DashboardSection leads={leads} kpiCards={kpiCards} notifications={notifications} activities={activities} search={search} /> : null}
          {activeSection === 'requests' ? <RequestsSection leads={leads} search={search} onSave={handlePortalSave} /> : null}
          {activeSection === 'partners' && role === 'ADMIN' ? <PartnersSection partners={partners} search={search} onSave={handlePortalSave} /> : null}
          {activeSection === 'distribution' ? <DistributionSection items={distributionItems} onSave={handlePortalSave} /> : null}
          {activeSection === 'employees' && role === 'ADMIN' ? (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <SectionCard title="Mitarbeiter anlegen" description="Neue E-Mail und Passwort eingeben. Der Account wird direkt als Mitarbeiter erstellt.">
                <form onSubmit={createEmployee} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">E-Mail</label>
                    <input
                      type="email"
                      required
                      value={employeeEmail}
                      onChange={(event) => setEmployeeEmail(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                      placeholder="mitarbeiter@umzugsnetz.de"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Passwort</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={employeePassword}
                      onChange={(event) => setEmployeePassword(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                      placeholder="Mindestens 8 Zeichen"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={employeeSubmitting}
                    className="w-full rounded-2xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
                  >
                    {employeeSubmitting ? 'Wird erstellt...' : 'Mitarbeiter erstellen'}
                  </button>
                </form>
              </SectionCard>

              <SectionCard title="Bestehende Mitarbeiter" description="Alle vorhandenen Team-EintrÃ¤ge aus dem System.">
                {team.length ? (
                  <div className="space-y-3">
                    {team.map((member) => (
                      <div key={member.id} className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-slate-950">{member.email || 'Ohne E-Mail'}</p>
                            <p className="mt-2 text-sm font-medium text-slate-500">
                              {member.role || '-'} Â· {formatDateTime(member.created_at)}
                            </p>
                          </div>
                          <StatusBadge label={String(member.status || 'Unbekannt')} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState {...emptyStateBySection.employees} />
                )}
              </SectionCard>
            </div>
          ) : null}
          {activeSection === 'tickets' ? (
            <SectionCard title="Tickets" description="Gespeicherte Live-Chat-Anfragen aus `chat_messages`.">
              {tickets.length ? (
                <div className="space-y-4">
                  {tickets.map((ticket) => (
                    <div key={ticket.session_id} className="rounded-[1.6rem] border border-slate-100 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-5">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-black text-slate-950">{ticket.user_name || 'Unbekannter Chat'}</p>
                            <StatusBadge label={String(ticket.support_category || 'KUNDE')} />
                            {ticket.unread_count ? <StatusBadge label={`${ticket.unread_count} neu`} tone="amber" /> : null}
                          </div>
                          <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">{ticket.session_id}</p>
                          <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600">{ticket.last_message || 'Keine Nachricht vorhanden.'}</p>
                        </div>
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Letzte AktivitÃ¤t</p>
                          <p className="mt-2 text-sm font-black text-slate-900">{formatDateTime(ticket.last_at)}</p>
                          {ticket.unread_count ? (
                            <button
                              type="button"
                              onClick={() => markTicketRead(ticket)}
                              disabled={ticketSavingSessionId === ticket.session_id}
                              className="mt-3 rounded-2xl bg-brand-blue px-4 py-2 text-xs font-black text-white disabled:opacity-60"
                            >
                              {ticketSavingSessionId === ticket.session_id ? 'Speichert...' : 'Als gelesen markieren'}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState {...emptyStateBySection.tickets} />
              )}
            </SectionCard>
          ) : null}
          {activeSection === 'billing' && role === 'ADMIN' ? <BillingSection transactions={transactions} /> : null}
          {activeSection === 'content' ? <ContentSection search={search} /> : null}
          {activeSection === 'settings' && role === 'ADMIN' ? <SettingsSection settings={settings} team={team} onSave={handlePortalSave} /> : null}
        </div>
      </div>
    </main>
  );
}

