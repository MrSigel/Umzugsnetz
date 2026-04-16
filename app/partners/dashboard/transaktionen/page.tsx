'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw, 
  Plus, 
  Search,
  Filter,
  Download,
  Inbox
} from 'lucide-react';
import Link from 'next/link';

export default function TransactionsPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Alle');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    fetchData();
    return () => clearInterval(timer);
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Nicht angemeldet.');

      const [{ data: p, error: pError }, { data: t, error: tError }] = await Promise.all([
        supabase.from('partners').select('*').eq('user_id', user.id).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);

      if (pError) throw pError;
      if (tError) throw tError;
      setPartner(p);
      setTransactions(t || []);
    } catch (err: any) {
      showToast('error', 'Fehler beim Laden', err.message);
    } finally {
      setLoading(false);
    }
  }

  const totalDeposited = useMemo(() => transactions.filter(t => Number(t.amount) > 0).reduce((a, t) => a + Number(t.amount), 0), [transactions]);
  const totalSpent = useMemo(() => transactions.filter(t => Number(t.amount) < 0).reduce((a, t) => a + Math.abs(Number(t.amount)), 0), [transactions]);

  const typeOptions = useMemo(() => {
    const types = new Set(transactions.map(t => t.type).filter(Boolean));
    return ['Alle', ...Array.from(types)];
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = !searchTerm ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'Alle' || t.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, typeFilter]);

  function exportCSV() {
    if (transactions.length === 0) {
      showToast('warning', 'Keine Daten', 'Es gibt keine Transaktionen zum Exportieren.');
      return;
    }
    const headers = ['Datum', 'Uhrzeit', 'Typ', 'Beschreibung', 'Betrag'];
    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleDateString('de-DE'),
      new Date(t.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      t.type || '—',
      t.description || '—',
      Number(t.amount).toFixed(2)
    ]);
    const csv = [headers, ...rows].map(r => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaktionen_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'CSV exportiert', `${transactions.length} Transaktionen exportiert.`);
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-[#0075c9] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-2">Transaktionen</h1>
          <p className="text-slate-400 font-medium text-sm">Vollständiger Kontoauszug & Zahlungsverlauf</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live • {currentTime.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Aktuelles Guthaben', value: Number(partner?.balance || 0), icon: Wallet, color: 'blue' },
          { label: 'Gesamt Eingezahlt', value: totalDeposited, icon: ArrowDownLeft, color: 'emerald' },
          { label: 'Gesamt Ausgegeben', value: totalSpent, icon: ArrowUpRight, color: 'slate' }
        ].map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
              <h3 className="text-2xl font-black text-slate-800 tabular-nums">
                €{card.value.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${
              card.color === 'blue' ? 'bg-blue-50 text-blue-500 group-hover:bg-blue-500 group-hover:text-white' :
              card.color === 'emerald' ? 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white' :
              'bg-slate-50 text-slate-500 group-hover:bg-slate-800 group-hover:text-white'
            }`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        {/* Toolbar */}
        <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-800">Alle Transaktionen ({filtered.length})</h3>
          <div className="flex items-center gap-3">
            <button onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-500 hover:bg-slate-50">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <Link href="/partners/dashboard/finanzen">
              <button className="flex items-center gap-2 px-6 py-3 bg-[#0075c9] text-white rounded-xl text-xs font-bold hover:bg-[#005ea6] transition-all shadow-lg shadow-blue-500/10 active:scale-95">
                <Plus className="w-4 h-4" />
                Guthaben aufladen
              </button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Transaktionen durchsuchen..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-[#0075c9] transition-all text-black" />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 focus:outline-none cursor-pointer">
            {typeOptions.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50 bg-slate-50/30">
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Datum</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Typ</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Beschreibung</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Betrag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map((t) => {
                    const isCredit = Number(t.amount) > 0;
                    const typeLabel = t.type === 'TOPUP' ? 'Aufladung' :
                      t.type === 'LEAD_PURCHASE' ? 'Lead-Kauf' :
                      t.type === 'ADMIN_CREDIT' ? 'Admin-Gutschrift' :
                      t.type === 'DEBIT' ? 'Abbuchung' : (t.type || '—');
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-sm font-bold text-slate-800">{new Date(t.created_at).toLocaleDateString('de-DE')}</p>
                          <p className="text-[10px] text-slate-400">{new Date(t.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1.5 text-[9px] font-bold rounded-lg uppercase tracking-wider ${
                            isCredit ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                          }`}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-8 py-5">
                          <p className="text-sm text-slate-500 font-medium">{t.description || 'Systembuchung'}</p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className={`flex items-center justify-end gap-1.5 font-black ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                            {isCredit ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                            <span>{isCredit ? '+' : '-'}€{Math.abs(Number(t.amount)).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center flex-1">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-8 border border-slate-100">
                <Inbox className="w-10 h-10" strokeWidth={1.5} />
              </div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">
                {searchTerm || typeFilter !== 'Alle' ? 'Keine Ergebnisse gefunden' : 'Keine Transaktionen'}
              </h4>
              <p className="text-slate-400 text-sm max-w-sm leading-relaxed font-medium">
                {searchTerm || typeFilter !== 'Alle'
                  ? 'Passen Sie Ihre Suchkriterien an.'
                  : 'Transaktionen erscheinen hier, sobald Sie Guthaben aufladen oder Kundenaufträge kaufen.'}
              </p>
              {!searchTerm && typeFilter === 'Alle' && (
                <div className="mt-8 flex gap-3">
                  <Link href="/partners/dashboard/finanzen">
                    <button className="px-6 py-2.5 bg-[#0075c9] text-white rounded-xl text-xs font-bold hover:bg-[#005ea6] transition-all">
                      Guthaben aufladen
                    </button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
