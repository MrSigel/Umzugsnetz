'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminInviteAcceptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email || null);
      setLoading(false);
    };

    void loadUser();
  }, []);

  const handleSetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 8) {
      setError('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Die Passwörter stimmen nicht überein.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      if (email) {
        await supabase
          .from('team')
          .update({
            status: 'ACTIVE',
            onboarding_seen_at: new Date().toISOString(),
          })
          .ilike('email', email);
      }

      await supabase.auth.signOut();
      setMessage('Passwort gespeichert. Sie können sich jetzt mit E-Mail und Passwort anmelden.');
      setTimeout(() => router.push('/login'), 1200);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Das Passwort konnte nicht gespeichert werden.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
      </main>
    );
  }

  if (!email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-[2rem] border border-slate-100 bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-xl">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Einladung nicht aktiv</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Der Einladungslink ist abgelaufen oder wurde bereits verwendet. Bitte fordern Sie eine neue Einladung an.
          </p>
          <Link href="/login" className="mt-8 inline-flex rounded-2xl bg-brand-blue px-6 py-3 text-sm font-black text-white">
            Zum Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-xl">
            <ShieldCheck className="h-10 w-10" />
          </div>
          <h1 className="text-3xl font-black text-slate-900">Mitarbeiter-Einladung</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Legen Sie jetzt ein Passwort für <span className="font-bold text-slate-700">{email}</span> fest.
          </p>
        </div>

        <form onSubmit={handleSetPassword} className="space-y-5 rounded-[2rem] border border-slate-100 bg-white p-8 shadow-2xl">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Neues Passwort</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                placeholder="Mindestens 8 Zeichen"
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Passwort bestätigen</span>
            <span className="relative block">
              <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                placeholder="Passwort wiederholen"
              />
            </span>
          </label>

          {error ? <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
          {message ? <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-blue px-5 py-4 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
          >
            {submitting ? 'Wird gespeichert...' : 'Passwort speichern'}
            <ArrowRight className="h-5 w-5" />
          </button>
        </form>
      </div>
    </main>
  );
}
