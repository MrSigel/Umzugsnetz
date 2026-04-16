'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { 
  Search, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight,
  Truck,
  RefreshCw,
  MoreVertical,
  Inbox
} from 'lucide-react';

export default function TransactionsPage() {
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('Alle');

  useEffect(() => {
    fetchTransactions();
  }, []);

  async function fetchTransactions() {
    setLoading(true);
    try {
      // wallet_transactions mit Partner-Join über user_id → partners
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*, partners!wallet_transactions_partner_id_fkey(name)')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err: any) {
      // Fallback: ohne Join
      try {
        const { data, error: e2 } = await supabase
          .from('wallet_transactions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(200);
        if (e2) throw e2;
        setTransactions(data || []);
      } catch (err2: any) {
        showToast('error', 'Fehler beim Laden', err2.message);
      }
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (transactions.length === 0) {
      showToast('warning', 'Keine Daten', 'Es gibt keine Transaktionen zum Exportieren.');
      return;
    }
    const headers = ['Datum', 'Uhrzeit', 'Partner', 'Typ', 'Beschreibung', 'Betrag'];
    const rows = transactions.map(t => [
      new Date(t.created_at).toLocaleDateString('de-DE'),
      new Date(t.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
      t.partners?.name || t.partner_id || '—',
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

  const typeOptions = useMemo(() => {
    const types = new Set(transactions.map(t => t.type).filter(Boolean));
    return ['Alle', ...Array.from(types)];
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = !searchTerm ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.partners?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'Alle' || t.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchTerm, typeFilter]);

  const totalVolume = filtered.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
  const totalCredit = filtered.filter(t => Number(t.amount) > 0).reduce((acc, t) => acc + Number(t.amount), 0);
  const totalDebit = filtered.filter(t => Number(t.amount) < 0).reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Finanzen & Transaktionen</h2>
          <p className="text-sm text-slate-500 mt-1">Lückenloser Nachweis aller finanziellen Vorgänge auf der Plattform.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTransactions} disabled={loading}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={exportCSV}
            className="bg-white border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm text-sm group">
            <Download className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            CSV Exportieren
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gesamtvolumen</p>
          <p className="text-2xl font-black text-slate-800">€{totalVolume.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Gutschriften</p>
          <p className="text-2xl font-black text-emerald-500">+€{totalCredit.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Abbuchungen</p>
          <p className="text-2xl font-black text-red-500">-€{totalDebit.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Transaktionen suchen..." value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0075c9]/10 transition-all text-black" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-600 focus:outline-none min-w-[160px] cursor-pointer">
          {typeOptions.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-[#0075c9]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="w-12 h-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-medium">Keine Transaktionen gefunden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto p-8">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Datum & Zeit</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Partner</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Typ</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Beschreibung</th>
                  <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-right">Betrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((trx) => {
                  const isCredit = Number(trx.amount) > 0;
                  return (
                    <tr key={trx.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-5">
                        <p className="text-sm font-bold text-slate-800">{new Date(trx.created_at).toLocaleDateString('de-DE')}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{new Date(trx.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                      </td>
                      <td className="py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-[#0075c9] flex-shrink-0">
                            <Truck className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-bold text-slate-700">{trx.partners?.name || '—'}</p>
                        </div>
                      </td>
                      <td className="py-5 text-center">
                        <span className={`px-3 py-1.5 text-[9px] font-bold rounded-lg uppercase tracking-wider ${
                          trx.type === 'ADMIN_CREDIT' ? 'bg-emerald-100 text-emerald-700' :
                          trx.type === 'LEAD_PURCHASE' ? 'bg-blue-100 text-blue-700' :
                          trx.type === 'TOPUP' ? 'bg-purple-100 text-purple-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {trx.type}
                        </span>
                      </td>
                      <td className="py-5">
                        <p className="text-sm text-slate-500 font-medium">{trx.description || '—'}</p>
                      </td>
                      <td className="py-5 text-right">
                        <div className={`flex items-center justify-end gap-1.5 font-bold ${isCredit ? 'text-emerald-600' : 'text-red-500'}`}>
                          {isCredit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <span className="text-base">€{Math.abs(Number(trx.amount)).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-8 border-t border-slate-50 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {filtered.length} von {transactions.length} Transaktionen
          </p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Live-Daten aus Supabase</p>
          </div>
        </div>
      </div>
    </div>
  );
}
