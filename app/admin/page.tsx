'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Edit3,
  Filter,
  Lock,
  LogOut,
  MapPin,
  MessageSquareText,
  NotebookPen,
  Search,
  Settings,
  Shield,
  UserPlus,
  UserCog,
  Users,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

type StaffRole = 'ADMIN' | 'EMPLOYEE';
type PortalTab = 'dashboard' | 'leads' | 'orders' | 'tickets' | 'finance' | 'partners' | 'team' | 'settings';
type LeadStatus = 'Neu' | 'Kontaktiert' | 'Angebot' | 'Gebucht' | 'Abgelehnt';

type Lead = {
  id: string;
  order_number?: string | null;
  service_category?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  move_date?: string | null;
  von_city?: string | null;
  von_address?: string | null;
  nach_city?: string | null;
  nach_address?: string | null;
  estimated_price?: number | string | null;
  status?: LeadStatus | string | null;
  notes?: string | null;
  created_at?: string | null;
  city?: string | null;
};

type Partner = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  regions?: string | null;
  status?: string | null;
  category?: string | null;
  balance?: number | string | null;
};

type Transaction = {
  id: string;
  type?: string | null;
  amount?: number | string | null;
  description?: string | null;
  created_at?: string | null;
};

type NotificationItem = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  is_read?: boolean | null;
};

type TeamMember = {
  id: string;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  created_at?: string | null;
};

type Ticket = {
  session_id: string;
  user_name?: string | null;
  support_category?: string | null;
  last_message?: string | null;
  last_at?: string | null;
  unread_count?: number;
  messages?: Array<{
    id?: string;
    sender?: string | null;
    text?: string | null;
    created_at?: string | null;
  }>;
};

type SettingItem = {
  id: string;
  key?: string | null;
  value?: unknown;
};

type PortalData = {
  role: StaffRole;
  kpis: {
    leads: number;
    orders: number;
    revenue: number;
    closeRate: number;
    averageOrderValue: number;
  };
  cities: string[];
  leads: Lead[];
  partners: Partner[];
  transactions: Transaction[];
  notifications: NotificationItem[];
  tickets: Ticket[];
  team: TeamMember[];
  settings: SettingItem[];
};

const leadStatuses: LeadStatus[] = ['Neu', 'Kontaktiert', 'Angebot', 'Gebucht', 'Abgelehnt'];
const orderStatuses = ['geplant', 'aktiv', 'abgeschlossen'];

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
}

function statusClass(status?: string | null) {
  if (status === 'Gebucht' || status === 'abgeschlossen' || status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (status === 'Abgelehnt' || status === 'DISABLED') return 'bg-red-50 text-red-700 border-red-200';
  if (status === 'Angebot' || status === 'aktiv') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-brand-blue/10 text-brand-blue border-brand-blue/20';
}

function MetricCard({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="group relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur transition-all hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-blue/10 blur-2xl" />
      <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue/10 text-brand-blue ring-1 ring-brand-blue/10">
        <Icon className="h-6 w-6" />
      </div>
      <p className="relative text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="relative mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<PortalTab>('dashboard');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('Alle');
  const [period, setPeriod] = useState('Alle');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'EMPLOYEE' | 'ADMIN'>('EMPLOYEE');
  const [filterNow, setFilterNow] = useState(0);

  const fetchPortal = async () => {
    setLoading(true);
    setError('');
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    if (!token) {
      setError('Bitte einloggen.');
      setLoading(false);
      return;
    }

    const response = await fetch('/api/admin/portal', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(payload?.error || 'Admin Panel konnte nicht geladen werden.');
      setLoading(false);
      return;
    }

    setData(payload);
    setFilterNow(new Date().getTime());
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPortal();
  }, []);

  const isAdmin = data?.role === 'ADMIN';
  const tabs = useMemo(() => {
    const base = [
      { id: 'dashboard' as const, label: 'Dashboard', icon: ClipboardList },
      { id: 'leads' as const, label: 'Leads', icon: Users },
      { id: 'orders' as const, label: 'Aufträge', icon: CalendarDays },
      { id: 'tickets' as const, label: 'Tickets', icon: MessageSquareText },
    ];

    if (!isAdmin) return base;

    return [
      ...base,
      { id: 'finance' as const, label: 'Finanzen', icon: CircleDollarSign },
      { id: 'partners' as const, label: 'Partner', icon: BriefcaseBusiness },
      { id: 'team' as const, label: 'Nutzer', icon: UserCog },
      { id: 'settings' as const, label: 'Einstellungen', icon: Settings },
    ];
  }, [isAdmin]);

  const filteredLeads = useMemo(() => {
    const now = filterNow;
    const query = search.trim().toLowerCase();

    return (data?.leads || []).filter((lead) => {
      const leadDate = lead.created_at ? new Date(lead.created_at).getTime() : now;
      const withinPeriod =
        period === 'Alle' ||
        (period === '7 Tage' && now - leadDate <= 7 * 86400000) ||
        (period === '30 Tage' && now - leadDate <= 30 * 86400000);
      const cityMatches = city === 'Alle' || lead.city === city;
      const textMatches =
        !query ||
        [lead.customer_name, lead.customer_email, lead.customer_phone, lead.order_number, lead.service_category, lead.city]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return withinPeriod && cityMatches && textMatches;
    });
  }, [city, data?.leads, filterNow, period, search]);

  const updateLead = async (lead: Lead, updates: Record<string, unknown>) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const response = await fetch('/api/admin/portal', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateLead', id: lead.id, ...updates }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || 'Lead konnte nicht gespeichert werden.');
      return;
    }

    setData(payload);
    setSelectedLead((current) => (current?.id === lead.id ? { ...current, ...updates } : current));
  };

  const updateTeamStatus = async (member: TeamMember, status: string) => {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const response = await fetch('/api/admin/portal', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'updateTeam', id: member.id, status }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || 'Nutzer konnte nicht gespeichert werden.');
      return;
    }
    setData(payload);
  };

  const createTeamMember = async (event: React.FormEvent) => {
    event.preventDefault();
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return;

    const response = await fetch('/api/admin/portal', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'createTeamMember',
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(payload?.error || 'Nutzer konnte nicht erstellt werden.');
      return;
    }

    setData(payload);
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserRole('EMPLOYEE');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(2,118,200,0.14),transparent_30%),linear-gradient(135deg,#f8fafc,#eef4f8)] p-6 text-slate-900">
        <div className="rounded-[2rem] border border-white/80 bg-white/90 p-8 text-center shadow-2xl">
          <Image src="/logo_transparent.png" alt="Umzugsnetz" width={190} height={48} className="mx-auto mb-6 h-12 w-auto" priority />
          <p className="font-black text-slate-950">Lädt...</p>
        </div>
      </main>
    );
  }

  if (error && !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(2,118,200,0.14),transparent_30%),linear-gradient(135deg,#f8fafc,#eef4f8)] p-6">
        <div className="rounded-[2rem] border border-red-100 bg-white/90 p-8 text-center shadow-2xl backdrop-blur">
          <Image src="/logo_transparent.png" alt="Umzugsnetz" width={180} height={45} className="mx-auto mb-6 h-11 w-auto" priority />
          <Lock className="mx-auto mb-4 h-10 w-10 text-red-500" />
          <p className="font-black text-slate-950">{error}</p>
        </div>
      </main>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_10%_0%,rgba(2,118,200,0.16),transparent_28%),radial-gradient(circle_at_88%_12%,rgba(17,185,128,0.12),transparent_26%),linear-gradient(135deg,#f8fafc,#eef4f8)] text-slate-900">
      <div className="pointer-events-none fixed -left-32 top-24 h-96 w-96 rounded-full bg-brand-blue/10 blur-3xl" />
      <div className="pointer-events-none fixed -right-32 bottom-10 h-96 w-96 rounded-full bg-brand-green/10 blur-3xl" />
      <div className="relative grid min-h-screen lg:grid-cols-[300px_1fr]">
        <aside className="border-b border-white/70 bg-white/80 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur-2xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:p-5">
          <div className="mb-5 rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
            <Image src="/logo_transparent.png" alt="Umzugsnetz" width={190} height={48} className="h-12 w-auto" priority />
          </div>

          <nav className="grid grid-cols-2 gap-2 lg:block lg:space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-3 text-xs font-black transition-all sm:text-sm lg:justify-start lg:gap-3 lg:px-4 ${
                  activeTab === tab.id ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/25' : 'bg-white/60 text-slate-500 ring-1 ring-slate-100 hover:bg-white hover:text-slate-900'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-black text-red-700 transition-colors hover:bg-red-100 lg:justify-start"
          >
            <LogOut className="h-5 w-5" />
            Abmelden
          </button>
        </aside>

        <section className="p-4 sm:p-6 lg:p-8">
          <header className="mb-8 overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-brand-blue/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-brand-blue">
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </div>
                <h1 className="text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">Leads, Kunden und Systemsteuerung</h1>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-slate-500">
                  {isAdmin ? 'Volle Kontrolle über Leads, Aufträge, Partner und Finanzen.' : 'Fokus auf Kundenbearbeitung, Leads und Aufträge.'}
                </p>
              </div>
            <div className="flex flex-wrap gap-3">
              <select value={period} onChange={(event) => setPeriod(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none shadow-sm focus:border-brand-blue">
                <option>Alle</option>
                <option>7 Tage</option>
                <option>30 Tage</option>
              </select>
              <select value={city} onChange={(event) => setCity(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold outline-none shadow-sm focus:border-brand-blue">
                <option>Alle</option>
                {data.cities.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            </div>
          </header>

          {error ? <div className="mb-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div> : null}

          {activeTab === 'dashboard' ? (
            <div className="space-y-8">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={Users} label="Leads" value={String(data.kpis.leads)} />
                <MetricCard icon={ClipboardList} label="Aufträge" value={String(data.kpis.orders)} />
                {isAdmin ? <MetricCard icon={CircleDollarSign} label="Umsatz" value={formatCurrency(data.kpis.revenue)} /> : null}
                <MetricCard icon={CheckCircle2} label="Abschlussquote" value={`${data.kpis.closeRate}%`} />
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
                <LeadList leads={filteredLeads.slice(0, 8)} onSelect={(lead) => { setSelectedLead(lead); setNoteDraft(lead.notes || ''); }} onStatusChange={updateLead} />
                <NotificationPanel notifications={data.notifications} />
              </div>
            </div>
          ) : null}

          {activeTab === 'leads' || activeTab === 'orders' ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
              <div className="space-y-5">
                <div className="flex flex-col gap-3 rounded-[2rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur sm:flex-row sm:items-center">
                  <div className="relative flex-1">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Suche" className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-bold outline-none focus:border-brand-blue" />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl bg-brand-blue/10 px-4 py-3 text-sm font-black text-brand-blue">
                    <Filter className="h-4 w-4" />
                    {filteredLeads.length}
                  </div>
                </div>
                <LeadList leads={filteredLeads} onSelect={(lead) => { setSelectedLead(lead); setNoteDraft(lead.notes || ''); }} onStatusChange={updateLead} orderMode={activeTab === 'orders'} />
              </div>
              <LeadDetail lead={selectedLead} noteDraft={noteDraft} setNoteDraft={setNoteDraft} onSaveNote={(lead) => updateLead(lead, { notes: noteDraft })} />
            </div>
          ) : null}

          {activeTab === 'tickets' ? (
            <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
              <TicketList tickets={data.tickets} onSelect={setSelectedTicket} />
              <TicketDetail ticket={selectedTicket} />
            </div>
          ) : null}

          {activeTab === 'finance' && isAdmin ? <FinancePanel data={data} /> : null}
          {activeTab === 'partners' && isAdmin ? <PartnerPanel partners={data.partners} /> : null}
          {activeTab === 'team' && isAdmin ? (
            <TeamPanel
              members={data.team}
              onStatus={updateTeamStatus}
              onCreate={createTeamMember}
              email={newUserEmail}
              password={newUserPassword}
              role={newUserRole}
              setEmail={setNewUserEmail}
              setPassword={setNewUserPassword}
              setRole={setNewUserRole}
            />
          ) : null}
          {activeTab === 'settings' && isAdmin ? <SettingsPanel settings={data.settings} /> : null}
        </section>
      </div>
    </main>
  );
}

function LeadList({ leads, onSelect, onStatusChange, orderMode = false }: { leads: Lead[]; onSelect: (lead: Lead) => void; onStatusChange: (lead: Lead, updates: Record<string, unknown>) => void; orderMode?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
      {leads.length === 0 ? <div className="p-8 text-center font-bold text-slate-400">Keine Einträge</div> : null}
      {leads.map((lead) => (
        <div key={lead.id} className="grid gap-4 border-b border-slate-100 p-4 transition-colors last:border-b-0 hover:bg-brand-blue/5 lg:grid-cols-[1fr_auto]">
          <button type="button" onClick={() => onSelect(lead)} className="text-left">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(lead.status)}`}>{lead.status || 'Neu'}</span>
              <span className="text-xs font-bold text-slate-400">{formatDate(lead.created_at)}</span>
            </div>
            <p className="text-lg font-black text-slate-950">{lead.customer_name || 'Kunde'}</p>
            <p className="mt-1 text-sm font-bold text-slate-500">{lead.service_category || 'Anfrage'} · {lead.city || 'Keine Stadt'}</p>
          </button>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <select
              value={orderMode ? (lead.status === 'Gebucht' ? 'aktiv' : 'geplant') : String(lead.status || 'Neu')}
              onChange={(event) => onStatusChange(lead, { status: event.target.value })}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black outline-none focus:border-brand-blue"
            >
              {(orderMode ? orderStatuses : leadStatuses).map((status) => <option key={status}>{status}</option>)}
            </select>
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">{formatCurrency(lead.estimated_price)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function LeadDetail({ lead, noteDraft, setNoteDraft, onSaveNote }: { lead: Lead | null; noteDraft: string; setNoteDraft: (value: string) => void; onSaveNote: (lead: Lead) => void }) {
  if (!lead) {
    return <div className="rounded-[2rem] border border-dashed border-brand-blue/25 bg-white/70 p-8 text-center font-bold text-slate-400 shadow-sm backdrop-blur">Lead auswählen</div>;
  }

  return (
    <aside className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-blue">{lead.order_number || 'Lead'}</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{lead.customer_name}</h2>
        </div>
        <Edit3 className="h-5 w-5 text-slate-300" />
      </div>
      <div className="space-y-4 text-sm font-bold text-slate-600">
        <p>{lead.customer_email}</p>
        <p>{lead.customer_phone}</p>
        <p className="flex gap-2"><MapPin className="h-4 w-4 text-brand-blue" />{lead.von_address || lead.von_city} → {lead.nach_address || lead.nach_city}</p>
        <p>Termin: {formatDate(lead.move_date)}</p>
        <p>Preis Rechner: {formatCurrency(lead.estimated_price)}</p>
      </div>
      <div className="mt-6">
        <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-slate-400">
          <NotebookPen className="h-4 w-4" />
          Notizen
        </label>
        <textarea value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} className="min-h-36 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold outline-none focus:border-brand-blue" />
        <button type="button" onClick={() => onSaveNote(lead)} className="mt-3 w-full rounded-2xl bg-brand-blue px-5 py-3 text-sm font-black text-white">
          Speichern
        </button>
      </div>
    </aside>
  );
}

function NotificationPanel({ notifications }: { notifications: NotificationItem[] }) {
  return (
    <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-5 flex items-center gap-3">
        <Bell className="h-5 w-5 text-brand-blue" />
        <h2 className="text-lg font-black text-slate-950">Events</h2>
      </div>
      <div className="space-y-3">
        {notifications.map((item) => (
          <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
            <p className="font-black text-slate-900">{item.title}</p>
            <p className="mt-1 text-sm font-semibold text-slate-500">{item.message}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TicketList({ tickets, onSelect }: { tickets: Ticket[]; onSelect: (ticket: Ticket) => void }) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
      {tickets.length === 0 ? <div className="p-8 text-center font-bold text-slate-400">Keine Tickets</div> : null}
      {tickets.map((ticket) => (
        <button
          key={ticket.session_id}
          type="button"
          onClick={() => onSelect(ticket)}
          className="block w-full border-b border-slate-100 p-4 text-left transition-colors last:border-b-0 hover:bg-brand-blue/5"
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="rounded-full border border-brand-blue/20 bg-brand-blue/10 px-3 py-1 text-xs font-black text-brand-blue">
              {ticket.support_category || 'KUNDE'}
            </span>
            {ticket.unread_count ? <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-600">{ticket.unread_count} neu</span> : null}
          </div>
          <p className="text-lg font-black text-slate-950">{ticket.user_name || 'Chat'}</p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-500">{ticket.last_message || '-'}</p>
          <p className="mt-2 text-xs font-bold text-slate-400">{formatDate(ticket.last_at)}</p>
        </button>
      ))}
    </div>
  );
}

function TicketDetail({ ticket }: { ticket: Ticket | null }) {
  if (!ticket) {
    return <div className="rounded-[2rem] border border-dashed border-brand-blue/25 bg-white/70 p-8 text-center font-bold text-slate-400 shadow-sm backdrop-blur">Ticket auswählen</div>;
  }

  return (
    <aside className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-5 flex items-center gap-3">
        <MessageSquareText className="h-5 w-5 text-brand-blue" />
        <div>
          <p className="text-xl font-black text-slate-950">{ticket.user_name || 'Chat'}</p>
          <p className="text-xs font-bold text-slate-400">{ticket.session_id}</p>
        </div>
      </div>
      <div className="max-h-[560px] space-y-3 overflow-auto pr-1">
        {(ticket.messages || []).slice().reverse().map((message, index) => (
          <div
            key={message.id || `${ticket.session_id}-${index}`}
            className={`rounded-2xl p-4 text-sm font-semibold ${
              message.sender === 'admin' ? 'bg-brand-blue text-white' : 'bg-slate-50 text-slate-700'
            }`}
          >
            <p>{message.text}</p>
            <p className={`mt-2 text-[11px] font-bold ${message.sender === 'admin' ? 'text-white/60' : 'text-slate-400'}`}>{formatDate(message.created_at)}</p>
          </div>
        ))}
      </div>
    </aside>
  );
}

function FinancePanel({ data }: { data: PortalData }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard icon={CircleDollarSign} label="Gesamtumsatz" value={formatCurrency(data.kpis.revenue)} />
        <MetricCard icon={BriefcaseBusiness} label="Ø Auftragswert" value={formatCurrency(data.kpis.averageOrderValue)} />
        <MetricCard icon={Users} label="Provisionen" value={formatCurrency(data.transactions.reduce((sum, item) => sum + Number(item.amount || 0), 0))} />
      </div>
      <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
        {data.transactions.map((item) => (
          <div key={item.id} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-b-0">
            <div>
              <p className="font-black text-slate-900">{item.type}</p>
              <p className="text-sm font-semibold text-slate-500">{item.description}</p>
            </div>
            <p className="font-black text-brand-blue">{formatCurrency(item.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PartnerPanel({ partners }: { partners: Partner[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {partners.map((partner) => (
        <div key={partner.id} className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-950">{partner.name}</h2>
              <p className="mt-1 text-sm font-bold text-slate-500">{partner.email}</p>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(partner.status)}`}>{partner.status}</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{partner.regions || '-'}</p>
            <p className="rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600">{partner.category || '-'}</p>
            <p className="rounded-2xl bg-brand-blue/10 p-3 text-sm font-black text-brand-blue">{formatCurrency(partner.balance)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamPanel({
  members,
  onStatus,
  onCreate,
  email,
  password,
  role,
  setEmail,
  setPassword,
  setRole,
}: {
  members: TeamMember[];
  onStatus: (member: TeamMember, status: string) => void;
  onCreate: (event: React.FormEvent) => void;
  email: string;
  password: string;
  role: 'EMPLOYEE' | 'ADMIN';
  setEmail: (value: string) => void;
  setPassword: (value: string) => void;
  setRole: (value: 'EMPLOYEE' | 'ADMIN') => void;
}) {
  return (
    <div className="space-y-5">
      <form onSubmit={onCreate} className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mb-5 flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-brand-blue" />
          <h2 className="text-xl font-black text-slate-950">Mitarbeiter erstellen</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px_auto]">
          <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-Mail" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-brand-blue" />
          <input required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Passwort" className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold outline-none focus:border-brand-blue" />
          <select value={role} onChange={(event) => setRole(event.target.value as 'EMPLOYEE' | 'ADMIN')} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none focus:border-brand-blue">
            <option value="EMPLOYEE">Mitarbeiter</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button type="submit" className="rounded-2xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-blue/20">
            Erstellen
          </button>
        </div>
      </form>

      <div className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
        {members.map((member) => (
          <div key={member.id} className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-black text-slate-950">{member.email}</p>
              <p className="text-sm font-bold text-slate-500">{member.role}</p>
            </div>
            <select value={member.status || 'PENDING'} disabled={member.role === 'ADMIN'} onChange={(event) => onStatus(member, event.target.value)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black outline-none focus:border-brand-blue disabled:opacity-50">
              <option>PENDING</option>
              <option>ACTIVE</option>
              <option>DISABLED</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsPanel({ settings }: { settings: SettingItem[] }) {
  return (
    <div className="grid gap-4">
      {settings.map((setting) => (
        <div key={setting.id} className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-brand-blue">{setting.key}</p>
          <pre className="overflow-auto rounded-2xl bg-slate-950 p-4 text-xs font-semibold text-white">{JSON.stringify(setting.value, null, 2)}</pre>
        </div>
      ))}
    </div>
  );
}
