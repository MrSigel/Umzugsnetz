'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus,
  Mail,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  X,
  Calendar,
  Send,
} from 'lucide-react';

type TeamMember = {
  id: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status?: 'PENDING' | 'ACTIVE' | 'DISABLED';
  invited_by_email?: string | null;
  invitation_sent_at?: string | null;
  created_at: string;
};

export default function TeamPage() {
  const { showToast } = useToast();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');
  const [confirmAdminGrant, setConfirmAdminGrant] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    void fetchTeam();
  }, []);

  async function fetchTeam() {
    setLoading(true);
    const { data, error } = await supabase
      .from('team')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast('error', 'Fehler beim Laden', error.message);
    } else {
      setTeam((data || []) as TeamMember[]);
    }
    setLoading(false);
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    if (newRole === 'ADMIN' && !confirmAdminGrant) return;

    setSendingInvite(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) {
        throw new Error('Ihre Sitzung ist abgelaufen. Bitte erneut anmelden.');
      }

      const response = await fetch('/api/team/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: newEmail,
          role: newRole,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Einladung konnte nicht versendet werden.');
      }

      showToast('success', 'Einladung versendet', `${newEmail} wurde erfolgreich eingeladen.`);
      setIsModalOpen(false);
      setNewEmail('');
      setNewRole('EMPLOYEE');
      setConfirmAdminGrant(false);
      void fetchTeam();
    } catch (error: any) {
      showToast('error', 'Fehler', error.message || 'Einladung konnte nicht versendet werden.');
    } finally {
      setSendingInvite(false);
    }
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('team').delete().eq('id', id);
    if (error) {
      showToast('error', 'Fehler beim Entfernen', error.message);
    } else {
      showToast('success', 'Mitglied entfernt');
      void fetchTeam();
    }
  };

  const statusLabel = (member: TeamMember) => {
    if (member.status === 'ACTIVE') return 'Aktiv';
    if (member.status === 'DISABLED') return 'Deaktiviert';
    return 'Einladung offen';
  };

  const statusClass = (member: TeamMember) => {
    if (member.status === 'ACTIVE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (member.status === 'DISABLED') return 'bg-slate-100 text-slate-700 border-slate-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold text-slate-800">
            <ShieldCheck className="h-7 w-7 text-brand-blue" />
            Team-Verwaltung
          </h2>
          <p className="mt-1 text-sm text-slate-500">Mitarbeiter und Administratoren mit echtem Einladungsprozess verwalten.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center gap-2 rounded-xl bg-brand-blue px-6 py-2.5 font-bold text-white shadow-lg shadow-brand-blue/10 transition-all hover:bg-brand-blue-hover"
        >
          <UserPlus className="h-5 w-5 transition-transform group-hover:scale-110" />
          Mitglied einladen
        </button>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="overflow-x-auto p-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="py-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Benutzer</th>
                <th className="py-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Rolle</th>
                <th className="py-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</th>
                <th className="py-5 text-center text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Einladung</th>
                <th className="py-5 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {team.map((member) => (
                <tr key={member.id} className="group transition-colors hover:bg-slate-50/50">
                  <td className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-400">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{member.email}</p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          Eingeladen von {member.invited_by_email || 'System'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 text-center">
                    <span className={`rounded-full px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest ${
                      member.role === 'ADMIN'
                        ? 'border border-amber-100 bg-amber-50 text-amber-600'
                        : 'border border-brand-blue/20 bg-brand-blue-soft text-brand-blue'
                    }`}>
                      {member.role === 'ADMIN' ? 'Administrator' : 'Mitarbeiter'}
                    </span>
                  </td>
                  <td className="py-6 text-center">
                    <span className={`rounded-full border px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest ${statusClass(member)}`}>
                      {statusLabel(member)}
                    </span>
                  </td>
                  <td className="py-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Send className="h-3.5 w-3.5" />
                      <span className="text-sm font-medium">
                        {member.invitation_sent_at ? new Date(member.invitation_sent_at).toLocaleDateString('de-DE') : new Date(member.created_at).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </td>
                  <td className="py-6 text-right">
                    <button
                      type="button"
                      onClick={() => void handleRemove(member.id)}
                      className="ml-auto flex items-center gap-2 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Entfernen
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && team.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                    Noch keine Teammitglieder vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="modal-scrollbar fixed left-1/2 top-1/2 z-[101] max-h-[85dvh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border border-slate-100 bg-white shadow-2xl sm:rounded-[2.5rem]"
            >
              <div className="p-5 sm:p-8">
                <div className="mb-8 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue-soft text-brand-blue">
                      <UserPlus className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Neues Teammitglied</h3>
                      <p className="text-xs text-slate-400">Einladung per E-Mail mit vorbereitetem Onboarding.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-slate-50 hover:text-slate-500">
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={handleAddMember} className="space-y-6">
                  <div>
                    <label className="mb-2 block px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">E-Mail-Adresse</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="mitarbeiter@umzugsnetz.de"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-brand-blue/10"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-3 block px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">Rolle / Berechtigung</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNewRole('EMPLOYEE');
                          setConfirmAdminGrant(false);
                        }}
                        className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                          newRole === 'EMPLOYEE'
                            ? 'border-brand-blue bg-brand-blue-soft text-brand-blue'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <User className="h-6 w-6" />
                        <span className="text-xs font-bold">Mitarbeiter:in</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewRole('ADMIN')}
                        className={`flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all ${
                          newRole === 'ADMIN'
                            ? 'border-amber-500 bg-amber-50 text-amber-600'
                            : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <Shield className="h-6 w-6" />
                        <span className="text-xs font-bold">Administrator:in</span>
                      </button>
                    </div>
                  </div>

                  {newRole === 'ADMIN' && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                      <p className="font-bold">Admin-Rolle nur nach Bestätigung vergeben</p>
                      <p className="mt-1">Bitte prüfen Sie die E-Mail-Adresse sorgfältig: <span className="font-bold">{newEmail || 'keine E-Mail eingetragen'}</span></p>
                      <label className="mt-3 flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={confirmAdminGrant}
                          onChange={(e) => setConfirmAdminGrant(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>Ich bestätige, dass diese Person bewusst Admin-Rechte erhalten soll.</span>
                      </label>
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-600">
                    Nach dem Versand erscheint der neue Eintrag zunächst als <span className="font-bold">Einladung offen</span>. Beim ersten erfolgreichen Einstieg kann das Teammitglied den Arbeitsbereich direkt ohne aufwendige Einarbeitung nutzen.
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 rounded-2xl bg-slate-50 px-6 py-4 font-bold text-slate-600 transition-all hover:bg-slate-100"
                    >
                      Abbrechen
                    </button>
                    <button
                      type="submit"
                      disabled={(newRole === 'ADMIN' && !confirmAdminGrant) || sendingInvite}
                      className="flex-1 rounded-2xl bg-brand-blue px-6 py-4 font-bold text-white shadow-lg shadow-brand-blue/20 transition-all hover:bg-brand-blue-hover disabled:opacity-50"
                    >
                      {sendingInvite ? 'Einladung wird versendet...' : 'Einladung versenden'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
