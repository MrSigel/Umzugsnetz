'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Check, Eye, EyeOff, Globe2, Lock, Mail, Phone, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
};

type RegisterForm = {
  companyName: string;
  website: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

type FieldErrors = Partial<Record<keyof LoginForm | keyof RegisterForm | 'login' | 'register', string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^[+]?[\d\s()/.-]{7,20}$/;

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isValidUrl(value: string) {
  try {
    const url = new URL(normalizeWebsite(value));
    return Boolean(url.hostname.includes('.'));
  } catch {
    return false;
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-xs font-semibold text-red-600">{message}</p>;
}

function TextInput({
  label,
  icon: Icon,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
        <input
          {...props}
          className={`w-full rounded-2xl border-2 bg-white px-12 py-4 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-300 hover:border-slate-300 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 ${
            error ? 'border-red-300' : 'border-slate-200'
          }`}
        />
      </span>
      <FieldError message={error} />
    </label>
  );
}

function PasswordInput({
  label,
  error,
  value,
  onChange,
}: {
  label: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <span className="relative block">
        <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-2xl border-2 bg-white py-4 pl-12 pr-12 text-sm font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-300 hover:border-slate-300 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 ${
            error ? 'border-red-300' : 'border-slate-200'
          }`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700"
          aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
      <FieldError message={error} />
    </label>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [legalModal, setLegalModal] = useState<null | 'agb' | 'datenschutz'>(null);
  const [loginForm, setLoginForm] = useState<LoginForm>({ email: '', password: '', remember: true });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    companyName: '',
    website: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loginLoading, setLoginLoading] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const validateLogin = () => {
    const nextErrors: FieldErrors = {};
    if (!emailPattern.test(loginForm.email.trim())) nextErrors.email = 'Gültige E-Mail eingeben.';
    if (!loginForm.password) nextErrors.password = 'Passwort eingeben.';
    return nextErrors;
  };

  const validateRegister = () => {
    const nextErrors: FieldErrors = {};
    if (!registerForm.companyName.trim()) nextErrors.companyName = 'Firmenname eingeben.';
    if (!isValidUrl(registerForm.website)) nextErrors.website = 'Gültige Website eingeben.';
    if (!phonePattern.test(registerForm.phone.trim())) nextErrors.phone = 'Gültige Telefonnummer eingeben.';
    if (!emailPattern.test(registerForm.email.trim())) nextErrors.email = 'Gültige E-Mail eingeben.';
    if (registerForm.password.length < 8) nextErrors.password = 'Mindestens 8 Zeichen.';
    if (registerForm.password !== registerForm.confirmPassword) nextErrors.confirmPassword = 'Passwörter stimmen nicht überein.';
    if (!registerForm.acceptedTerms) nextErrors.acceptedTerms = 'Pflichtfeld.';
    return nextErrors;
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateLogin();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password,
      });

      if (error) throw error;
      router.push('/');
    } catch (error) {
      setErrors({ login: error instanceof Error ? error.message : 'Login fehlgeschlagen.' });
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateRegister();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setRegisterLoading(true);
    try {
      const response = await fetch('/api/partners/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: registerForm.companyName.trim(),
          website: normalizeWebsite(registerForm.website),
          phone: registerForm.phone.trim(),
          email: registerForm.email.trim().toLowerCase(),
          password: registerForm.password,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Registrierung fehlgeschlagen.');
      setRegisterSuccess(true);
    } catch (error) {
      setErrors({ register: error instanceof Error ? error.message : 'Registrierung fehlgeschlagen.' });
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(1,103,176,0.12),transparent_32%),linear-gradient(135deg,#f8fafc,#eef4f8)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      {legalModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-black text-slate-950">
                {legalModal === 'agb' ? 'AGB' : 'Datenschutz'}
              </h2>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm leading-relaxed text-slate-600">
              <p>
                {legalModal === 'agb'
                  ? 'Es gelten die Allgemeinen Geschäftsbedingungen von Umzugsnetz.'
                  : 'Es gelten die Datenschutzbestimmungen von Umzugsnetz.'}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-7xl items-center">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/70 bg-white/92 shadow-[0_30px_100px_rgba(15,23,42,0.16)] backdrop-blur-xl lg:h-[860px] lg:grid-cols-[40fr_2px_60fr]">
          <div className="p-6 sm:p-10 lg:overflow-y-auto lg:p-12">
            <div className="mb-10 flex justify-center">
              <Image src="/logo_transparent.png" alt="Umzugsnetz" width={176} height={44} className="h-11 w-auto" priority />
            </div>

            <div className="mx-auto max-w-md">
              <div className="mb-8 grid grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {[
                  { id: 'login', label: 'Anmelden' },
                  { id: 'register', label: 'Registrieren' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id as 'login' | 'register');
                      setErrors({});
                    }}
                    className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${
                      activeTab === tab.id ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeTab === 'login' ? (
                <form onSubmit={handleLogin}>
                  <div className="space-y-5">
                    <TextInput
                      label="E-Mail"
                      icon={Mail}
                      type="email"
                      value={loginForm.email}
                      error={errors.email}
                      onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                    />
                    <PasswordInput
                      label="Passwort"
                      value={loginForm.password}
                      error={errors.password}
                      onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))}
                    />

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setLoginForm((current) => ({ ...current, remember: !current.remember }))}
                        className="flex min-w-0 items-center gap-3"
                        aria-pressed={loginForm.remember}
                      >
                        <span className={`relative inline-flex h-7 w-12 flex-shrink-0 rounded-full transition-colors ${loginForm.remember ? 'bg-brand-blue' : 'bg-slate-200'}`}>
                          <span className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform ${loginForm.remember ? 'translate-x-5' : 'translate-x-0'}`} />
                        </span>
                        <span className="text-sm font-bold text-slate-600">Angemeldet bleiben</span>
                      </button>
                      <a href="/passwort-zuruecksetzen" className="text-sm font-bold text-brand-blue transition-colors hover:text-brand-blue-hover">
                        Passwort vergessen?
                      </a>
                    </div>

                    <FieldError message={errors.login} />

                    <button
                      type="submit"
                      disabled={loginLoading}
                      className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-base font-black text-white shadow-xl shadow-slate-950/15 transition-all hover:-translate-y-0.5 hover:bg-slate-800 disabled:opacity-60"
                    >
                      {loginLoading ? 'Bitte warten...' : 'Einloggen'}
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegister}>
                  <div className="space-y-5">
                    <TextInput
                      label="Firmenname"
                      icon={Building2}
                      value={registerForm.companyName}
                      error={errors.companyName}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, companyName: event.target.value }))}
                    />
                    <TextInput
                      label="Firmen-Website"
                      icon={Globe2}
                      inputMode="url"
                      value={registerForm.website}
                      error={errors.website}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, website: event.target.value }))}
                    />
                    <TextInput
                      label="Telefonnummer"
                      icon={Phone}
                      inputMode="tel"
                      value={registerForm.phone}
                      error={errors.phone}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                    <TextInput
                      label="E-Mail"
                      icon={Mail}
                      type="email"
                      value={registerForm.email}
                      error={errors.email}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                    />
                    <PasswordInput
                      label="Passwort"
                      value={registerForm.password}
                      error={errors.password}
                      onChange={(value) => setRegisterForm((current) => ({ ...current, password: value }))}
                    />
                    <PasswordInput
                      label="Passwort wiederholen"
                      value={registerForm.confirmPassword}
                      error={errors.confirmPassword}
                      onChange={(value) => setRegisterForm((current) => ({ ...current, confirmPassword: value }))}
                    />
                  </div>

                  <label className="mt-6 flex cursor-pointer items-center gap-3">
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
                        registerForm.acceptedTerms ? 'border-brand-green bg-brand-green text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {registerForm.acceptedTerms ? <Check className="h-3.5 w-3.5" /> : null}
                    </span>
                    <input
                      type="checkbox"
                      checked={registerForm.acceptedTerms}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, acceptedTerms: event.target.checked }))}
                      className="sr-only"
                    />
                    <span className="whitespace-nowrap text-[11px] font-semibold tracking-tight text-slate-600 sm:text-sm sm:tracking-normal">
                      Ich akzeptiere die{' '}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setLegalModal('agb');
                        }}
                        className="font-black text-brand-blue hover:underline"
                      >
                        AGB
                      </button>{' '}
                      und{' '}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setLegalModal('datenschutz');
                        }}
                        className="font-black text-brand-blue hover:underline"
                      >
                        Datenschutzbestimmungen
                      </button>
                      .
                    </span>
                  </label>
                  <FieldError message={errors.acceptedTerms} />
                  <FieldError message={errors.register} />

                  {registerSuccess ? (
                    <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-700">
                      Konto erstellt.
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="group mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-blue px-6 py-4 text-base font-black text-white shadow-xl shadow-brand-blue/20 transition-all hover:-translate-y-0.5 hover:bg-brand-blue-hover disabled:opacity-60"
                  >
                    {registerLoading ? 'Bitte warten...' : 'Konto erstellen'}
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="hidden bg-gradient-to-b from-brand-blue via-slate-900 to-brand-green lg:block" />

          <div className="relative hidden overflow-hidden border-t border-slate-200 lg:block lg:border-t-0">
            <Image
              src="/login.png"
              alt=""
              fill
              sizes="60vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-slate-950/10" />
          </div>
        </section>
      </div>
    </main>
  );
}
