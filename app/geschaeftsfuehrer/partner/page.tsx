/**
 * Partner-Management Seite
 * Echte Daten aus Supabase, helles Design
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, MoreVertical, X } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface PartnerRow {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  location: string;
  service: string;
  status: string;
  category: string;
  balance: number;
  bonusTokens: number;
  leadsPurchased: number;
  totalSpent: number;
  createdAt: string;
}

export default function PartnerPage() {
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPartner, setSelectedPartner] = useState<PartnerRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/geschaeftsfuehrer/partner/list');
        const json = await res.json();
        setPartners(json.data || []);
      } catch { /* empty */ } finally { setLoading(false); }
    })();
  }, []);

  const filtered = partners.filter((p) => {
    const matchSearch =
      p.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      ACTIVE: { bg: 'bg-emerald-50', text: 'text-brand-green', label: 'Aktiv' },
      PENDING: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Ausstehend' },
      SUSPENDED: { bg: 'bg-red-50', text: 'text-red-500', label: 'Gesperrt' },
    };
    const c = map[status] || { bg: 'bg-slate-100', text: 'text-slate-500', label: status };
    return <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${c.bg} ${c.text}`}>{c.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-3 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Partnerverwaltung</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} Partner gefunden</p>
        </div>
      </motion.div>

      {/* Search & Filter */}
      <motion.div variants={itemVariants} className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-700 focus:outline-none focus:border-brand-blue"
        >
          <option value="all">Alle Status</option>
          <option value="ACTIVE">Aktiv</option>
          <option value="PENDING">Ausstehend</option>
          <option value="SUSPENDED">Gesperrt</option>
        </select>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-brand-blue/8 overflow-hidden shadow-[0_2px_12px_rgba(2,118,200,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-blue/8 bg-[#f8fbff]">
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Unternehmen</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Kontakt</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Guthaben</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Leads</th>
                <th className="px-5 py-3.5 text-center text-[11px] font-bold uppercase tracking-wider text-slate-500">Detail</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((p) => (
                <tr key={p.id} className="border-b border-brand-blue/5 hover:bg-brand-blue-soft/30 transition">
                  <td className="px-5 py-3.5">
                    <p className="text-sm font-semibold text-slate-800">{p.companyName}</p>
                    <p className="text-xs text-slate-400">{p.location || '–'}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-sm text-slate-700">{p.email}</p>
                    <p className="text-xs text-slate-400">{p.phone || '–'}</p>
                  </td>
                  <td className="px-5 py-3.5">{getStatusBadge(p.status)}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-slate-700">
                    €{p.balance.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{p.leadsPurchased} gekauft</td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => setSelectedPartner(p)}
                      className="p-2 rounded-lg hover:bg-brand-blue-soft text-slate-400 hover:text-brand-blue transition"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-400 text-sm">Keine Partner gefunden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Detail Modal */}
      {selectedPartner && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setSelectedPartner(null)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-brand-blue/10 p-7 max-w-lg w-full shadow-2xl">
            <div className="flex items-start justify-between mb-5">
              <h2 className="text-xl font-black text-slate-800">{selectedPartner.companyName}</h2>
              <button onClick={() => setSelectedPartner(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-slate-400 text-xs mb-0.5">E-Mail</p><p className="font-semibold text-slate-800">{selectedPartner.email}</p></div>
              <div><p className="text-slate-400 text-xs mb-0.5">Telefon</p><p className="font-semibold text-slate-800">{selectedPartner.phone || '–'}</p></div>
              <div><p className="text-slate-400 text-xs mb-0.5">Region</p><p className="font-semibold text-slate-800">{selectedPartner.location || '–'}</p></div>
              <div><p className="text-slate-400 text-xs mb-0.5">Status</p>{getStatusBadge(selectedPartner.status)}</div>
              <div><p className="text-slate-400 text-xs mb-0.5">Guthaben</p><p className="font-semibold text-slate-800">€{selectedPartner.balance.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p></div>
              <div><p className="text-slate-400 text-xs mb-0.5">Gekaufte Leads</p><p className="font-semibold text-slate-800">{selectedPartner.leadsPurchased}</p></div>
              <div><p className="text-slate-400 text-xs mb-0.5">Kategorie</p><p className="font-semibold text-slate-800">{selectedPartner.category}</p></div>
              <div><p className="text-slate-400 text-xs mb-0.5">Service</p><p className="font-semibold text-slate-800">{selectedPartner.service}</p></div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setSelectedPartner(null)} className="px-4 py-2 rounded-xl border border-brand-blue/12 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Schließen</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
