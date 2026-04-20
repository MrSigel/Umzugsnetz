'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { getAdminAccessContext, type AdminAccessLevel } from '@/lib/adminAccess';
import {
  BadgeCheck,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Filter,
  Globe,
  Phone,
  RefreshCw,
  Save,
  Search,
  UserRound,
} from 'lucide-react';

const statusOptions = ['NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'COMPLETED', 'ARCHIVED'];

const statusLabels: Record<string, string> = {
  NEW: 'Neu',
  IN_PROGRESS: 'In Bearbeitung',
  FOLLOW_UP: 'Rückruf',
  COMPLETED: 'Abgeschlossen',
  ARCHIVED: 'Archiviert',
  CONTACTED: 'Kontaktiert',
};

const statusClasses: Record<string, string> = {
  NEW: 'bg-brand-blue-soft text-brand-blue border-brand-blue/15',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  FOLLOW_UP: 'bg-violet-50 text-violet-700 border-violet-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ARCHIVED: 'bg-slate-100 text-slate-700 border-slate-200',
  CONTACTED: 'bg-amber-50 text-amber-700 border-amber-200',
};

type TeamOption = {
  id: string;
  email: string;
  role: string;
  onboarding_seen_at?: string | null;
  status?: string;
};

type ApplicationRow = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string;
  location: string;
  radius: string | null;
  service: string;
  source_page: string | null;
  status: string;
  created_at: string;
  assigned_to_email?: string | null;
  callback_at?: string | null;
  internal_note?: string | null;
};

type DraftState = Record<string, { assigned_to_email: string; callback_at: string; internal_note: string }>;

export default function CallListPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<AdminAccessLevel>('admin');
  const [currentEmail, setCurrentEmail] = useState('');
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALLE');
  const [assignmentFilter, setAssignmentFilter] = useState<'MEIN_BEREICH' | 'ALLE'>('ALLE');
  const [assigneeFilter, setAssigneeFilter] = useState('ALLE');
  const [drafts, setDrafts] = useState<DraftState>({});
  const [showOnboardingHint, setShowOnboardingHint] = useState(false);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const access = await getAdminAccessContext();
      const normalizedEmail = access.email?.toLowerCase() || '';
      setAccessLevel(access.level === 'none' ? 'employee' : access.level);
      setCurrentEmail(normalizedEmail);
      setAssignmentFilter(access.level === 'employee' ? 'MEIN_BEREICH' : 'ALLE');

      const [{ data: applicationData, error: applicationError }, { data: teamData, error: teamError }] = await Promise.all([
        supabase.from('partner_applications').select('*').order('created_at', { ascending: false }),
        supabase.from('team').select('id, email, role, onboarding_seen_at, status').order('email', { ascending: true }),
      ]);

      if (applicationError) throw applicationError;
      if (teamError) throw teamError;

      const rows = (applicationData || []) as ApplicationRow[];
      const teamRows = (teamData || []) as TeamOption[];

      setApplications(rows);
      setTeamOptions(teamRows);

      if (access.level === 'employee' && normalizedEmail) {
        const currentTeamEntry = teamRows.find((entry) => entry.email.toLowerCase() === normalizedEmail);
        setShowOnboardingHint(!currentTeamEntry?.onboarding_seen_at);
      } else {
        setShowOnboardingHint(false);
      }

      setDrafts(
        rows.reduce((acc, row) => {
          acc[row.id] = {
            assigned_to_email: row.assigned_to_email || '',
            callback_at: row.callback_at ? toDatetimeLocalValue(row.callback_at) : '',
            internal_note: row.internal_note || '',
          };
          return acc;
        }, {} as DraftState),
      );
    } catch (err: any) {
      showToast('error', 'Fehler beim Laden', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function dismissOnboardingHint() {
    if (!currentEmail) {
      setShowOnboardingHint(false);
      return;
    }

    const now = new Date().toISOString();
    const { error } = await supabase
      .from('team')
      .update({ onboarding_seen_at: now, status: 'ACTIVE' })
      .ilike('email', currentEmail);

    if (!error) {
      setShowOnboardingHint(false);
      setTeamOptions((prev) =>
        prev.map((entry) =>
          entry.email.toLowerCase() === currentEmail
            ? { ...entry, onboarding_seen_at: now, status: 'ACTIVE' }
            : entry,
        ),
      );
    }
  }

  function toDatetimeLocalValue(value: string) {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hours = `${date.getHours()}`.padStart(2, '0');
    const minutes = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function formatCallback(value?: string | null) {
    if (!value) return 'Kein Rückruf geplant';
    return new Date(value).toLocaleString('de-DE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  }

  function getTeamLabel(email?: string | null) {
    if (!email) return 'Nicht zugewiesen';
    const member = teamOptions.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    return member ? `${member.email} (${member.role})` : email;
  }

  function updateDraft(id: string, key: 'assigned_to_email' | 'callback_at' | 'internal_note', value: string) {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || { assigned_to_email: '', callback_at: '', internal_note: '' }),
        [key]: value,
      },
    }));
  }

  async function updateStatus(id: string, nextStatus: string) {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from('partner_applications')
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setApplications((prev) => prev.map((entry) => (entry.id === id ? { ...entry, status: nextStatus } : entry)));
      showToast('success', 'Status aktualisiert', 'Der Bearbeitungsstatus wurde gespeichert.');
    } catch (err: any) {
      showToast('error', 'Fehler beim Speichern', err.message);
    } finally {
      setSavingId(null);
    }
  }

  async function saveEntry(id: string) {
    const draft = drafts[id];
    if (!draft) return;

    setSavingId(id);
    try {
      const payload = {
        assigned_to_email: draft.assigned_to_email || null,
        callback_at: draft.callback_at ? new Date(draft.callback_at).toISOString() : null,
        internal_note: draft.internal_note || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('partner_applications').update(payload).eq('id', id);
      if (error) throw error;

      setApplications((prev) =>
        prev.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                assigned_to_email: payload.assigned_to_email,
                callback_at: payload.callback_at,
                internal_note: payload.internal_note,
              }
            : entry,
        ),
      );
      showToast('success', 'Eintrag gespeichert', 'Zuständigkeit, Rückrufdatum und interne Notiz wurden übernommen.');
    } catch (err: any) {
      showToast('error', 'Fehler beim Speichern', err.message);
    } finally {
      setSavingId(null);
    }
  }

  const filteredApplications = useMemo(() => {
    return applications.filter((entry) => {
      const haystack = [
        entry.company_name,
        entry.contact_name,
        entry.email,
        entry.phone,
        entry.location,
        entry.service,
        entry.assigned_to_email || '',
      ]
        .join(' ')
        .toLowerCase();

      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALLE' || entry.status === statusFilter;

      const assignedEmail = (entry.assigned_to_email || '').toLowerCase();
      const matchesAssignment =
        assignmentFilter === 'ALLE' ||
        assignedEmail === currentEmail ||
        assignedEmail === '';

      const matchesAssignee =
        assigneeFilter === 'ALLE' ||
        (assigneeFilter === 'NICHT_ZUGEWIESEN' && assignedEmail === '') ||
        assignedEmail === assigneeFilter.toLowerCase();

      return matchesSearch && matchesStatus && matchesAssignment && matchesAssignee;
    });
  }, [applications, assignmentFilter, assigneeFilter, currentEmail, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const openCount = applications.filter((entry) => ['NEW', 'IN_PROGRESS', 'FOLLOW_UP'].includes(entry.status)).length;
    const callbackCount = applications.filter((entry) => entry.status === 'FOLLOW_UP').length;
    const unassignedCount = applications.filter((entry) => !entry.assigned_to_email).length;

    return {
      total: applications.length,
      open: openCount,
      callback: callbackCount,
      unassigned: unassignedCount,
    };
  }, [applications]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Anrufliste</h2>
          <p className="mt-1 text-sm text-slate-500">
            Arbeitsliste für Support und Telefonie. Zuständigkeit, Rückrufdatum und interne Notiz werden direkt im Datensatz gepflegt.
          </p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Erst Status setzen, dann anrufen, Rückruf planen und Notiz sauber dokumentieren. Finanzdaten bleiben hier bewusst ausgeblendet.
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.75rem] border border-slate-100 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Gesamt</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{stats.total}</p>
          <p className="mt-1 text-sm text-slate-500">Erfasste Firmenkontakte</p>
        </div>
        <div className="rounded-[1.75rem] border border-brand-blue/10 bg-brand-blue-soft p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue">Offen</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{stats.open}</p>
          <p className="mt-1 text-sm text-slate-600">Neu, in Bearbeitung oder Rückruf</p>
        </div>
        <div className="rounded-[1.75rem] border border-violet-100 bg-violet-50 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-700">Rückruf</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{stats.callback}</p>
          <p className="mt-1 text-sm text-slate-600">Kontakte mit geplantem Follow-up</p>
        </div>
        <div className="rounded-[1.75rem] border border-amber-100 bg-amber-50 p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-700">Unzugewiesen</p>
          <p className="mt-3 text-3xl font-black text-slate-900">{stats.unassigned}</p>
          <p className="mt-1 text-sm text-slate-600">Noch keiner Person zugeordnet</p>
        </div>
      </div>

      {accessLevel === 'employee' && showOnboardingHint && (
        <div className="rounded-[2rem] border border-brand-blue/15 bg-brand-blue-soft p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-blue">Arbeitsstart</p>
              <h3 className="mt-1 text-xl font-black text-slate-900">So arbeiten Sie in der Anrufliste</h3>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600">
                Öffnen Sie zuerst offene Einträge, setzen Sie den Bearbeitungsstatus, planen Sie bei Bedarf ein Rückrufdatum und dokumentieren Sie jede relevante Information in der internen Notiz. Finanzdaten sind hier bewusst nicht sichtbar.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void dismissOnboardingHint()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-blue-hover"
            >
              <CheckCircle2 className="h-4 w-4" />
              Hinweis verstanden
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.75fr_0.85fr_1fr_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Firma, Kontakt, Telefon, Ort, E-Mail oder zuständige Person suchen"
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
          >
            <option value="ALLE">Alle Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{statusLabels[status]}</option>
            ))}
          </select>
        </div>
        <select
          value={assignmentFilter}
          onChange={(event) => setAssignmentFilter(event.target.value as 'MEIN_BEREICH' | 'ALLE')}
          disabled={accessLevel === 'employee'}
          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10 disabled:opacity-70"
        >
          <option value="ALLE">Alle Einträge</option>
          <option value="MEIN_BEREICH">Meine + offene Einträge</option>
        </select>
        <select
          value={assigneeFilter}
          onChange={(event) => setAssigneeFilter(event.target.value)}
          className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
        >
          <option value="ALLE">Alle Zuständigkeiten</option>
          <option value="NICHT_ZUGEWIESEN">Nicht zugewiesen</option>
          {teamOptions.map((member) => (
            <option key={member.id} value={member.email}>{member.email}</option>
          ))}
        </select>
        <button
          onClick={() => void fetchData()}
          className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-50 px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{filteredApplications.length} Einträge</p>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filteredApplications.map((entry) => {
              const draft = drafts[entry.id] || { assigned_to_email: '', callback_at: '', internal_note: '' };

              return (
                <div key={entry.id} className="grid gap-5 px-6 py-6 xl:grid-cols-[1.1fr_1fr_1fr]">
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-lg font-bold text-slate-900">{entry.company_name || 'Unbekannte Firma'}</p>
                        <p className="text-sm text-slate-500">{entry.service || 'Keine Kategorie hinterlegt'}</p>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClasses[entry.status] || statusClasses.NEW}`}>
                        {statusLabels[entry.status] || entry.status || 'Neu'}
                      </span>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        <span>{entry.contact_name || 'Kein Ansprechpartner'}</span>
                      </div>
                      <a href={`tel:${entry.phone || ''}`} className="flex items-center gap-3 text-sm font-bold text-slate-700 hover:text-brand-blue">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span>{entry.phone || 'Keine Telefonnummer'}</span>
                      </a>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Globe className="h-4 w-4 text-slate-400" />
                        <span>{entry.location || 'Ort offen'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <span>{entry.created_at ? new Date(entry.created_at).toLocaleString('de-DE') : 'Kein Datum'}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Zuständigkeit</p>
                        <p className="mt-2 text-sm font-medium text-slate-700 break-all">{getTeamLabel(entry.assigned_to_email)}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Rückruf</p>
                        <p className="mt-2 text-sm font-medium text-slate-700">{formatCallback(entry.callback_at)}</p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kontaktdaten</p>
                      <p className="mt-2 break-all text-sm font-medium text-slate-700">{entry.email || 'Keine E-Mail-Adresse'}</p>
                      <p className="mt-2 text-sm text-slate-500">Quelle: {entry.source_page || 'Unbekannt'}</p>
                      <p className="mt-1 text-sm text-slate-500">Radius: {entry.radius || 'Nicht angegeben'}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Bearbeitungsstatus</label>
                      <select
                        value={entry.status || 'NEW'}
                        onChange={(event) => void updateStatus(entry.id, event.target.value)}
                        disabled={savingId === entry.id}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10 disabled:opacity-60"
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{statusLabels[status]}</option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Zuständige Person</label>
                      <select
                        value={draft.assigned_to_email}
                        onChange={(event) => updateDraft(entry.id, 'assigned_to_email', event.target.value)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                      >
                        <option value="">Nicht zugewiesen</option>
                        {teamOptions.map((member) => (
                          <option key={member.id} value={member.email}>{member.email} ({member.role})</option>
                        ))}
                      </select>
                    </div>

                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Rückrufdatum</label>
                      <div className="relative">
                        <Clock3 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type="datetime-local"
                          value={draft.callback_at}
                          onChange={(event) => updateDraft(entry.id, 'callback_at', event.target.value)}
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-12 pr-4 text-sm font-medium text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Interne Notiz</label>
                      <textarea
                        rows={7}
                        value={draft.internal_note}
                        onChange={(event) => updateDraft(entry.id, 'internal_note', event.target.value)}
                        placeholder="z. B. nicht erreicht, Rückruf am Nachmittag, Website prüfen, Gespräch geführt ..."
                        className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => void saveEntry(entry.id)}
                      disabled={savingId === entry.id}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
                    >
                      <Save className="h-4 w-4" />
                      {savingId === entry.id ? 'Speichert...' : 'Eintrag speichern'}
                    </button>

                    <a href={`tel:${entry.phone || ''}`} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">
                      <Phone className="h-4 w-4" />
                      Jetzt anrufen
                    </a>

                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                      <div className="flex items-center gap-2 font-bold">
                        <BadgeCheck className="h-4 w-4" />
                        Mitarbeiter-sicher
                      </div>
                      <p className="mt-2 text-xs leading-relaxed">
                        Mitarbeiter sehen standardmäßig nur eigene und offene Einträge. Verantwortliche mit Vollzugriff können die gesamte Anrufliste verwalten.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredApplications.length === 0 && (
              <div className="px-6 py-14 text-center text-sm italic text-slate-400">Keine passenden Einträge gefunden.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
