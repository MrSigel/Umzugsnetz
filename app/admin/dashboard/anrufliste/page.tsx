'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { BadgeCheck, Building2, Calendar, Filter, Globe, Phone, RefreshCw, Search, UserRound } from 'lucide-react';

const statusOptions = ['NEW', 'IN_PROGRESS', 'FOLLOW_UP', 'COMPLETED', 'ARCHIVED'];

const statusClasses: Record<string, string> = {
  NEW: 'bg-brand-blue-soft text-brand-blue border-brand-blue/15',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 border-amber-200',
  FOLLOW_UP: 'bg-violet-50 text-violet-700 border-violet-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ARCHIVED: 'bg-slate-100 text-slate-700 border-slate-200',
};

export default function CallListPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALLE');

  useEffect(() => {
    void fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('partner_applications').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setApplications(data || []);
    } catch (err: any) {
      showToast('error', 'Fehler beim Laden', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(id: string, nextStatus: string) {
    setSavingId(id);
    try {
      const { error } = await supabase.from('partner_applications').update({ status: nextStatus }).eq('id', id);
      if (error) throw error;
      setApplications((prev) => prev.map((entry) => (entry.id === id ? { ...entry, status: nextStatus } : entry)));
      showToast('success', 'Status aktualisiert', 'Der Eintrag in der Anrufliste wurde gespeichert.');
    } catch (err: any) {
      showToast('error', 'Fehler beim Speichern', err.message);
    } finally {
      setSavingId(null);
    }
  }

  const filteredApplications = useMemo(() => {
    return applications.filter((entry) => {
      const haystack = [entry.company_name, entry.contact_name, entry.email, entry.phone, entry.location, entry.service].join(' ').toLowerCase();
      const matchesSearch = haystack.includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALLE' || entry.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [applications, searchTerm, statusFilter]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Anrufliste</h2>
          <p className="mt-1 text-sm text-slate-500">Arbeitsliste für Support und Telefonie. Firmenanfragen können hier strukturiert nach Bearbeitungsstand abgearbeitet werden.</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Erst Status setzen, dann anrufen, anschließend den Eintrag sauber weiterführen. Finanzdaten sind hier bewusst ausgeblendet.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_0.8fr_auto]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input type="text" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Firma, Kontakt, Telefon, Ort oder E-Mail suchen" className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-800 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10" />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full appearance-none rounded-2xl border border-slate-200 bg-white py-3.5 pl-12 pr-4 text-sm font-bold text-slate-700 shadow-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10">
            <option value="ALLE">Alle Status</option>
            {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        <button onClick={() => void fetchApplications()} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
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
            {filteredApplications.map((entry) => (
              <div key={entry.id} className="grid gap-5 px-6 py-6 xl:grid-cols-[1.2fr_1fr_0.8fr]">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-slate-900">{entry.company_name || 'Unbekannte Firma'}</p>
                      <p className="text-sm text-slate-500">{entry.service || 'Keine Kategorie hinterlegt'}</p>
                    </div>
                    <span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusClasses[entry.status] || statusClasses.NEW}`}>{entry.status || 'NEW'}</span>
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
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Kontaktdaten</p>
                    <p className="mt-2 break-all text-sm font-medium text-slate-700">{entry.email || 'Keine E-Mail-Adresse'}</p>
                    <p className="mt-2 text-sm text-slate-500">Quelle: {entry.source_page || 'Unbekannt'}</p>
                    <p className="mt-1 text-sm text-slate-500">Radius: {entry.radius || 'Nicht angegeben'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                    Diese erste Version ist auf schnelles Arbeiten ausgelegt: suchen, anrufen, Status ändern.
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-2xl border border-slate-100 bg-white p-4">
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">Bearbeitungsstatus</label>
                    <select value={entry.status || 'NEW'} onChange={(event) => void updateStatus(entry.id, event.target.value)} disabled={savingId === entry.id} className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/10 disabled:opacity-60">
                      {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>

                  <a href={`tel:${entry.phone || ''}`} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-3.5 text-sm font-bold text-white transition-colors hover:bg-brand-blue-hover">
                    <Phone className="h-4 w-4" />
                    Jetzt anrufen
                  </a>

                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                    <div className="flex items-center gap-2 font-bold">
                      <BadgeCheck className="h-4 w-4" />
                      Mitarbeiter-sicher
                    </div>
                    <p className="mt-2 text-xs leading-relaxed">Diese Ansicht blendet keine Finanzdaten aus anderen Admin-Bereichen ein und eignet sich damit für operative Telefonarbeit.</p>
                  </div>
                </div>
              </div>
            ))}

            {filteredApplications.length === 0 && <div className="px-6 py-14 text-center text-sm italic text-slate-400">Keine passenden Einträge gefunden.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
