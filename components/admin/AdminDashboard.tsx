'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Mail,
  MapPin,
  LogOut,
  Menu,
  PhoneCall,
  RefreshCcw,
  Trash2,
  Truck,
  XCircle,
  X,
} from 'lucide-react';
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

function normalizeSearch(value: unknown) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchesSearch(query: string, values: unknown[]) {
  if (!query) return true;
  return normalizeSearch(values.join(' ')).includes(query);
}

function roleLabel(role: StaffRole | 'PARTNER') {
  if (role === 'ADMIN') return 'Geschäftsführer';
  if (role === 'EMPLOYEE') return 'Mitarbeiter';
  return 'Partner';
}

function teamRoleLabel(role?: string | null) {
  const normalizedRole = String(role || '').trim().toUpperCase();
  if (normalizedRole === 'ADMIN' || normalizedRole === 'ADMINISTRATOR' || normalizedRole === 'DEVELOPER') return 'Geschäftsführer';
  if (normalizedRole === 'EMPLOYEE' || normalizedRole === 'MITARBEITER') return 'Mitarbeiter';
  if (normalizedRole === 'PARTNER') return 'Partner';
  return role || '-';
}

function teamStatusLabel(status?: string | null) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  if (normalizedStatus === 'ACTIVE') return 'Aktiv';
  if (normalizedStatus === 'PENDING') return 'Einladung offen';
  if (normalizedStatus === 'DISABLED') return 'Gesperrt';
  return status || 'Unbekannt';
}

function partnerStatusLabel(status?: string | null) {
  const normalizedStatus = String(status || '').trim().toUpperCase();
  if (normalizedStatus === 'ACTIVE') return 'Aktiv';
  if (normalizedStatus === 'PENDING') return 'In Prüfung';
  if (normalizedStatus === 'SUSPENDED') return 'Pausiert';
  return status || 'Unbekannt';
}

function partnerServiceLabel(service?: string | null) {
  const normalizedService = String(service || '').trim().toUpperCase();
  if (normalizedService === 'UMZUG') return 'Umzug';
  if (normalizedService === 'ENTRÜMPELUNG' || normalizedService === 'ENTRUEMPELUNG') return 'Entrümpelung';
  if (normalizedService === 'BEIDES') return 'Umzug und Entrümpelung';
  return service || 'Umzug und Entrümpelung';
}

function pricingCategoryLabel(category: string) {
  const normalizedCategory = category.trim().toLowerCase();
  if (normalizedCategory === 'umzug') return 'Umzug';
  if (normalizedCategory === 'entruempelung') return 'Entrümpelung';
  return category;
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
  if (value === 'Kontaktiert') return 'Geprüft';
  if (value === 'Angebot') return 'Gesendet';
  if (value === 'Gebucht') return 'Abgeschlossen';
  if (value === 'Abgelehnt') return 'Storniert';
  return value;
}

function contentStatusLabel(status?: string | null) {
  if (String(status || '').toLowerCase() === 'live') return 'Veröffentlicht';
  return status || 'Unbekannt';
}

function StatusBadge({ label, tone }: { label: string; tone?: StatusTone }) {
  const resolvedTone = tone || statusToneMap[label] || 'slate';
  return <span className={cx('inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold', toneClassMap[resolvedTone])}>{label}</span>;
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <div className={cx('flex h-9 w-9 items-center justify-center rounded-lg border', toneClassMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{change}</p>
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Image src="/logo_transparent.png" alt="Umzugsnetz" width={180} height={44} className="mx-auto h-10 w-auto" priority />
        <p className="mt-5 text-sm font-semibold text-slate-600">Übersicht wird geladen…</p>
      </div>
    </main>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Image src="/logo_transparent.png" alt="Umzugsnetz" width={180} height={44} className="mx-auto h-10 w-auto" priority />
        <p className="mt-5 text-sm font-semibold text-slate-700">{message}</p>
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
  onLogout,
  notifications,
  userEmail,
  role,
  onMarkNotificationsRead,
  notificationsSaving,
}: {
  items: NavItem[];
  active: AdminSectionId;
  onSelect: (id: AdminSectionId) => void;
  mobileOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  notifications: PortalNotification[];
  userEmail?: string | null;
  role: StaffRole;
  onMarkNotificationsRead: () => void;
  notificationsSaving: boolean;
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadNotifications = notifications.filter((item) => item.is_read !== true);

  return (
    <>
      <div className={cx('fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden', mobileOpen ? 'block' : 'hidden')} onClick={onClose} />
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col overflow-y-auto border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-brand-blue px-5 py-5">
          <Image src="/logo_transparent.png" alt="Umzugsnetz" width={150} height={36} className="h-8 w-auto brightness-0 invert" priority />
          <button type="button" onClick={onClose} className="rounded-lg border border-white/30 p-1.5 text-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
                onClose();
              }}
              className={cx(
                'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                active === item.id
                  ? 'bg-brand-blue/10 font-semibold text-brand-blue'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
              )}
            >
              <span className="flex items-center gap-3">
                <item.icon className={cx('h-4 w-4', active === item.id ? 'text-brand-blue' : 'text-slate-400')} />
                <span className="text-sm">{item.label}</span>
              </span>
              {item.counter ? (
                <span className={cx(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  active === item.id ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-500',
                )}>
                  {item.counter}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="space-y-2 border-t border-slate-200 px-3 py-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotifications((value) => !value)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-blue" />
                Hinweise
              </span>
              <span className={cx(
                'rounded-full px-2 py-0.5 text-[10px] font-bold',
                unreadNotifications.length > 0 ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-500',
              )}>
                {unreadNotifications.length}
              </span>
            </button>
            {showNotifications ? (
              <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-full rounded-xl border border-slate-200 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                {unreadNotifications.length ? (
                  <div className="space-y-1">
                    <div className="mb-2 flex items-center justify-between gap-3 px-2 pt-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Ungelesen</p>
                      <button type="button" onClick={onMarkNotificationsRead} disabled={notificationsSaving} className="text-xs font-semibold text-brand-blue disabled:opacity-60">
                        {notificationsSaving ? 'Speichert…' : 'Alle gelesen'}
                      </button>
                    </div>
                    {unreadNotifications.slice(0, 5).map((item) => (
                      <div key={item.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-900">{item.title || 'Hinweis'}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{item.message || '-'}</p>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{formatDateTime(item.created_at)}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">Keine Hinweise vorhanden.</p>
                )}
              </div>
            ) : null}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="break-all text-sm font-semibold text-slate-900">{userEmail || '-'}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{roleLabel(role)}</p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-red-200 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      </aside>
    </>
  );
}

function HeaderBar({
  title,
  description,
  onOpenMenu,
}: {
  title: string;
  description?: string;
  onOpenMenu: () => void;
}) {
  return (
    <header className="mb-6 flex items-start justify-between gap-3 border-b border-slate-200 pb-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Menü öffnen"
          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {description ? <p className="mt-1 text-sm font-medium text-slate-500">{description}</p> : null}
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
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div
        className="hidden grid-cols-[repeat(var(--cols),minmax(0,1fr))] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:grid"
        style={{ ['--cols' as string]: columns.length }}
      >
        {columns.map((column) => (
          <div key={column.key}>{column.label}</div>
        ))}
      </div>
      <div className="divide-y divide-slate-100 bg-white">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid gap-4 px-5 py-3.5 transition-colors hover:bg-slate-50 md:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
            style={{ ['--cols' as string]: columns.length }}
          >
            {columns.map((column) => (
              <div key={column.key} className="min-w-0">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 md:hidden">{column.label}</p>
                <div className="text-sm font-medium text-slate-700">{renderCell(row, column.key)}</div>
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
    throw new Error(payload?.error || 'Änderung konnte nicht gespeichert werden.');
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
    const query = normalizeSearch(search.trim());
    if (!query) return leads.slice(0, 8);
    return leads
      .filter((lead) => matchesSearch(query, [lead.order_number, lead.customer_name, lead.customer_email, lead.customer_phone, lead.city, lead.service_category, lead.status]))
      .slice(0, 8);
  }, [leads, search]);
  const filteredNotifications = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return notifications.filter((item) => matchesSearch(query, [item.title, item.message, item.created_at]));
  }, [notifications, search]);
  const filteredActivities = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return activities.filter((item) => matchesSearch(query, [item.title, item.meta, item.time]));
  }, [activities, search]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {kpiCards.map((item) => (
          <KpiCard key={item.id} {...item} />
        ))}
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.35fr_0.9fr]">
        <SectionCard title="Letzte Anfragen">
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
                      <p className="font-semibold text-slate-900">{row.customer_name || 'Ohne Namen'}</p>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{row.order_number || row.id} · {formatDateTime(row.created_at)}</p>
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
          <SectionCard title="Hinweise">
            {filteredNotifications.length ? (
              <div className="space-y-3">
                {filteredNotifications.slice(0, 6).map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{item.title || 'Hinweis'}</p>
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{formatDateTime(item.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-slate-500">{item.message || '-'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Keine Hinweise vorhanden" text="Aktuell gibt es keine passenden Hinweise." />
            )}
          </SectionCard>

          <SectionCard title="Aktivitäten">
            {filteredActivities.length ? (
              <div className="space-y-3">
                {filteredActivities.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
                    <span className={cx('mt-1 h-3 w-3 rounded-full', item.tone === 'red' ? 'bg-red-500' : item.tone === 'emerald' ? 'bg-emerald-500' : item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'blue' ? 'bg-brand-blue' : 'bg-slate-400')} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{item.title}</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">{item.meta}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{item.time}</span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Keine Aktivitäten vorhanden" text="Sobald neue Anfragen, Support-Anfragen oder Transaktionen eintreffen, erscheinen sie hier." />
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function EmployeeOverviewSection({ stats, leads, tickets }: { stats?: PortalResponse['workStats']; leads: PortalLead[]; tickets: PortalTicket[] }) {
  const resolvedStats = stats || {
    totalCalls: 0,
    callsToday: 0,
    callsThisHour: 0,
    won: 0,
    lost: 0,
    recontact: 0,
    deleted: 0,
    successRate: 0,
    lastCallAt: null,
  };
  const openLeads = leads.filter((lead) => !['Gebucht', 'Abgelehnt'].includes(String(lead.status || ''))).length;
  const unreadSupport = tickets.reduce((sum, ticket) => sum + Number(ticket.unread_count || 0), 0);
  const cards = [
    { id: 'calls-total', label: 'Anrufe insgesamt', value: String(resolvedStats.totalCalls), change: 'aus deinem Arbeitsprotokoll', tone: 'blue' as StatusTone, icon: kpiIcons.leadsToday },
    { id: 'calls-hour', label: 'Anrufe diese Stunde', value: String(resolvedStats.callsThisHour), change: `${resolvedStats.callsToday} Anrufe heute`, tone: 'amber' as StatusTone, icon: kpiIcons.openLeads },
    { id: 'won', label: 'Gewonnen', value: String(resolvedStats.won), change: `${resolvedStats.successRate}% Abschlussquote`, tone: 'emerald' as StatusTone, icon: kpiIcons.conversion },
    { id: 'lost', label: 'Verloren', value: String(resolvedStats.lost), change: `${resolvedStats.recontact} neu kontaktieren`, tone: 'red' as StatusTone, icon: kpiIcons.complaints },
    { id: 'deleted', label: 'Gelöscht', value: String(resolvedStats.deleted), change: 'vollständig entfernt', tone: 'slate' as StatusTone, icon: kpiIcons.complaints },
    { id: 'open', label: 'Offene Kunden', value: String(openLeads), change: `${unreadSupport} neue Support-Nachrichten`, tone: 'blue' as StatusTone, icon: kpiIcons.activePartners },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {cards.map((item) => (
          <KpiCard key={item.id} {...item} />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Deine Zahlen">
          <div className="space-y-3">
            {[
              ['Anrufe heute', String(resolvedStats.callsToday)],
              ['Anrufe diese Stunde', String(resolvedStats.callsThisHour)],
              ['Gewonnen', String(resolvedStats.won)],
              ['Verloren', String(resolvedStats.lost)],
              ['Neu kontaktieren', String(resolvedStats.recontact)],
              ['Gelöscht', String(resolvedStats.deleted)],
              ['Letzter Anruf', formatDateTime(resolvedStats.lastCallAt)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
                <span className="text-sm font-semibold text-slate-900">{value}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Aktueller Arbeitsstand">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Nächster Schritt</p>
              <p className="mt-2 text-lg font-bold text-slate-950">Arbeiten öffnen und nächsten Kunden anrufen</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Kundenservice</p>
              <p className="mt-2 text-lg font-bold text-slate-950">{unreadSupport} ungelesene Support-Nachrichten</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function RequestsSection({ leads, search, onSave }: { leads: PortalLead[]; search: string; onSave: (payload: PortalResponse) => void }) {
  const filtered = useMemo(() => {
    const query = normalizeSearch(search.trim());
    if (!query) return leads;
    return leads.filter((lead) => matchesSearch(query, [lead.customer_name, lead.customer_email, lead.customer_phone, lead.city, lead.von_city, lead.nach_city, lead.service_category, lead.status, lead.order_number, lead.notes]));
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
      <SectionCard title="Anfragen">
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedLeadId(row.id)}
                className={cx(
                  'w-full rounded-xl border p-4 text-left transition-all',
                  selectedLeadId === row.id ? 'border-brand-blue bg-brand-blue/5 shadow-[0_12px_30px_rgba(2,118,200,0.12)]' : 'border-slate-100 bg-slate-50 hover:border-slate-200',
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{row.customer_name || 'Ohne Namen'}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{row.customer_email || '-'} · {row.customer_phone || '-'}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-500">{row.service_category || '-'} · {row.von_city || '-'} → {row.nach_city || '-'}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <StatusBadge label={leadStatusLabel(row.status)} tone={getLeadStatusTone(row.status)} />
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(row.estimated_price)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.requests} />
        )}
      </SectionCard>

      <SectionCard title="Anfrage bearbeiten">
        {selectedLead ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{selectedLead.customer_name || 'Ohne Namen'}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{selectedLead.order_number || selectedLead.id}</p>
              <p className="mt-3 text-sm font-semibold text-slate-600">{selectedLead.service_category || '-'} · {formatDate(selectedLead.move_date)}</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</label>
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {['Neu', 'Kontaktiert', 'Angebot', 'Gebucht', 'Abgelehnt'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Notizen</label>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={8} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </div>
            <button type="button" onClick={saveLead} disabled={saving} className="w-full rounded-2xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60">
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

const TEST_CUSTOMER_ID = '__test_customer__';

const TEST_CUSTOMER: PortalLead = {
  id: TEST_CUSTOMER_ID,
  order_number: 'DEMO-0001',
  service_category: 'PRIVATUMZUG',
  customer_name: 'Test Kunde',
  customer_email: 'test@umzugsnetz.de',
  customer_phone: '+49 170 0000000',
  move_date: null,
  von_city: 'Berlin',
  von_address: 'Musterstraße 1',
  nach_city: 'Hamburg',
  nach_address: 'Demogasse 7',
  estimated_price: 1490,
  status: 'Neu',
  notes: 'Demo-Datensatz zum Üben des Bearbeitungs-Flows. Es werden keine echten Daten verändert.',
  created_at: null,
  city: 'Berlin',
};

function WorkSection({ leads, onSave }: { leads: PortalLead[]; onSave: (payload: PortalResponse) => void }) {
  const [testActive, setTestActive] = useState(true);
  const callableLeads = useMemo(() => {
    const real = leads.filter((lead) => !['Gebucht', 'Abgelehnt'].includes(String(lead.status || '')));
    return testActive ? [TEST_CUSTOMER, ...real] : real;
  }, [leads, testActive]);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [callStarted, setCallStarted] = useState(false);
  const [result, setResult] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setQueueIds((current) => {
      const availableIds = callableLeads.map((lead) => lead.id);
      const preserved = current.filter((id) => availableIds.includes(id));
      const missing = availableIds.filter((id) => !preserved.includes(id));
      return [...preserved, ...missing];
    });
  }, [callableLeads]);

  const currentLead = callableLeads.find((lead) => lead.id === queueIds[0]) || callableLeads[0];
  const isTestLead = currentLead?.id === TEST_CUSTOMER_ID;

  useEffect(() => {
    setCallStarted(false);
    setResult('');
    setNotes(String(currentLead?.notes || ''));
  }, [currentLead?.id, currentLead?.notes]);

  const finishLead = async () => {
    if (!currentLead) return;
    if (!result) {
      window.alert('Bitte zuerst einen Status auswählen.');
      return;
    }

    if (currentLead.id === TEST_CUSTOMER_ID) {
      window.alert(`Demo abgeschlossen mit Status "${result}". Es wurden keine echten Daten verändert.`);
      if (result === 'Neu Kontaktieren') {
        setQueueIds((current) => [...current.filter((id) => id !== TEST_CUSTOMER_ID), TEST_CUSTOMER_ID]);
      } else {
        setTestActive(false);
        setQueueIds((current) => current.filter((id) => id !== TEST_CUSTOMER_ID));
      }
      setCallStarted(false);
      setResult('');
      setNotes('');
      return;
    }

    setSaving(true);
    try {
      const payload = await patchPortal({
        action: 'processWorkLead',
        id: currentLead.id,
        result,
        notes,
        scope: 'all',
      });
      if (result === 'Neu Kontaktieren') {
        setQueueIds((current) => [...current.filter((id) => id !== currentLead.id), currentLead.id]);
      } else {
        setQueueIds((current) => current.filter((id) => id !== currentLead.id));
      }
      onSave(payload);
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : 'Kunde konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const remainingCount = Math.max(callableLeads.length - 1, 0);

  const skipLead = () => {
    if (!currentLead) return;
    setQueueIds((current) => [...current.filter((id) => id !== currentLead.id), currentLead.id]);
    setCallStarted(false);
    setResult('');
    setNotes('');
  };

  const startCall = () => {
    setCallStarted(true);
    if (!notes) setNotes(String(currentLead?.notes || ''));
  };

  const appendQuickNote = (snippet: string) => {
    setNotes((current) => {
      const trimmed = current.trim();
      if (!trimmed) return snippet;
      if (trimmed.includes(snippet)) return current;
      return `${trimmed}\n${snippet}`;
    });
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Arbeiten"
        description={currentLead
          ? `Aktueller Kunde · noch ${remainingCount} weitere${remainingCount === 1 ? 'r' : ''} in der Warteschlange`
          : 'Keine offenen Kundenanfragen.'}
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setTestActive((value) => !value);
                setCallStarted(false);
                setResult('');
                setNotes('');
              }}
              className={cx(
                'inline-flex items-center gap-2 rounded-2xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                testActive ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-amber-200 hover:text-amber-700',
              )}
            >
              <span className={cx('h-2 w-2 rounded-full', testActive ? 'bg-amber-500' : 'bg-slate-400')} />
              {testActive ? 'Test-Kunde aktiv' : 'Test-Kunde aktivieren'}
            </button>
            {currentLead && callableLeads.length > 1 ? (
              <button
                type="button"
                onClick={skipLead}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                Überspringen
              </button>
            ) : null}
          </div>
        )}
      >
        {currentLead ? (
          <div className={cx(
            'rounded-xl border p-6',
            isTestLead
              ? 'border-amber-200 bg-[linear-gradient(180deg,#fffbeb,#ffffff)]'
              : 'border-slate-100 bg-white',
          )}>
            {isTestLead ? (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                Demo-Datensatz · keine Speicherung
              </div>
            ) : null}

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{currentLead.order_number || 'Anfrage'}</p>
                <h3 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{currentLead.customer_name || 'Ohne Namen'}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <StatusBadge label={leadStatusLabel(currentLead.status)} tone={getLeadStatusTone(currentLead.status)} />
                  {currentLead.service_category ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-blue/15 bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
                      <Truck className="h-3.5 w-3.5" />
                      {currentLead.service_category}
                    </span>
                  ) : null}
                  {currentLead.move_date ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(currentLead.move_date)}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <a
                  href={currentLead.customer_phone ? `tel:${String(currentLead.customer_phone).replace(/\s/g, '')}` : '#'}
                  onClick={(event) => {
                    if (!currentLead.customer_phone) {
                      event.preventDefault();
                    }
                    startCall();
                  }}
                  className="group inline-flex items-center gap-3 rounded-2xl bg-brand-blue px-5 py-4 text-base font-bold text-white shadow-lg shadow-brand-blue/20 transition-colors hover:bg-brand-blue-hover"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                    <PhoneCall className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75">Jetzt anrufen</span>
                    <span className="block text-base">{currentLead.customer_phone || 'Keine Nummer hinterlegt'}</span>
                  </span>
                </a>
                {currentLead.customer_email ? (
                  <a
                    href={`mailto:${currentLead.customer_email}`}
                    className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {currentLead.customer_email}
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Von</p>
                <p className="mt-2 flex items-start gap-2 text-sm font-bold text-slate-900">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-blue" />
                  <span>
                    {[currentLead.von_address, currentLead.von_city].filter(Boolean).join(', ') || '—'}
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Nach</p>
                <p className="mt-2 flex items-start gap-2 text-sm font-bold text-slate-900">
                  <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <span>
                    {[currentLead.nach_address, currentLead.nach_city].filter(Boolean).join(', ') || '—'}
                  </span>
                </p>
              </div>
            </div>

            {!callStarted ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 p-5 text-center">
                <p className="text-sm font-bold text-slate-600">Klicke oben auf <span className="font-semibold text-brand-blue">„Jetzt anrufen"</span>, um den Wizard zu starten.</p>
                <p className="mt-1 text-xs font-medium text-slate-500">Das Telefon öffnet sich automatisch und du kannst direkt das Ergebnis erfassen.</p>
                <button
                  type="button"
                  onClick={startCall}
                  className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  Ergebnis ohne Anruf erfassen
                </button>
              </div>
            ) : (
              <CallWizard
                result={result}
                onResultChange={setResult}
                notes={notes}
                onNotesChange={setNotes}
                onQuickNote={appendQuickNote}
                onCancel={() => {
                  setCallStarted(false);
                  setResult('');
                }}
                onFinish={finishLead}
                saving={saving}
                isTest={isTestLead}
              />
            )}
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.work} />
        )}
      </SectionCard>
    </div>
  );
}

const QUICK_NOTES = [
  'Kunde nicht erreicht - Mailbox',
  'Termin vereinbart',
  'Kunde möchte Angebot per E-Mail',
  'Kunde wünscht Rückruf',
  'Anfrage bereits vergeben',
];

const RESULT_OPTIONS: Array<{ value: string; label: string; description: string; icon: typeof PhoneCall; classes: string }> = [
  {
    value: 'Gewonnen',
    label: 'Gewonnen',
    description: 'Auftrag bestätigt',
    icon: CheckCircle2,
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-400 hover:bg-emerald-100',
  },
  {
    value: 'Neu Kontaktieren',
    label: 'Rückruf',
    description: 'Später erneut versuchen',
    icon: RefreshCcw,
    classes: 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-400 hover:bg-amber-100',
  },
  {
    value: 'Verloren',
    label: 'Verloren',
    description: 'Kunde hat abgelehnt',
    icon: XCircle,
    classes: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-400 hover:bg-slate-100',
  },
  {
    value: 'Löschen',
    label: 'Löschen',
    description: 'Anfrage entfernen',
    icon: Trash2,
    classes: 'border-red-200 bg-red-50 text-red-700 hover:border-red-400 hover:bg-red-100',
  },
];

function CallWizard({
  result,
  onResultChange,
  notes,
  onNotesChange,
  onQuickNote,
  onCancel,
  onFinish,
  saving,
  isTest,
}: {
  result: string;
  onResultChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  onQuickNote: (snippet: string) => void;
  onCancel: () => void;
  onFinish: () => void;
  saving: boolean;
  isTest: boolean;
}) {
  return (
    <div className="mt-6 space-y-5 rounded-2xl border border-brand-blue/15 bg-brand-blue/5 p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-blue">Schritt 1</p>
          <p className="text-base font-bold text-slate-950">Wie ist das Gespräch gelaufen?</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 hover:text-slate-900"
        >
          Abbrechen
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RESULT_OPTIONS.map((option) => {
          const active = result === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onResultChange(option.value)}
              className={cx(
                'flex flex-col items-start gap-2 rounded-2xl border-2 p-4 text-left transition-all',
                active ? 'border-brand-blue bg-white shadow-[0_18px_45px_rgba(2,118,200,0.18)]' : option.classes,
              )}
            >
              <span className={cx('flex h-9 w-9 items-center justify-center rounded-2xl', active ? 'bg-brand-blue text-white' : 'bg-white/80 text-current')}>
                <option.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold text-slate-900">{option.label}</span>
              <span className="text-[11px] font-medium text-slate-500">{option.description}</span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-blue">Schritt 2</p>
          <p className="text-[11px] font-medium text-slate-500">Notiz (optional)</p>
        </div>
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_NOTES.map((snippet) => (
            <button
              key={snippet}
              type="button"
              onClick={() => onQuickNote(snippet)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
            >
              + {snippet}
            </button>
          ))}
        </div>
        <textarea
          value={notes}
          onChange={(event) => onNotesChange(event.target.value)}
          rows={4}
          placeholder="z. B. Termin am Mittwoch um 10:00 Uhr vor Ort"
          className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] font-medium text-slate-500">
          {isTest ? 'Demo-Modus: dein Klick speichert nichts.' : 'Mit „Speichern & weiter" wird der Status gesichert und der nächste Kunde geladen.'}
        </p>
        <button
          type="button"
          onClick={onFinish}
          disabled={saving || !result}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          {saving ? 'Speichert...' : 'Speichern & weiter'}
        </button>
      </div>
    </div>
  );
}

function partnerSettingValue(partner: PortalPartner, key: 'address' | 'contact_person' | 'notes') {
  const settings = partner.settings || {};
  if (key === 'notes') return String(settings.notes || settings.internal_notes || '');
  return String(settings[key] || '');
}

function partnerRadiusLabel(partner: PortalPartner) {
  const settings = (partner.settings || {}) as Record<string, unknown>;
  const label = settings.radius_label;
  if (typeof label === 'string' && label.trim()) return label.trim();
  const km = Number(settings.radius_km);
  return Number.isFinite(km) && km > 0 ? `${km} km` : '50 km';
}

const ADMIN_RADIUS_OPTIONS = ['10 km', '25 km', '50 km', '75 km', '100 km', '150 km+'];

function splitDelimitedLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeImportHeader(value: string) {
  return normalizeSearch(value).replace(/[^a-z0-9]/g, '');
}

function mapImportHeader(value: string) {
  const header = normalizeImportHeader(value);
  if (['firma', 'firmenname', 'unternehmen', 'name'].includes(header)) return 'name';
  if (['adresse', 'anschrift'].includes(header)) return 'address';
  if (['ansprechpartner', 'kontakt', 'kontaktperson'].includes(header)) return 'contactPerson';
  if (['telefon', 'telefonnummer', 'phone', 'tel', 'handy'].includes(header)) return 'phone';
  if (['email', 'mail', 'emailadresse'].includes(header)) return 'email';
  if (['region', 'regionen', 'gebiet', 'gebiete'].includes(header)) return 'regions';
  if (['leistung', 'service', 'dienstleistung'].includes(header)) return 'service';
  if (['status'].includes(header)) return 'status';
  if (['kategorie', 'category'].includes(header)) return 'category';
  if (['notiz', 'notizen', 'bemerkung', 'bemerkungen'].includes(header)) return 'notes';
  return '';
}

function parseCustomerImport(text: string) {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes('\t') ? '\t' : ';';
  const headers = splitDelimitedLine(lines[0], delimiter).map(mapImportHeader);

  return lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter);
    return headers.reduce<Record<string, string>>((row, key, index) => {
      if (key) row[key] = values[index] || '';
      return row;
    }, {});
  }).filter((row) => row.name);
}

function CustomersSection({ customers, search, role, onSave }: { customers: PortalPartner[]; search: string; role: StaffRole; onSave: (payload: PortalResponse) => void }) {
  const filtered = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return customers.filter((customer) => matchesSearch(query, [
      customer.name,
      customer.email,
      customer.phone,
      customer.regions,
      customer.status,
      customer.category,
      partnerSettingValue(customer, 'address'),
      partnerSettingValue(customer, 'contact_person'),
      partnerSettingValue(customer, 'notes'),
    ]));
  }, [customers, search]);
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState({
    name: '',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    regions: '',
    radius: '50 km',
    service: 'BEIDES',
    status: 'ACTIVE',
    category: 'Standard Anfragen',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');

  const selectedCustomer = filtered.find((customer) => customer.id === selectedId) || null;

  useEffect(() => {
    if (!selectedCustomer) return;
    setDraft({
      name: String(selectedCustomer.name || ''),
      address: partnerSettingValue(selectedCustomer, 'address'),
      contactPerson: partnerSettingValue(selectedCustomer, 'contact_person'),
      phone: String(selectedCustomer.phone || ''),
      email: String(selectedCustomer.email || ''),
      regions: String(selectedCustomer.regions || ''),
      radius: partnerRadiusLabel(selectedCustomer),
      service: String(selectedCustomer.service || 'BEIDES'),
      status: String(selectedCustomer.status || 'ACTIVE'),
      category: String(selectedCustomer.category || 'Standard Anfragen'),
      notes: partnerSettingValue(selectedCustomer, 'notes'),
    });
  }, [selectedCustomer]);

  const updateDraft = (key: keyof typeof draft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const startNewCustomer = () => {
    setSelectedId('');
    setDraft({
      name: '',
      address: '',
      contactPerson: '',
      phone: '',
      email: '',
      regions: '',
      radius: '50 km',
      service: 'BEIDES',
      status: 'ACTIVE',
      category: 'Standard Anfragen',
      notes: '',
    });
  };

  const saveCustomer = async () => {
    if (!draft.name.trim()) {
      window.alert('Bitte den Firmennamen eintragen.');
      return;
    }

    setSaving(true);
    try {
      onSave(await patchPortal({
        action: selectedCustomer ? 'updateCustomerCompany' : 'createCustomerCompany',
        id: selectedCustomer?.id,
        ...draft,
        scope: 'all',
      }));
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : 'Kunde konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const importCustomers = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    setImportMessage('');
    try {
      const text = await file.text();
      const rows = parseCustomerImport(text);
      if (!rows.length) {
        window.alert('Keine gültigen Kundendaten gefunden. Die Datei braucht eine Kopfzeile mit Firmennamen.');
        return;
      }

      onSave(await patchPortal({
        action: 'importCustomerCompanies',
        rows,
        scope: 'all',
      }));
      setImportMessage(`${rows.length} Kunden importiert.`);
    } catch (importError) {
      window.alert(importError instanceof Error ? importError.message : 'Kundendaten konnten nicht importiert werden.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <SectionCard
        title="Firmen"
        action={
          <div className="flex flex-wrap gap-2">
            {role === 'ADMIN' ? (
              <label className="cursor-pointer rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
                {importing ? 'Importiert...' : 'Datei hochladen'}
                <input
                  type="file"
                  accept=".csv,.tsv,text/csv,text/tab-separated-values"
                  className="hidden"
                  disabled={importing}
                  onChange={(event) => {
                    void importCustomers(event.target.files?.[0]);
                    event.currentTarget.value = '';
                  }}
                />
              </label>
            ) : null}
            <button type="button" onClick={startNewCustomer} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">Neue Firma</button>
          </div>
        }
      >
        {importMessage ? <p className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">{importMessage}</p> : null}
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => setSelectedId(customer.id)}
                className={cx(
                  'w-full rounded-xl border p-4 text-left transition-all',
                  selectedId === customer.id ? 'border-brand-blue bg-brand-blue/5 shadow-[0_12px_30px_rgba(2,118,200,0.12)]' : 'border-slate-100 bg-slate-50 hover:border-slate-200',
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{customer.name || 'Ohne Firmenname'}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{partnerSettingValue(customer, 'contact_person') || 'Kein Ansprechpartner'}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-500">{[customer.phone, customer.email].filter(Boolean).join(' · ') || '-'}</p>
                    <p className="mt-2 text-sm font-semibold text-slate-500">{partnerSettingValue(customer, 'address') || 'Keine Adresse hinterlegt'}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <StatusBadge label={partnerStatusLabel(customer.status)} />
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{customer.category || 'Standard Anfragen'}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.customers} />
        )}
      </SectionCard>

      <SectionCard title={selectedCustomer ? 'Firma bearbeiten' : 'Firma anlegen'}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Firmenname</span>
              <input value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Adresse</span>
              <input value={draft.address} onChange={(event) => updateDraft('address', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Ansprechpartner</span>
              <input value={draft.contactPerson} onChange={(event) => updateDraft('contactPerson', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Telefonnummer</span>
              <input value={draft.phone} onChange={(event) => updateDraft('phone', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">E-Mail</span>
              <input type="email" value={draft.email} onChange={(event) => updateDraft('email', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Standort / Regionen</span>
              <input value={draft.regions} onChange={(event) => updateDraft('regions', event.target.value)} placeholder="z. B. Berlin" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Einzugsradius</span>
              <select value={draft.radius} onChange={(event) => updateDraft('radius', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {ADMIN_RADIUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</span>
              <select value={draft.status} onChange={(event) => updateDraft('status', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {[
                  ['ACTIVE', 'Aktiv'],
                  ['PENDING', 'In Prüfung'],
                  ['SUSPENDED', 'Pausiert'],
                ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Dienstleistung</span>
              <select value={draft.service} onChange={(event) => updateDraft('service', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {[
                  ['UMZUG', 'Umzüge'],
                  ['ENTRÜMPELUNG', 'Entrümpelung'],
                  ['BEIDES', 'Umzüge und Entrümpelung'],
                ].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Kategorie</span>
              <select value={draft.category} onChange={(event) => updateDraft('category', event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {['Standard Anfragen', 'Priorisierte Anfragen', 'Exklusive Anfragen'].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Notizen</span>
              <textarea value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} rows={6} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </label>
          </div>
          <button type="button" onClick={saveCustomer} disabled={saving} className="w-full rounded-2xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60">
            {saving ? 'Speichert...' : 'Firma speichern'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}

function PartnersSection({ partners, search, onSave }: { partners: PortalPartner[]; search: string; onSave: (payload: PortalResponse) => void }) {
  const filtered = useMemo(() => {
    const query = normalizeSearch(search.trim());
    if (!query) return partners;
    return partners.filter((partner) => matchesSearch(query, [partner.name, partner.email, partner.phone, partner.regions, partner.category, partner.status, partner.service, partner.balance]));
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
      <SectionCard title="Partner">
        {filtered.length ? (
          <div className="space-y-3">
            {filtered.map((row) => (
              <button
                key={row.id}
                type="button"
                onClick={() => setSelectedPartnerId(row.id)}
                className={cx(
                  'w-full rounded-xl border p-4 text-left transition-all',
                  selectedPartnerId === row.id ? 'border-brand-blue bg-brand-blue/5 shadow-[0_12px_30px_rgba(2,118,200,0.12)]' : 'border-slate-100 bg-slate-50 hover:border-slate-200',
                )}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{row.name || 'Unbenannter Partner'}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{[row.email, row.phone].filter(Boolean).join(' · ') || row.id}</p>
                    <p className="mt-3 text-sm font-semibold text-slate-500">{row.regions || 'Keine Regionen'} · {partnerServiceLabel(row.service)}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <StatusBadge label={partnerStatusLabel(row.status)} />
                    <span className="text-sm font-semibold text-slate-900">{formatCurrency(row.balance)}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.partners} />
        )}
      </SectionCard>

      <SectionCard title="Partner bearbeiten">
        {selectedPartner ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">{selectedPartner.name || 'Unbenannter Partner'}</p>
              <p className="mt-1 text-sm font-medium text-slate-500">{selectedPartner.email || '-'} · {selectedPartner.phone || '-'}</p>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status</label>
              <select value={partnerStatus} onChange={(event) => setPartnerStatus(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {[
                  ['ACTIVE', 'Aktiv'],
                  ['PENDING', 'In Prüfung'],
                  ['SUSPENDED', 'Pausiert'],
                ].map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Kategorie</label>
              <select value={partnerCategory} onChange={(event) => setPartnerCategory(event.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue">
                {['Standard Anfragen', 'Priorisierte Anfragen', 'Exklusive Anfragen'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Regionen</label>
              <textarea value={partnerRegions} onChange={(event) => setPartnerRegions(event.target.value)} rows={5} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue" />
            </div>
            <button type="button" onClick={savePartner} disabled={saving} className="w-full rounded-2xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60">
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

function DistributionSection({ items, search, onSave }: { items: DistributionItem[]; search: string; onSave: (payload: PortalResponse) => void }) {
  const [savingLeadId, setSavingLeadId] = useState('');
  const filtered = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return items.filter((item) => matchesSearch(query, [item.leadId, item.customer, item.area, item.status, ...item.suggestedPartners.map((partner) => partner.name)]));
  }, [items, search]);

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
      window.alert(saveError instanceof Error ? saveError.message : 'Anfrage konnte nicht zugewiesen werden.');
    } finally {
      setSavingLeadId('');
    }
  };

  return (
    <SectionCard title="Anfragen-Verteilung" description="Offene Anfragen mit tatsächlich passenden Partnern auf Basis der Regionen.">
      {filtered.length ? (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-bold text-slate-950">{item.customer}</p>
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
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-brand-blue hover:text-brand-blue disabled:opacity-60"
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

function BillingSection({ transactions, search }: { transactions: PortalTransaction[]; search: string }) {
  const filtered = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return transactions.filter((item) => matchesSearch(query, [item.type, item.description, item.amount, item.created_at]));
  }, [transactions, search]);
  const totals = useMemo(() => {
    const totalRevenue = filtered.reduce((sum, item) => sum + Math.max(0, Number(item.amount || 0)), 0);
    const openCount = filtered.filter((item) => normalizeSearch(item.type).includes('offen')).length;
    return {
      totalRevenue,
      transactionCount: filtered.length,
      openCount,
    };
  }, [filtered]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.9fr]">
      <SectionCard title="Abrechnung">
        {filtered.length ? (
          <DataTable<PortalTransaction>
            columns={[
              { key: 'type', label: 'Typ' },
              { key: 'description', label: 'Beschreibung' },
              { key: 'created', label: 'Datum' },
              { key: 'amount', label: 'Betrag' },
            ]}
            rows={filtered}
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
            <div key={label} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function ContentSection({ search }: { search: string }) {
  const filtered = useMemo(() => {
    const query = normalizeSearch(search.trim());
    if (!query) return liveContentItems;
    return liveContentItems.filter((item) => matchesSearch(query, [item.title, item.category, item.owner, item.route, item.status]));
  }, [search]);

  return (
    <SectionCard title="Inhalte" description="Tatsächlich vorhandene Ratgeber- und FAQ-Inhalte der Website.">
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
            if (key === 'route') return <Link href={row.route} className="font-semibold text-brand-blue hover:underline">{row.route}</Link>;
            if (key === 'status') return <StatusBadge label={contentStatusLabel(row.status)} />;
            return '-';
          }}
        />
      ) : (
        <EmptyState {...emptyStateBySection.content} />
      )}
    </SectionCard>
  );
}

function getSettingTitle(key?: string | null) {
  if (key === 'billing_settings') return 'Bankdaten für Überweisungen';
  if (key === 'min_topup_amount') return 'Mindestaufladung';
  if (key === 'maintenance_mode') return 'Wartungsmodus';
  if (key === 'pricing_config') return 'Anfragen-Preise';
  return 'Systemeinstellung';
}

function getSettingDescription(key?: string | null) {
  if (key === 'billing_settings') return 'Diese Daten sehen Partner bei manuellen Überweisungen.';
  if (key === 'min_topup_amount') return 'Kleinster Betrag, den Partner aufladen können.';
  if (key === 'maintenance_mode') return 'Schaltet öffentliche Funktionen bei Bedarf in den Wartungszustand.';
  if (key === 'pricing_config') return 'Preise pro Anfragekategorie und Dienstleistung.';
  return 'Interne Konfiguration.';
}

function parseDraftObject(draft: string) {
  try {
    const parsed = JSON.parse(draft);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

function parseDraftPricing(draft: string) {
  const parsed = parseDraftObject(draft);
  return parsed as Record<string, Array<Record<string, unknown>>>;
}

function updateDraftObject(draft: string, key: string, value: unknown) {
  return JSON.stringify({ ...parseDraftObject(draft), [key]: value }, null, 2);
}

function SettingsSection({ settings, team, search, onSave }: { settings: PortalSetting[]; team: PortalTeam[]; search: string; onSave: (payload: PortalResponse) => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingSettingId, setSavingSettingId] = useState('');
  const [savingTeamId, setSavingTeamId] = useState('');
  const filteredSettings = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return settings.filter((item) => matchesSearch(query, [getSettingTitle(item.key), getSettingDescription(item.key), item.key, JSON.stringify(item.value ?? '')]));
  }, [settings, search]);
  const filteredTeam = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return team.filter((member) => matchesSearch(query, [member.email, member.role, member.status, member.created_at]));
  }, [team, search]);

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
        email: member.email,
        role: member.role,
        status,
        scope: 'all',
      }));
    } catch (saveError) {
      window.alert(saveError instanceof Error ? saveError.message : 'Team-Status konnte nicht gespeichert werden.');
    } finally {
      setSavingTeamId('');
    }
  };

  const renderSettingControl = (item: PortalSetting) => {
    const key = String(item.key || '');
    const draft = drafts[item.id] ?? '';

    if (key === 'maintenance_mode') {
      const enabled = draft === 'true' || draft === '"true"';
      return (
        <select
          value={enabled ? 'true' : 'false'}
          onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
          className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
        >
          <option value="false">Aus</option>
          <option value="true">Ein</option>
        </select>
      );
    }

    if (key === 'min_topup_amount') {
      return (
        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Betrag in Euro</span>
          <input
            type="number"
            min="0"
            step="1"
            value={draft.replace(/"/g, '')}
            onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
          />
        </label>
      );
    }

    if (key === 'billing_settings') {
      const value = parseDraftObject(draft);
      return (
        <div className="mt-4 grid gap-3">
          {[
            ['beneficiary', 'Empfänger'],
            ['iban', 'IBAN'],
            ['bic', 'BIC'],
            ['note', 'Hinweistext'],
          ].map(([field, label]) => (
            <label key={field} className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
              <input
                value={String(value[field] ?? '')}
                onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: updateDraftObject(draft, field, event.target.value) }))}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
              />
            </label>
          ))}
        </div>
      );
    }

    if (key === 'pricing_config') {
      const pricing = parseDraftPricing(draft);
      return (
        <div className="mt-4 space-y-4">
          {Object.entries(pricing).map(([category, rows]) => (
            <div key={category} className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{pricingCategoryLabel(category)}</p>
              <div className="mt-3 grid gap-3">
                {(Array.isArray(rows) ? rows : []).map((row, index) => (
                  <div key={String(row.id || index)} className="grid gap-3 sm:grid-cols-[1fr_130px] sm:items-center">
                    <p className="text-sm font-semibold text-slate-600">{String(row.label || row.name || row.id || 'Kategorie')}</p>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={String(row.price ?? '')}
                      onChange={(event) => {
                        const nextPricing = parseDraftPricing(draft);
                        const nextRows = Array.isArray(nextPricing[category]) ? [...nextPricing[category]] : [];
                        nextRows[index] = { ...nextRows[index], price: Number(event.target.value || 0) };
                        nextPricing[category] = nextRows;
                        setDrafts((current) => ({ ...current, [item.id]: JSON.stringify(nextPricing, null, 2) }));
                      }}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <input
        value={draft.replace(/^"|"$/g, '')}
        onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: event.target.value }))}
        className="mt-4 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
      />
    );
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <SectionCard title="Einstellungen">
        {filteredSettings.length ? (
          <div className="space-y-4">
            {filteredSettings.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <p className="text-base font-bold text-slate-950">{getSettingTitle(item.key)}</p>
                <p className="mt-1 text-sm font-medium text-slate-500">{getSettingDescription(item.key)}</p>
                {renderSettingControl(item)}
                <button type="button" onClick={() => saveSetting(item)} disabled={savingSettingId === item.id} className="mt-3 rounded-2xl bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60">
                  {savingSettingId === item.id ? 'Speichert...' : 'Speichern'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState {...emptyStateBySection.settings} />
        )}
      </SectionCard>

      <SectionCard title="Team" description="Geschäftsführer und Mitarbeiterkonten aus Team, Profilen und Auth.">
        {filteredTeam.length ? (
          <div className="space-y-3">
            {filteredTeam.map((member) => (
              <div key={member.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{member.email || 'Ohne E-Mail'}</p>
                    <p className="mt-1 text-sm font-medium text-slate-500">{teamRoleLabel(member.role)} · {formatDateTime(member.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select value={String(member.status || 'PENDING')} onChange={(event) => updateTeamStatus(member, event.target.value)} disabled={savingTeamId === member.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue disabled:opacity-60">
                      {['PENDING', 'ACTIVE', 'DISABLED'].map((option) => (
                        <option key={option} value={option}>{teamStatusLabel(option)}</option>
                      ))}
                    </select>
                    <StatusBadge label={teamStatusLabel(member.status)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Kein Team gefunden" text="Für diese Suche gibt es aktuell keine sichtbaren Team-Einträge." />
        )}
      </SectionCard>
    </div>
  );
}

function TicketsSection({
  tickets,
  ticketSavingSessionId,
  search,
  onMarkRead,
}: {
  tickets: PortalTicket[];
  ticketSavingSessionId: string;
  search: string;
  onMarkRead: (ticket: PortalTicket) => void;
}) {
  const [openSessionId, setOpenSessionId] = useState('');
  const filtered = useMemo(() => {
    const query = normalizeSearch(search.trim());
    return tickets.filter((ticket) => matchesSearch(query, [
      ticket.session_id,
      ticket.user_name,
      ticket.support_category,
      ticket.last_message,
      ticket.last_at,
      ...(ticket.messages || []).flatMap((message) => [message.sender, message.text, message.created_at]),
    ]));
  }, [tickets, search]);

  return (
    <SectionCard title="Support" description="Chat-Anfragen mit vollständigem Nachrichtenverlauf.">
      {filtered.length ? (
        <div className="space-y-4">
          {filtered.map((ticket) => {
            const isOpen = openSessionId === ticket.session_id;
            const messages = [...(ticket.messages || [])].sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

            return (
              <div key={ticket.session_id} className="rounded-xl border border-slate-100 bg-white p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <button type="button" onClick={() => setOpenSessionId(isOpen ? '' : ticket.session_id)} className="min-w-0 flex-1 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-bold text-slate-950">{ticket.user_name || 'Unbekannter Chat'}</p>
                      <StatusBadge label={String(ticket.support_category || 'KUNDE') === 'KUNDE' ? 'Kunde' : String(ticket.support_category || 'Support')} />
                      {ticket.unread_count ? <StatusBadge label={`${ticket.unread_count} neu`} tone="amber" /> : null}
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{ticket.session_id}</p>
                    <p className="mt-4 text-sm font-semibold leading-relaxed text-slate-600">{ticket.last_message || 'Keine Nachricht vorhanden.'}</p>
                  </button>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Letzte Aktivität</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateTime(ticket.last_at)}</p>
                    <button type="button" onClick={() => setOpenSessionId(isOpen ? '' : ticket.session_id)} className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
                      {isOpen ? 'Verlauf schließen' : 'Verlauf öffnen'}
                    </button>
                    {ticket.unread_count ? (
                      <button
                        type="button"
                        onClick={() => onMarkRead(ticket)}
                        disabled={ticketSavingSessionId === ticket.session_id}
                        className="mt-2 block w-full rounded-2xl bg-brand-blue px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        {ticketSavingSessionId === ticket.session_id ? 'Speichert...' : 'Als gelesen markieren'}
                      </button>
                    ) : null}
                  </div>
                </div>

                {isOpen ? (
                  <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                    {messages.length ? messages.map((message) => {
                      const isUser = message.sender === 'user';
                      return (
                        <div key={message.id || `${ticket.session_id}-${message.created_at}`} className={cx('flex', isUser ? 'justify-start' : 'justify-end')}>
                          <div className={cx('max-w-[85%] rounded-2xl px-4 py-3', isUser ? 'bg-slate-100 text-slate-800' : 'bg-brand-blue text-white')}>
                            <div className="mb-1 flex items-center justify-between gap-4">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{isUser ? 'Kunde' : 'Team'}</span>
                              <span className="text-[11px] font-bold opacity-70">{formatDateTime(message.created_at)}</span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm font-semibold leading-relaxed">{message.text || '-'}</p>
                          </div>
                        </div>
                      );
                    }) : (
                      <EmptyState title="Kein Verlauf vorhanden" text="Zu dieser Support-Anfrage wurden keine Nachrichten geladen." />
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState {...emptyStateBySection.tickets} />
      )}
    </SectionCard>
  );
}

export function AdminDashboard() {
  const [activeSection, setActiveSection] = useState<AdminSectionId>('dashboard');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [portal, setPortal] = useState<PortalResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeEmail, setEmployeeEmail] = useState('');
  const [employeeSubmitting, setEmployeeSubmitting] = useState(false);
  const [revokingTeamEmail, setRevokingTeamEmail] = useState('');
  const [ticketSavingSessionId, setTicketSavingSessionId] = useState('');
  const [notificationsSaving, setNotificationsSaving] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const refreshPortal = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setLoading(true);
      setError('');
    }
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      setCurrentUserEmail(sessionData.session?.user?.email || '');
      if (!token) {
        if (!options.silent) setError('Bitte einloggen.');
        return;
      }

      const response = await fetch('/api/admin/portal?scope=all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (!options.silent) setError(payload?.error || 'Übersicht konnte nicht geladen werden.');
        return;
      }

      setPortal(payload);
    } catch (loadError) {
      if (!options.silent) {
        setError(loadError instanceof Error ? loadError.message : 'Übersicht konnte nicht geladen werden.');
      }
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshPortal();
  }, [refreshPortal]);

  useEffect(() => {
    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = null;
        if (active) void refreshPortal({ silent: true });
      }, 600);
    };

    const channel = supabase
      .channel('admin-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, scheduleRefresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, scheduleRefresh)
      .subscribe();

    return () => {
      active = false;
      if (refreshTimer) clearTimeout(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [refreshPortal]);

  const role = portal?.role || 'EMPLOYEE';
  const leads = portal?.leads ?? EMPTY_LEADS;
  const partners = portal?.partners ?? EMPTY_PARTNERS;
  const transactions = portal?.transactions ?? EMPTY_TRANSACTIONS;
  const notifications = portal?.notifications ?? EMPTY_NOTIFICATIONS;
  const settings = portal?.settings ?? EMPTY_SETTINGS;
  const team = portal?.team ?? EMPTY_TEAM;
  const tickets = portal?.tickets ?? EMPTY_TICKETS;
  const workStats = portal?.workStats;
  const unreadNotifications = notifications.filter((item) => item.is_read !== true);
  const search = '';
  const searchQuery = '';
  const filteredTeam = useMemo(() => {
    return team.filter((member) => matchesSearch(searchQuery, [member.email, member.role, member.status, member.created_at]));
  }, [team, searchQuery]);

  const navigation = useMemo(() => {
    return baseNavigation[role].map((item) => {
      if (item.id === 'work') return { ...item, counter: String(leads.filter((lead) => !['Gebucht', 'Abgelehnt'].includes(String(lead.status || ''))).length) };
      if (item.id === 'customers') return { ...item, counter: String(partners.length) };
      if (item.id === 'requests') return { ...item, counter: String(leads.length) };
      if (item.id === 'partners') return { ...item, counter: String(partners.length) };
      if (item.id === 'distribution') return { ...item, counter: String(leads.filter((lead) => ['Neu', 'Kontaktiert', 'Angebot'].includes(String(lead.status || ''))).length) };
      if (item.id === 'employees') return { ...item, counter: String(filteredTeam.length) };
      if (item.id === 'tickets') return { ...item, counter: String(tickets.filter((ticket) => matchesSearch(searchQuery, [ticket.session_id, ticket.user_name, ticket.support_category, ticket.last_message, ...(ticket.messages || []).flatMap((message) => [message.sender, message.text])])).length) };
      if (item.id === 'billing') return { ...item, counter: String(transactions.length) };
      if (item.id === 'settings') return { ...item, counter: String(settings.length || team.length) };
      return item;
    });
  }, [role, leads, partners, tickets, transactions.length, settings.length, team.length, filteredTeam.length, searchQuery]);

  useEffect(() => {
    const allowedSections = new Set(baseNavigation[role].map((item) => item.id));
    if (!allowedSections.has(activeSection)) {
      setActiveSection(baseNavigation[role][0]?.id || 'work');
    }
  }, [activeSection, role]);

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
      { id: 'today', label: 'Neue Anfragen heute', value: String(newToday), change: 'seit 00:00 Uhr', tone: 'blue' as StatusTone, icon: kpiIcons.leadsToday },
      { id: 'open', label: 'Offene Anfragen', value: String(openLeads), change: 'ohne Abschluss oder Storno', tone: 'amber' as StatusTone, icon: kpiIcons.openLeads },
      { id: 'partners', label: 'Aktive Partner', value: String(activePartners), change: `${partners.length} Partner gesamt`, tone: 'emerald' as StatusTone, icon: kpiIcons.activePartners },
      { id: 'conversion', label: 'Abschlussquote', value: `${portal?.kpis?.closeRate || 0}%`, change: `${portal?.kpis?.orders || 0} Abschlüsse`, tone: 'slate' as StatusTone, icon: kpiIcons.conversion },
      { id: 'revenue', label: 'Umsatz', value: formatCurrency(portal?.kpis?.revenue || 0), change: `${transactions.length} Transaktionen`, tone: 'blue' as StatusTone, icon: kpiIcons.revenue },
      { id: 'complaints', label: 'Reklamationen', value: String(complaints), change: `${tickets.length} Support-Anfragen im System`, tone: complaints > 0 ? 'red' as StatusTone : 'slate' as StatusTone, icon: kpiIcons.complaints },
    ];
  }, [leads, notifications, partners, portal?.kpis?.closeRate, portal?.kpis?.orders, portal?.kpis?.revenue, tickets, transactions.length]);

  const activities = useMemo(() => {
    const leadActivities = leads.slice(0, 3).map((lead) => ({
      id: `lead-${lead.id}`,
      title: `Anfrage ${lead.order_number || lead.id} eingegangen`,
      meta: `${lead.customer_name || 'Ohne Namen'} · ${lead.city || lead.von_city || 'Ohne Stadt'}`,
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
      title: ticket.user_name || 'Support-Anfrage',
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
    if (!employeeEmail.trim()) {
      setError('Bitte eine E-Mail-Adresse für die Einladung angeben.');
      return;
    }

    setEmployeeSubmitting(true);
    setError('');
    try {
      const payload = await patchPortal({
          action: 'createTeamMember',
          email: employeeEmail.trim().toLowerCase(),
          role: 'EMPLOYEE',
          scope: 'all',
        });
      handlePortalSave(payload);
      setEmployeeEmail('');
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : 'Einladung konnte nicht versendet werden.');
    } finally {
      setEmployeeSubmitting(false);
    }
  };

  const revokeTeamInvite = async (email: string) => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    const confirmed = window.confirm(
      `Einladung an ${trimmed} wirklich zurückziehen?\n\nDer in der Einladungs-E-Mail enthaltene Link wird sofort ungültig.`,
    );
    if (!confirmed) return;

    setRevokingTeamEmail(trimmed);
    setError('');
    try {
      handlePortalSave(await patchPortal({
        action: 'revokeTeamInvite',
        email: trimmed,
        scope: 'all',
      }));
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : 'Einladung konnte nicht zurückgezogen werden.');
    } finally {
      setRevokingTeamEmail('');
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
      window.alert(submitError instanceof Error ? submitError.message : 'Support-Anfrage konnte nicht aktualisiert werden.');
    } finally {
      setTicketSavingSessionId('');
    }
  };

  const markNotificationsRead = async () => {
    if (!unreadNotifications.length) return;
    setNotificationsSaving(true);
    setError('');
    try {
      handlePortalSave(await patchPortal({
        action: 'markNotificationsRead',
        notificationIds: unreadNotifications.map((item) => item.id),
        scope: 'all',
      }));
    } catch (submitError) {
      window.alert(submitError instanceof Error ? submitError.message : 'Hinweise konnten nicht aktualisiert werden.');
    } finally {
      setNotificationsSaving(false);
    }
  };

  if (loading) return <LoadingState />;
  if (error || !portal) return <ErrorState message={error || 'Übersicht konnte nicht geladen werden.'} />;

  const sectionLabel = navigation.find((item) => item.id === activeSection)?.label || '';
  const sectionDescription = (sectionDescriptions as Partial<Record<AdminSectionId, string>>)[activeSection];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[260px_1fr]">
        <Sidebar
          items={navigation}
          active={activeSection}
          onSelect={setActiveSection}
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          onLogout={handleLogout}
          notifications={notifications}
          userEmail={currentUserEmail || null}
          role={role}
          onMarkNotificationsRead={markNotificationsRead}
          notificationsSaving={notificationsSaving}
        />

        <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <HeaderBar
            title={sectionLabel}
            description={sectionDescription}
            onOpenMenu={() => setMobileOpen(true)}
          />

          {activeSection === 'dashboard' && role === 'ADMIN' ? <DashboardSection leads={leads} kpiCards={kpiCards} notifications={notifications} activities={activities} search={search} /> : null}
          {activeSection === 'dashboard' && role === 'EMPLOYEE' ? <EmployeeOverviewSection stats={workStats} leads={leads} tickets={tickets} /> : null}
          {activeSection === 'work' ? <WorkSection leads={leads} onSave={handlePortalSave} /> : null}
          {activeSection === 'customers' ? <CustomersSection customers={partners} search={search} role={role} onSave={handlePortalSave} /> : null}
          {activeSection === 'requests' ? <RequestsSection leads={leads} search={search} onSave={handlePortalSave} /> : null}
          {activeSection === 'partners' && role === 'ADMIN' ? <PartnersSection partners={partners} search={search} onSave={handlePortalSave} /> : null}
          {activeSection === 'distribution' ? <DistributionSection items={distributionItems} search={search} onSave={handlePortalSave} /> : null}
          {activeSection === 'employees' && role === 'ADMIN' ? (
            <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <SectionCard title="Mitarbeiter einladen" description="E-Mail-Adresse eingeben. Der Mitarbeiter erhält einen Link und vergibt sein Passwort selbst.">
                <form onSubmit={createEmployee} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">E-Mail</label>
                    <input
                      type="email"
                      required
                      value={employeeEmail}
                      onChange={(event) => setEmployeeEmail(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                      placeholder="mitarbeiter@umzugsnetz.de"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={employeeSubmitting}
                    className="w-full rounded-2xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
                  >
                    {employeeSubmitting ? 'Einladung wird versendet...' : 'Einladung per E-Mail senden'}
                  </button>
                </form>
              </SectionCard>

              <SectionCard title="Bestehende Mitarbeiter" description="Alle vorhandenen Team-Einträge aus dem System.">
                {filteredTeam.length ? (
                  <div className="space-y-3">
                    {filteredTeam.map((member) => {
                      const memberEmail = String(member.email || '').trim().toLowerCase();
                      const isPending = String(member.status || '').toUpperCase() === 'PENDING';
                      const isRevoking = revokingTeamEmail === memberEmail;
                      return (
                        <div key={member.id} className="rounded-xl border border-slate-100 bg-white p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="truncate text-base font-bold text-slate-950">{member.email || 'Ohne E-Mail'}</p>
                              <p className="mt-2 text-sm font-medium text-slate-500">
                                {teamRoleLabel(member.role)} · {formatDateTime(member.created_at)}
                              </p>
                            </div>
                            <StatusBadge label={teamStatusLabel(member.status)} />
                          </div>
                          {isPending && memberEmail ? (
                            <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2">
                              <p className="text-xs font-medium text-amber-800">
                                Einladung offen — der Mitarbeiter hat den Einladungslink noch nicht eingelöst.
                              </p>
                              <button
                                type="button"
                                onClick={() => revokeTeamInvite(memberEmail)}
                                disabled={isRevoking || Boolean(revokingTeamEmail)}
                                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:border-red-300 hover:bg-red-50 disabled:opacity-60"
                              >
                                {isRevoking ? 'Wird zurückgezogen...' : 'Einladung zurückziehen'}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState {...emptyStateBySection.employees} />
                )}
              </SectionCard>
            </div>
          ) : null}
          {activeSection === 'tickets' ? <TicketsSection tickets={tickets} ticketSavingSessionId={ticketSavingSessionId} search={search} onMarkRead={markTicketRead} /> : null}
          {activeSection === 'team-chat' ? <TeamChatSection role={role} /> : null}
          {activeSection === 'billing' && role === 'ADMIN' ? <BillingSection transactions={transactions} search={search} /> : null}
          {activeSection === 'content' ? <ContentSection search={search} /> : null}
          {activeSection === 'settings' && role === 'ADMIN' ? <SettingsSection settings={settings} team={team} search={search} onSave={handlePortalSave} /> : null}
        </div>
      </div>
    </main>
  );
}

type TeamChatChannel = {
  id: string;
  slug: string;
  name: string;
  is_default: boolean;
  is_locked: boolean;
  created_at: string;
  members: Array<{ id: string; channel_id: string; user_id: string; added_by: string | null; added_at: string }>;
};

type TeamChatMessage = {
  id: string;
  channel_id: string;
  author_user_id: string | null;
  author_email: string | null;
  author_name: string | null;
  text: string;
  created_at: string;
};

type TeamChatDirectoryEntry = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'ADMIN' | 'EMPLOYEE' | null;
  status: string;
};

type TeamChatPayload = {
  role: StaffRole;
  currentUser: { id: string; email: string };
  channels: TeamChatChannel[];
  activeChannelId: string | null;
  messages: TeamChatMessage[];
  directory: TeamChatDirectoryEntry[];
};

function TeamChatSection({ role }: { role: StaffRole }) {
  const [data, setData] = useState<TeamChatPayload | null>(null);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [loadingChat, setLoadingChat] = useState(true);
  const [errorChat, setErrorChat] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [memberInput, setMemberInput] = useState('');
  const [actionInFlight, setActionInFlight] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const ensureToken = useCallback(async () => {
    if (accessToken) return accessToken;
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token || null;
    if (token) setAccessToken(token);
    return token;
  }, [accessToken]);

  const loadChat = useCallback(async (channelId: string | null = null) => {
    try {
      const token = await ensureToken();
      if (!token) {
        setErrorChat('Bitte erneut anmelden.');
        setLoadingChat(false);
        return;
      }
      const url = channelId ? `/api/admin/team-chat?channelId=${encodeURIComponent(channelId)}` : '/api/admin/team-chat';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Team Chat konnte nicht geladen werden.');
      setData(payload as TeamChatPayload);
      setActiveChannelId((current) => current || (payload as TeamChatPayload).activeChannelId);
      setErrorChat('');
    } catch (loadError) {
      setErrorChat(loadError instanceof Error ? loadError.message : 'Team Chat konnte nicht geladen werden.');
    } finally {
      setLoadingChat(false);
    }
  }, [ensureToken]);

  useEffect(() => {
    void loadChat();
  }, [loadChat]);

  useEffect(() => {
    if (!activeChannelId) return;
    const channel = supabase
      .channel(`team-chat-${activeChannelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'team_chat_messages', filter: `channel_id=eq.${activeChannelId}` }, () => {
        void loadChat(activeChannelId);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeChannelId, loadChat]);

  useEffect(() => {
    if (!activeChannelId) return;
    void loadChat(activeChannelId);
  }, [activeChannelId, loadChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages?.length, activeChannelId]);

  const performTeamChatAction = useCallback(async (action: string, body: Record<string, unknown>, key: string) => {
    const token = await ensureToken();
    if (!token) {
      setErrorChat('Bitte erneut anmelden.');
      return null;
    }
    setActionInFlight(key);
    try {
      const response = await fetch('/api/admin/team-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Aktion fehlgeschlagen.');
      return payload;
    } catch (actionError) {
      window.alert(actionError instanceof Error ? actionError.message : 'Aktion fehlgeschlagen.');
      return null;
    } finally {
      setActionInFlight('');
    }
  }, [ensureToken]);

  const sendMessage = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeChannelId) return;
    const text = draftMessage.trim();
    if (!text) return;
    setSubmitting(true);
    try {
      const result = await performTeamChatAction('send_message', { channelId: activeChannelId, text }, 'send');
      if (result) {
        setDraftMessage('');
        await loadChat(activeChannelId);
      }
    } finally {
      setSubmitting(false);
    }
  }, [activeChannelId, draftMessage, loadChat, performTeamChatAction]);

  const createChannel = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newChannelName.trim();
    if (!name) return;
    const result = await performTeamChatAction('create_channel', { name }, 'create');
    if (result) {
      setNewChannelName('');
      setShowCreateChannel(false);
      const newId = (result as { channelId?: string }).channelId;
      if (newId) setActiveChannelId(newId);
      await loadChat(newId || null);
    }
  }, [loadChat, newChannelName, performTeamChatAction]);

  const deleteChannel = useCallback(async (channel: TeamChatChannel) => {
    if (channel.is_locked) return;
    if (!window.confirm(`Kanal "${channel.name}" wirklich löschen?`)) return;
    const result = await performTeamChatAction('delete_channel', { channelId: channel.id }, `delete:${channel.id}`);
    if (result) {
      setActiveChannelId(null);
      await loadChat(null);
    }
  }, [loadChat, performTeamChatAction]);

  const addMember = useCallback(async () => {
    if (!activeChannelId) return;
    const value = memberInput.trim();
    if (!value) return;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    const payload: Record<string, unknown> = isUuid ? { userId: value } : { email: value };
    const result = await performTeamChatAction('add_member', { channelId: activeChannelId, ...payload }, 'add-member');
    if (result) {
      setMemberInput('');
      await loadChat(activeChannelId);
    }
  }, [activeChannelId, loadChat, memberInput, performTeamChatAction]);

  const removeMember = useCallback(async (userId: string) => {
    if (!activeChannelId) return;
    const result = await performTeamChatAction('remove_member', { channelId: activeChannelId, userId }, `remove:${userId}`);
    if (result) {
      await loadChat(activeChannelId);
    }
  }, [activeChannelId, loadChat, performTeamChatAction]);

  if (loadingChat) {
    return <SectionCard title="Team Chat"><EmptyState title="Lädt Team Chat..." text="Einen Moment bitte." /></SectionCard>;
  }

  if (errorChat || !data) {
    return <SectionCard title="Team Chat"><EmptyState title="Team Chat nicht verfügbar" text={errorChat || 'Bitte erneut versuchen.'} /></SectionCard>;
  }

  const activeChannel = data.channels.find((c) => c.id === activeChannelId) || data.channels[0] || null;
  const directoryById = new Map<string, TeamChatDirectoryEntry>();
  for (const entry of data.directory) directoryById.set(entry.user_id, entry);

  return (
    <div className="grid gap-6 xl:grid-cols-[280px_1fr]">
      <SectionCard
        title="Kanäle"
        action={role === 'ADMIN' ? (
          <button
            type="button"
            onClick={() => setShowCreateChannel((value) => !value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue"
          >
            {showCreateChannel ? 'Schließen' : 'Neuer Kanal'}
          </button>
        ) : null}
      >
        {showCreateChannel ? (
          <form onSubmit={createChannel} className="mb-4 flex gap-2">
            <input
              value={newChannelName}
              onChange={(event) => setNewChannelName(event.target.value)}
              placeholder="Name des Kanals"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
              required
              maxLength={80}
            />
            <button
              type="submit"
              disabled={actionInFlight === 'create'}
              className="rounded-2xl bg-brand-blue px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              {actionInFlight === 'create' ? '...' : 'Anlegen'}
            </button>
          </form>
        ) : null}

        <div className="space-y-2">
          {data.channels.map((channel) => (
            <button
              key={channel.id}
              type="button"
              onClick={() => setActiveChannelId(channel.id)}
              className={cx(
                'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors',
                activeChannel?.id === channel.id
                  ? 'border-brand-blue bg-brand-blue/5'
                  : 'border-slate-100 bg-slate-50 hover:border-slate-200',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-900">
                  {channel.is_locked ? '🔒 ' : '#'} {channel.name}
                </span>
                <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  {channel.is_default ? 'Alle Mitarbeiter' : `${channel.members.length} Mitglied${channel.members.length === 1 ? '' : 'er'}`}
                </span>
              </span>
              {role === 'ADMIN' && !channel.is_locked ? (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    void deleteChannel(channel);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void deleteChannel(channel);
                    }
                  }}
                  className="ml-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-semibold text-slate-500 hover:border-red-200 hover:text-red-600"
                >
                  Löschen
                </span>
              ) : null}
            </button>
          ))}
          {data.channels.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">Keine Kanäle vorhanden.</p>
          ) : null}
        </div>
      </SectionCard>

      <div className="space-y-6">
        <SectionCard
          title={activeChannel ? activeChannel.name : 'Kein Kanal'}
          description={activeChannel?.is_default ? 'Standard-Kanal für alle Mitarbeiter und Geschäftsführer.' : activeChannel ? `${activeChannel.members.length} Mitglied${activeChannel.members.length === 1 ? '' : 'er'}` : 'Wähle einen Kanal aus der Liste.'}
        >
          {activeChannel ? (
            <div className="flex h-[480px] flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {data.messages.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center text-sm font-semibold text-slate-500">
                    Noch keine Nachrichten. Schreib die erste!
                  </p>
                ) : (
                  data.messages.map((message) => {
                    const isMine = message.author_user_id === data.currentUser.id;
                    const author = message.author_name || message.author_email || 'Unbekannt';
                    return (
                      <div key={message.id} className={cx('flex', isMine ? 'justify-end' : 'justify-start')}>
                        <div className={cx(
                          'max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm',
                          isMine ? 'bg-brand-blue text-white' : 'border border-slate-100 bg-white text-slate-800',
                        )}>
                          <p className={cx('text-[11px] font-semibold uppercase tracking-[0.12em]', isMine ? 'text-white/80' : 'text-slate-400')}>
                            {author}
                          </p>
                          <p className="mt-1 whitespace-pre-line break-words leading-relaxed">{message.text}</p>
                          <p className={cx('mt-1 text-[10px] font-medium', isMine ? 'text-white/70' : 'text-slate-400')}>
                            {formatDateTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-4">
                <input
                  value={draftMessage}
                  onChange={(event) => setDraftMessage(event.target.value)}
                  placeholder="Nachricht schreiben..."
                  maxLength={4000}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                />
                <button
                  type="submit"
                  disabled={submitting || !draftMessage.trim()}
                  className="rounded-2xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
                >
                  {submitting ? 'Senden...' : 'Senden'}
                </button>
              </form>
            </div>
          ) : (
            <EmptyState title="Kein Kanal ausgewählt" text="Wähle links einen Kanal, um Nachrichten zu sehen." />
          )}
        </SectionCard>

        {role === 'ADMIN' && activeChannel && !activeChannel.is_default ? (
          <SectionCard title="Mitglieder" description="Mitarbeiter zum Kanal hinzufügen oder entfernen.">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                value={memberInput}
                onChange={(event) => setMemberInput(event.target.value)}
                placeholder="E-Mail des Mitarbeiters"
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
              />
              <button
                type="button"
                onClick={addMember}
                disabled={actionInFlight === 'add-member' || !memberInput.trim()}
                className="rounded-2xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
              >
                Hinzufügen
              </button>
            </div>

            {data.directory.length > 0 ? (
              <div className="mb-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Schnell auswählen</p>
                <div className="flex flex-wrap gap-2">
                  {data.directory
                    .filter((entry) => !activeChannel.members.some((m) => m.user_id === entry.user_id))
                    .slice(0, 15)
                    .map((entry) => (
                      <button
                        key={entry.user_id}
                        type="button"
                        onClick={() => setMemberInput(entry.email)}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                      >
                        {entry.full_name || entry.email}
                      </button>
                    ))}
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              {activeChannel.members.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">
                  Noch keine Mitglieder.
                </p>
              ) : (
                activeChannel.members.map((member) => {
                  const dir = directoryById.get(member.user_id);
                  return (
                    <div key={member.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{dir?.full_name || dir?.email || member.user_id.slice(0, 8)}</p>
                        <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{dir?.email || ''}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMember(member.user_id)}
                        disabled={actionInFlight === `remove:${member.user_id}`}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-red-200 hover:text-red-600"
                      >
                        Entfernen
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </SectionCard>
        ) : null}
      </div>
    </div>
  );
}
