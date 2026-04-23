'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PartnerInviteAcceptPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      setEmail(user?.email || null);
      setLoading(false);
    };

    void load();
  }, []);

  const handleSetPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 8) {
      showToast('warning', 'Passwort zu kurz', 'Bitte mindestens 8 Zeichen verwenden.');
      return;
    }

    if (password !== confirmPassword) {
      showToast('warning', 'Passwörter stimmen nicht überein', 'Bitte prüfen Sie die Eingabe.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      showToast('success', 'Passwort gesetzt', 'Ihr Zugang wurde aktualisiert.');
      router.push('/partner');
    } catch (err: any) {
      showToast('error', 'Fehler', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 md:p-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white shadow-xl mx-auto ring-4 ring-white mb-6">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-800">Einladung nicht aktiv</h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Der Einladungslink ist abgelaufen oder wurde bereits verwendet. Bitte melden Sie sich an oder lassen Sie sich erneut einladen.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link href="/" className="px-6 py-3 bg-brand-blue text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-brand-blue-hover transition-colors">
              Zur Startseite
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white shadow-xl mx-auto ring-4 ring-white">
              <ShieldCheck className="w-10 h-10" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-slate-800">Partner Einladung</h1>
          <p className="text-slate-500 mt-2 font-medium text-sm">
            Setzen Sie jetzt Ihr Passwort für <span className="font-bold text-slate-700">{email}</span>.
          </p>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 md:p-10">
          <form onSubmit={handleSetPassword} className="space-y-5">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                type="password"
                required
                placeholder="Neues Passwort (min. 8 Zeichen)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-brand-blue transition-all font-medium text-black"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input
                type="password"
                required
                placeholder="Passwort bestätigen"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-brand-blue transition-all font-medium text-black"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand-blue/20 hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {submitting ? 'Wird gespeichert...' : 'Passwort setzen'} <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
