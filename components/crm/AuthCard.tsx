'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Lock, Mail, Phone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

type Mode = 'login' | 'register';

export function AuthCard() {
  const router = useRouter();
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');

  const resolveRoleRedirect = async (token: string) => {
    const response = await fetch('/api/auth/resolve-role', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || 'Rolle konnte nicht ermittelt werden.');
    }

    return data?.redirectTo || '/login';
  };

  const bootstrapPartner = async (token: string) => {
    const response = await fetch('/api/auth/bootstrap-partner', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        companyName,
        phone,
      }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || 'Partnerprofil konnte nicht vorbereitet werden.');
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error || !data.session) {
        throw error || new Error('Anmeldung fehlgeschlagen.');
      }

      const redirectTo = await resolveRoleRedirect(data.session.access_token);
      router.push(redirectTo);
    } catch (err: any) {
      showToast('error', 'Anmeldung fehlgeschlagen', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const redirectTo =
        typeof window === 'undefined' ? undefined : `${window.location.origin}/login`;

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectTo,
          data: {
            role: 'partner',
            company_name: companyName.trim(),
            full_name: companyName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data.session?.access_token) {
        await bootstrapPartner(data.session.access_token).catch(() => undefined);
      }

      showToast(
        'success',
        'Registrierung gestartet',
        'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Danach können Sie sich anmelden.',
      );

      setMode('login');
      setPassword('');
    } catch (err: any) {
      showToast('error', 'Registrierung fehlgeschlagen', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1">
        <button
          type="button"
          onClick={() => setMode('login')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            mode === 'login' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Login
        </button>
        <button
          type="button"
          onClick={() => setMode('register')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
            mode === 'register' ? 'bg-slate-900 text-white' : 'text-slate-600'
          }`}
        >
          Registrierung
        </button>
      </div>

      <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Portal</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">Login & Registrierung</h1>
      <p className="mt-2 text-sm text-slate-600">
        Gemeinsamer Einstieg für interne Zugänge und Partnerzugänge.
      </p>

      <form onSubmit={mode === 'login' ? handleLogin : handleRegister} className="mt-8 space-y-4">
        {mode === 'register' && (
          <>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Firmenname</span>
              <span className="relative block">
                <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3.5 text-slate-900 outline-none focus:border-brand-blue"
                />
              </span>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Telefon</span>
              <span className="relative block">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3.5 text-slate-900 outline-none focus:border-brand-blue"
                />
              </span>
            </label>
          </>
        )}

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">E-Mail</span>
          <span className="relative block">
            <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3.5 text-slate-900 outline-none focus:border-brand-blue"
            />
          </span>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Passwort</span>
          <span className="relative block">
            <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3.5 text-slate-900 outline-none focus:border-brand-blue"
            />
          </span>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue py-4 font-black text-white transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
        >
          {loading ? 'Bitte warten...' : mode === 'login' ? 'Einloggen' : 'Registrieren'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <div className="mt-5 text-center text-sm">
        <Link href="/passwort-zuruecksetzen?bereich=partner" className="font-bold text-brand-blue hover:underline">
          Passwort vergessen
        </Link>
      </div>
    </section>
  );
}
