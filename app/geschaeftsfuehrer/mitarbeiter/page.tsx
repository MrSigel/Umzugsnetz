/**
 * Mitarbeiter-Management Seite
 * Echte Daten aus Supabase team-Tabelle, helles Design
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Plus, CheckCircle, Clock, Mail, X } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface TeamMember {
  id: string;
  email: string;
  role: string;
  status: string;
  invitedBy: string;
  invitedAt: string | null;
  onboardingSeen: boolean;
  createdAt: string;
}

export default function EmployeePage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Mitarbeiter');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const fetchTeam = async () => {
    try {
      const res = await fetch('/api/geschaeftsfuehrer/mitarbeiter/list');
      const json = await res.json();
      setTeam(json.data || []);
    } catch { /* empty */ } finally { setLoading(false); }
  };

  useEffect(() => { fetchTeam(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError('');
    try {
      const res = await fetch('/api/geschaeftsfuehrer/mitarbeiter/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteEmail('');
        setShowInviteModal(false);
        fetchTeam();
      } else {
        setInviteError(json.error || 'Fehler beim Einladen');
      }
    } catch {
      setInviteError('Verbindungsfehler');
    } finally { setIsInviting(false); }
  };

  const filtered = team.filter((t) => {
    const matchSearch = t.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; icon: any; label: string }> = {
      ACTIVE: { bg: 'bg-emerald-50', text: 'text-brand-green', icon: CheckCircle, label: 'Aktiv' },
      PENDING: { bg: 'bg-brand-blue-soft', text: 'text-brand-blue', icon: Mail, label: 'Eingeladen' },
      DISABLED: { bg: 'bg-slate-100', text: 'text-slate-500', icon: Clock, label: 'Deaktiviert' },
    };
    const c = map[status] || map.DISABLED;
    const Icon = c.icon;
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3" />
        {c.label}
      </div>
    );
  };

  const getRoleLabel = (role: string): string => {
    const map: Record<string, string> = { ADMIN: 'Administrator', EMPLOYEE: 'Mitarbeiter', Mitarbeiter: 'Mitarbeiter' };
    return map[role] || role;
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
          <h1 className="text-2xl font-black text-slate-800">Mitarbeiterverwaltung</h1>
          <p className="text-slate-500 text-sm mt-1">{filtered.length} Mitarbeiter</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-bold transition shadow-md shadow-brand-blue/20"
        >
          <Plus className="w-4 h-4" />
          Mitarbeiter einladen
        </button>
      </motion.div>

      <motion.div variants={itemVariants} className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Nach E-Mail suchen..."
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
          <option value="PENDING">Eingeladen</option>
          <option value="DISABLED">Deaktiviert</option>
        </select>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-white rounded-2xl border border-brand-blue/8 overflow-hidden shadow-[0_2px_12px_rgba(2,118,200,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-blue/8 bg-[#f8fbff]">
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">E-Mail</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Rolle</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-5 py-3.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500">Erstellt am</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((t) => (
                <tr key={t.id} className="border-b border-brand-blue/5 hover:bg-brand-blue-soft/30 transition">
                  <td className="px-5 py-3.5 text-sm font-semibold text-slate-800">{t.email}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-600">{getRoleLabel(t.role)}</td>
                  <td className="px-5 py-3.5">{getStatusBadge(t.status)}</td>
                  <td className="px-5 py-3.5 text-sm text-slate-400">{new Date(t.createdAt).toLocaleDateString('de-DE')}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-400 text-sm">Keine Mitarbeiter gefunden</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Invite Modal */}
      {showInviteModal && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setShowInviteModal(false)}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl border border-brand-blue/10 p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-black text-slate-800">Mitarbeiter einladen</h2>
              <button onClick={() => setShowInviteModal(false)} className="p-1 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">E-Mail</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="mitarbeiter@umzugsnetz.de"
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">Rolle</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white border border-brand-blue/12 text-sm text-slate-700 focus:outline-none focus:border-brand-blue"
                >
                  <option value="Mitarbeiter">Mitarbeiter</option>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>
              {inviteError && <p className="text-sm text-red-500">{inviteError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setShowInviteModal(false)} className="px-4 py-2 rounded-xl border border-brand-blue/12 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">Abbrechen</button>
                <button type="submit" disabled={isInviting} className="px-5 py-2 rounded-xl bg-brand-blue hover:bg-brand-blue-hover text-white text-sm font-bold transition disabled:opacity-50">
                  {isInviting ? 'Wird gesendet...' : 'Einladen'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
