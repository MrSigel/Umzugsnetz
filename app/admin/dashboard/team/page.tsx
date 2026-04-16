'use client';

import React, { useState, useEffect } from 'react';
import { useToast } from '@/components/ToastProvider';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Trash2, 
  Shield, 
  ShieldCheck, 
  User, 
  X, 
  Calendar,
  CheckCircle2,
  Lock
} from 'lucide-react';

interface TeamMember {
  id: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  addedAt: string;
  avatar?: string;
}

// initialTeam removed, now fetching from Supabase

export default function TeamPage() {
  const { showToast } = useToast();
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'ADMIN' | 'EMPLOYEE'>('EMPLOYEE');

  useEffect(() => {
    fetchTeam();
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
      setTeam(data || []);
    }
    setLoading(false);
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    
    const { error } = await supabase.from('team').insert([{
      email: newEmail,
      role: newRole
    }]);

    if (error) {
      showToast('error', 'Fehler', error.message);
      return;
    }
    showToast('success', 'Mitglied hinzugefügt', `${newEmail} wurde dem Team hinzugefügt.`);
    setIsModalOpen(false);
    setNewEmail('');
    fetchTeam();
  };

  const handleRemove = async (id: string) => {
    const { error } = await supabase.from('team').delete().eq('id', id);
    if (error) {
      showToast('error', 'Fehler beim Entfernen', error.message);
    } else {
      showToast('success', 'Mitglied entfernt');
      fetchTeam();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
             <ShieldCheck className="w-7 h-7 text-brand-blue" />
             Team-Verwaltung
          </h2>
          <p className="text-sm text-slate-500 mt-1">Verwalten Sie interne Mitarbeiter und Administratoren.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-brand-blue text-white px-6 py-2.5 rounded-xl font-bold hover:bg-brand-blue-hover transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/10 group"
        >
          <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Mitglied hinzufügen
        </button>
      </div>

      {/* Team Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto p-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-sans">Benutzer</th>
                <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-sans text-center">Rolle</th>
                <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-sans text-center">Hinzugefügt am</th>
                <th className="py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] font-sans text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {team.map((member) => (
                <tr key={member.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">{member.email}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID: {member.id}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-6 text-center">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                      member.role === 'ADMIN' 
                        ? 'bg-amber-50 text-amber-600 border border-amber-100' 
                        : 'bg-brand-blue-soft text-brand-blue border border-brand-blue/20'
                    }`}>
                      {member.role === 'ADMIN' ? 'Administrator' : 'Mitarbeiter'}
                    </span>
                  </td>
                  <td className="py-6 text-center">
                    <div className="flex items-center justify-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-sm font-medium">{new Date(member.created_at).toLocaleDateString('de-DE')}</span>
                    </div>
                  </td>
                  <td className="py-6 text-right">
                    <button 
                      onClick={() => handleRemove(member.id)}
                      className="px-4 py-2 text-[10px] font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-2 ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Entfernen
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100vw-2rem)] sm:w-full max-w-md bg-white rounded-3xl sm:rounded-[2.5rem] shadow-2xl z-[101] overflow-hidden border border-slate-100 max-h-[85dvh] overflow-y-auto modal-scrollbar"
            >
              <div className="p-5 sm:p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-blue-soft flex items-center justify-center text-brand-blue">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Neues Teammitglied</h3>
                      <p className="text-xs text-slate-400">Berechtigungen für den Admin-Bereich.</p>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300 hover:text-slate-500 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAddMember} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">E-Mail Adresse</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                      <input 
                        type="email" 
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="mitarbeiter@umzugsnetz.de"
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/10 transition-all font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Rolle / Berechtigung</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setNewRole('EMPLOYEE')}
                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 items-center ${
                          newRole === 'EMPLOYEE' 
                            ? 'bg-brand-blue-soft border-brand-blue text-brand-blue' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <User className="w-6 h-6" />
                        <span className="text-xs font-bold">Mitarbeiter:in</span>
                      </button>
                      <button 
                        type="button"
                        onClick={() => setNewRole('ADMIN')}
                        className={`p-4 rounded-2xl border transition-all flex flex-col gap-2 items-center ${
                          newRole === 'ADMIN' 
                            ? 'bg-amber-50 border-amber-500 text-amber-600' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                        }`}
                      >
                        <Shield className="w-6 h-6" />
                        <span className="text-xs font-bold">Administrator:in</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-4 bg-slate-50 text-slate-600 rounded-2xl font-bold hover:bg-slate-100 transition-all"
                    >
                      Abbrechen
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-4 bg-brand-blue text-white rounded-2xl font-bold hover:bg-brand-blue-hover shadow-lg shadow-brand-blue/20 transition-all"
                    >
                      Speichern
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
