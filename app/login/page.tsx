'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Check, ChevronDown, Eye, EyeOff, Globe2, Lock, Mail, MapPin, Phone, User2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type LoginForm = {
  email: string;
  password: string;
  remember: boolean;
};

type RegisterForm = {
  companyName: string;
  fullName: string;
  location: string;
  radius: string;
  service: string;
  website: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptedTerms: boolean;
};

type FieldErrors = Partial<Record<keyof LoginForm | keyof RegisterForm | 'login' | 'register', string>>;

const REGISTER_RADIUS_OPTIONS = ['10 km', '25 km', '50 km', '75 km', '100 km', '150 km+'];

const REGISTER_SERVICE_OPTIONS = [
  { value: '', label: 'Bitte Dienstleistung auswählen' },
  { value: 'umzug', label: 'Umzüge' },
  { value: 'entruempelung', label: 'Entrümpelung' },
  { value: 'umzug_entruempelung', label: 'Umzüge und Entrümpelung' },
];

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
  return <p className="mt-1.5 text-xs font-medium text-red-600">{message}</p>;
}

const FIELD_LABEL = 'mb-1.5 block text-xs font-semibold text-slate-700';
const FIELD_INPUT = 'w-full rounded-lg border bg-white text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 hover:border-slate-300 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20';

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
      <span className={FIELD_LABEL}>{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          {...props}
          className={`${FIELD_INPUT} pl-10 pr-3 py-2.5 ${error ? 'border-red-300' : 'border-slate-200'}`}
        />
      </span>
      <FieldError message={error} />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
}) {
  return (
    <label className="block">
      <span className={FIELD_LABEL}>{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${FIELD_INPUT} appearance-none px-3 pr-10 py-2.5 ${error ? 'border-red-300' : 'border-slate-200'}`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </span>
      <FieldError message={error} />
    </label>
  );
}

function PasswordInput({
  label,
  placeholder,
  error,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label className="block">
      <span className={FIELD_LABEL}>{label}</span>
      <span className="relative block">
        <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${FIELD_INPUT} pl-10 pr-10 py-2.5 ${error ? 'border-red-300' : 'border-slate-200'}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
          aria-label={visible ? 'Passwort verbergen' : 'Passwort anzeigen'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
    fullName: '',
    location: '',
    radius: '50 km',
    service: '',
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
    if (!registerForm.fullName.trim()) nextErrors.fullName = 'Ansprechperson eingeben.';
    if (!registerForm.location.trim()) nextErrors.location = 'Standort eingeben.';
    if (!registerForm.service) nextErrors.service = 'Dienstleistung auswählen.';
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginForm.email.trim().toLowerCase(),
        password: loginForm.password,
      });

      if (error) throw error;
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error('Sitzung konnte nicht erstellt werden.');

      const roleResponse = await fetch('/api/auth/resolve-role', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const rolePayload = await roleResponse.json().catch(() => ({}));
      if (!roleResponse.ok) throw new Error(rolePayload?.error || 'Rolle konnte nicht ermittelt werden.');

      router.push(rolePayload?.redirectTo || '/');
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
          fullName: registerForm.fullName.trim(),
          location: registerForm.location.trim(),
          radius: registerForm.radius,
          service: registerForm.service,
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

  const isLogin = activeTab === 'login';
  const headline = isLogin ? 'Willkommen zurück' : 'Konto erstellen';
  const subheading = isLogin
    ? 'Melden Sie sich an, um Ihre Anfragen, Aufträge und Abrechnungen zu verwalten.'
    : 'Registrieren Sie Ihre Firma und schalten Sie das Umzugsnetz-Dashboard frei.';

  return (
    <main className="min-h-screen bg-white text-slate-900">
      {legalModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900">
                {legalModal === 'agb' ? 'AGB' : 'Datenschutz'}
              </h2>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Schließen"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
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

      <div className="grid min-h-screen lg:grid-cols-[35%_65%]">
        {/* LEFT — Form column */}
        <section className="flex min-h-screen flex-col bg-white">
          <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5 sm:px-10">
            <Link href="/" aria-label="Zur Startseite" className="inline-flex items-center">
              <Image src="/logo_transparent.png" alt="Umzugsnetz" width={150} height={36} className="h-8 w-auto" priority />
            </Link>
            <Link href="/" className="text-sm font-medium text-slate-500 transition-colors hover:text-brand-blue">
              Zurück zur Website
            </Link>
          </header>

          {/* Mobile hero — adds color & branding below lg breakpoint where the right-hand aside is hidden */}
          <div className="relative overflow-hidden bg-gradient-to-br from-brand-blue via-brand-blue to-slate-900 px-6 py-7 text-white sm:px-10 lg:hidden">
            <Image
              src="/login.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover opacity-25"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/90 via-brand-blue/75 to-slate-900/85" />
            <div className="relative">
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                Live-Marktplatz für Umzüge & Entrümpelungen
              </span>
              <h2 className="mt-3 text-xl font-bold leading-tight tracking-tight sm:text-2xl">
                Deutschlands wachsende Plattform für geprüfte Umzugs- &amp; Entrümpelungs­firmen.
              </h2>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-white/90">
                <div>
                  <dt className="text-base font-bold sm:text-lg">500+</dt>
                  <dd className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-[10px]">Geprüfte Firmen</dd>
                </div>
                <div>
                  <dt className="text-base font-bold sm:text-lg">50.000+</dt>
                  <dd className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-[10px]">Kunden</dd>
                </div>
                <div>
                  <dt className="text-base font-bold sm:text-lg">4.9★</dt>
                  <dd className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-[10px]">Trustpilot</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-center overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-6 py-10 sm:px-10 lg:bg-none">
            <div className="w-full max-w-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
                {isLogin ? 'Anmelden' : 'Registrieren'}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{headline}</h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">{subheading}</p>

              <div className="mt-8 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-sm">
                {[
                  { id: 'login', label: 'Anmelden' },
                  { id: 'register', label: 'Registrieren' },
                ].map((tab) => {
                  const tabActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setActiveTab(tab.id as 'login' | 'register');
                        setErrors({});
                      }}
                      className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                        tabActive ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {isLogin ? (
                <form onSubmit={handleLogin} className="mt-7 space-y-5">
                  <TextInput
                    label="E-Mail-Adresse"
                    icon={Mail}
                    type="email"
                    placeholder="ihre@email.de"
                    value={loginForm.email}
                    error={errors.email}
                    onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
                  />
                  <PasswordInput
                    label="Passwort"
                    placeholder="Ihr Passwort"
                    value={loginForm.password}
                    error={errors.password}
                    onChange={(value) => setLoginForm((current) => ({ ...current, password: value }))}
                  />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      onClick={() => setLoginForm((current) => ({ ...current, remember: !current.remember }))}
                      className="flex min-w-0 items-center gap-2.5"
                      aria-pressed={loginForm.remember}
                    >
                      <span className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors ${loginForm.remember ? 'bg-brand-blue' : 'bg-slate-200'}`}>
                        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${loginForm.remember ? 'translate-x-4' : 'translate-x-0'}`} />
                      </span>
                      <span className="text-sm font-medium text-slate-600">Angemeldet bleiben</span>
                    </button>
                    <a href="/passwort-zuruecksetzen" className="text-sm font-medium text-brand-blue transition-colors hover:underline">
                      Passwort vergessen?
                    </a>
                  </div>

                  <FieldError message={errors.login} />

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
                  >
                    {loginLoading ? 'Anmeldung läuft…' : 'Anmelden'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <p className="text-center text-sm text-slate-500">
                    Noch kein Konto?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('register');
                        setErrors({});
                      }}
                      className="font-semibold text-brand-blue hover:underline"
                    >
                      Jetzt registrieren
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="mt-7 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <TextInput
                      label="Firmenname"
                      icon={Building2}
                      placeholder="Musterfirma GmbH"
                      value={registerForm.companyName}
                      error={errors.companyName}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, companyName: event.target.value }))}
                    />
                    <TextInput
                      label="Ihr Name"
                      icon={User2}
                      placeholder="Max Mustermann"
                      value={registerForm.fullName}
                      error={errors.fullName}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, fullName: event.target.value }))}
                    />
                    <TextInput
                      label="Standort"
                      icon={MapPin}
                      placeholder="z. B. Berlin"
                      value={registerForm.location}
                      error={errors.location}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, location: event.target.value }))}
                    />
                    <SelectInput
                      label="Einzugsradius"
                      value={registerForm.radius}
                      onChange={(value) => setRegisterForm((current) => ({ ...current, radius: value }))}
                      options={REGISTER_RADIUS_OPTIONS.map((option) => ({ value: option, label: option }))}
                    />
                    <div className="sm:col-span-2">
                      <SelectInput
                        label="Dienstleistung"
                        value={registerForm.service}
                        error={errors.service}
                        onChange={(value) => setRegisterForm((current) => ({ ...current, service: value }))}
                        options={REGISTER_SERVICE_OPTIONS}
                      />
                    </div>
                    <TextInput
                      label="Firmen-Website"
                      icon={Globe2}
                      inputMode="url"
                      placeholder="https://firma.de"
                      value={registerForm.website}
                      error={errors.website}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, website: event.target.value }))}
                    />
                    <TextInput
                      label="Telefon"
                      icon={Phone}
                      inputMode="tel"
                      placeholder="+49 170 1234567"
                      value={registerForm.phone}
                      error={errors.phone}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                    <div className="sm:col-span-2">
                      <TextInput
                        label="E-Mail"
                        icon={Mail}
                        type="email"
                        placeholder="kontakt@firma.de"
                        value={registerForm.email}
                        error={errors.email}
                        onChange={(event) => setRegisterForm((current) => ({ ...current, email: event.target.value }))}
                      />
                    </div>
                    <PasswordInput
                      label="Passwort"
                      placeholder="Mindestens 8 Zeichen"
                      value={registerForm.password}
                      error={errors.password}
                      onChange={(value) => setRegisterForm((current) => ({ ...current, password: value }))}
                    />
                    <PasswordInput
                      label="Passwort wiederholen"
                      placeholder="Erneut eingeben"
                      value={registerForm.confirmPassword}
                      error={errors.confirmPassword}
                      onChange={(value) => setRegisterForm((current) => ({ ...current, confirmPassword: value }))}
                    />
                  </div>

                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <span
                      className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border-2 transition-all ${
                        registerForm.acceptedTerms ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {registerForm.acceptedTerms ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <input
                      type="checkbox"
                      checked={registerForm.acceptedTerms}
                      onChange={(event) => setRegisterForm((current) => ({ ...current, acceptedTerms: event.target.checked }))}
                      className="sr-only"
                    />
                    <span className="text-xs leading-relaxed text-slate-600">
                      Ich akzeptiere die{' '}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          setLegalModal('agb');
                        }}
                        className="font-semibold text-brand-blue hover:underline"
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
                        className="font-semibold text-brand-blue hover:underline"
                      >
                        Datenschutzbestimmungen
                      </button>
                      .
                    </span>
                  </label>
                  <FieldError message={errors.acceptedTerms} />
                  <FieldError message={errors.register} />

                  {registerSuccess ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                      Konto erstellt. Sie erhalten in Kürze eine Bestätigung per E-Mail.
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={registerLoading}
                    className="group flex w-full items-center justify-center gap-2 rounded-lg bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
                  >
                    {registerLoading ? 'Wird erstellt…' : 'Konto erstellen'}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>

                  <p className="text-center text-sm text-slate-500">
                    Bereits registriert?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('login');
                        setErrors({});
                      }}
                      className="font-semibold text-brand-blue hover:underline"
                    >
                      Jetzt anmelden
                    </button>
                  </p>
                </form>
              )}
            </div>
          </div>

          <footer className="flex flex-col gap-2 border-t border-slate-100 px-6 py-4 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <span>© {new Date().getFullYear()} Umzugsnetz</span>
            <div className="flex flex-wrap gap-4">
              <Link href="/impressum" className="transition-colors hover:text-slate-600">Impressum</Link>
              <Link href="/datenschutz" className="transition-colors hover:text-slate-600">Datenschutz</Link>
              <Link href="/agb" className="transition-colors hover:text-slate-600">AGB</Link>
            </div>
          </footer>
        </section>

        {/* RIGHT — Image / branding column */}
        <aside className="relative hidden overflow-hidden lg:block">
          <Image
            src="/login.png"
            alt=""
            fill
            sizes="65vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/85 via-brand-blue/50 to-slate-900/80" />

          <div className="absolute inset-0 flex flex-col justify-between p-12 text-white">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-semibold backdrop-blur">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Live-Marktplatz für Umzüge & Entrümpelungen
              </span>
            </div>

            <div className="max-w-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Umzugsnetz</p>
              <h2 className="mt-3 text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
                Deutschlands wachsende Plattform für geprüfte Umzugs- und Entrümpelungs­firmen.
              </h2>
              <p className="mt-5 max-w-md text-base leading-relaxed text-white/85">
                Verwalten Sie Anfragen, Marktplatz-Käufe und Abrechnung an einem Ort — schlank, sicher und auf Ihre Region zugeschnitten.
              </p>

              <dl className="mt-10 grid grid-cols-3 gap-6">
                <div>
                  <dt className="text-3xl font-bold">500+</dt>
                  <dd className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Geprüfte Firmen</dd>
                </div>
                <div>
                  <dt className="text-3xl font-bold">50.000+</dt>
                  <dd className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Zufriedene Kunden</dd>
                </div>
                <div>
                  <dt className="text-3xl font-bold">4.9★</dt>
                  <dd className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">Trustpilot</dd>
                </div>
              </dl>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
