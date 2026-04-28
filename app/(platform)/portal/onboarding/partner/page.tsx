'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  Globe2,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  User2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

type ServiceMode = 'UMZUG' | 'ENTRUEMPELUNG' | 'BEIDES';

type StepId = 'company' | 'location' | 'services' | 'review';

type FormState = {
  companyName: string;
  fullName: string;
  phone: string;
  websiteUrl: string;
  city: string;
  postalCode: string;
  radiusKm: number;
  serviceMode: ServiceMode;
};

type StepConfig = {
  id: StepId;
  title: string;
  subtitle: string;
};

const STEPS: StepConfig[] = [
  { id: 'company', title: 'Firma', subtitle: 'Wer sind Sie?' },
  { id: 'location', title: 'Einsatzgebiet', subtitle: 'Wo sind Sie aktiv?' },
  { id: 'services', title: 'Leistungen', subtitle: 'Was bieten Sie an?' },
  { id: 'review', title: 'Bestätigen', subtitle: 'Alles korrekt?' },
];

const SERVICE_OPTIONS: Array<{
  value: ServiceMode;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    value: 'UMZUG',
    label: 'Umzüge',
    description: 'Privatumzüge, Firmenumzüge und Auslandsumzüge.',
    icon: Truck,
  },
  {
    value: 'ENTRUEMPELUNG',
    label: 'Entrümpelungen',
    description: 'Wohnungs-, Haus- und Gewerbeentrümpelungen.',
    icon: Trash2,
  },
  {
    value: 'BEIDES',
    label: 'Umzüge & Entrümpelungen',
    description: 'Sie führen beide Leistungen aus einer Hand aus.',
    icon: Building2,
  },
];

const RADIUS_PRESETS = [10, 25, 50, 75, 100, 150];
const PHONE_PATTERN = /^[+]?[\d\s()/.-]{7,20}$/;
const PLZ_PATTERN = /^\d{4,5}$/;

function normalizeWebsite(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function isValidWebsite(value: string) {
  if (!value.trim()) return true;
  try {
    const url = new URL(normalizeWebsite(value));
    return url.hostname.includes('.');
  } catch {
    return false;
  }
}

function serviceLabel(value: ServiceMode) {
  return SERVICE_OPTIONS.find((entry) => entry.value === value)?.label || 'Umzüge';
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export default function PartnerOnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>('PENDING');
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [form, setForm] = useState<FormState>({
    companyName: '',
    fullName: '',
    phone: '',
    websiteUrl: '',
    city: '',
    postalCode: '',
    radiusKm: 50,
    serviceMode: 'UMZUG',
  });

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        const token = sessionData.session?.access_token;
        if (!token) {
          router.replace('/login');
          return;
        }

        const response = await fetch('/api/partner/onboarding', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload?.error || 'Onboarding konnte nicht geladen werden.');

        if (cancelled) return;
        setCompletedAt(payload.onboardingCompletedAt || null);
        setVerificationStatus(payload.verificationStatus || 'PENDING');
        setForm({
          companyName: String(payload.companyName || ''),
          fullName: String(payload.fullName || ''),
          phone: String(payload.phone || ''),
          websiteUrl: String(payload.websiteUrl || ''),
          city: String(payload.city || ''),
          postalCode: String(payload.postalCode || ''),
          radiusKm: Number(payload.radiusKm || 50),
          serviceMode: (payload.serviceMode === 'ENTRÜMPELUNG' || payload.serviceMode === 'ENTRUEMPELUNG'
            ? 'ENTRUEMPELUNG'
            : payload.serviceMode === 'BEIDES'
              ? 'BEIDES'
              : 'UMZUG'),
        });
      } catch (loadError) {
        if (!cancelled) {
          showToast('error', 'Onboarding nicht verfügbar', loadError instanceof Error ? loadError.message : 'Bitte später erneut versuchen.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [router, showToast]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const validateStep = (id: StepId): boolean => {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (id === 'company') {
      if (!form.companyName.trim()) next.companyName = 'Bitte den Firmennamen eintragen.';
      if (!form.fullName.trim()) next.fullName = 'Bitte einen Ansprechpartner angeben.';
      if (!PHONE_PATTERN.test(form.phone.trim())) next.phone = 'Bitte eine gültige Telefonnummer eingeben.';
      if (!isValidWebsite(form.websiteUrl)) next.websiteUrl = 'Bitte eine gültige Website-Adresse eingeben (z. B. https://firma.de).';
    }
    if (id === 'location') {
      if (!form.city.trim()) next.city = 'Bitte eine Stadt angeben.';
      if (form.postalCode && !PLZ_PATTERN.test(form.postalCode.trim())) next.postalCode = 'Postleitzahl 4–5 Ziffern.';
      if (!form.radiusKm || form.radiusKm < 5) next.radiusKm = 'Mindestens 5 km.';
    }
    if (id === 'services') {
      if (!form.serviceMode) next.serviceMode = 'Bitte eine Leistung wählen.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goToStep = (target: number) => {
    if (target < 0 || target >= STEPS.length) return;
    if (target > stepIndex) {
      for (let i = stepIndex; i < target; i += 1) {
        if (!validateStep(STEPS[i].id)) return;
      }
    }
    setStepIndex(target);
  };

  const handleNext = () => {
    const current = STEPS[stepIndex].id;
    if (!validateStep(current)) return;
    if (stepIndex < STEPS.length - 1) {
      setStepIndex(stepIndex + 1);
    }
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex(stepIndex - 1);
  };

  const handleSubmit = async () => {
    const valid = STEPS.every((step) => step.id === 'review' ? true : validateStep(step.id));
    if (!valid) return;

    setSaving(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Sitzung nicht gefunden.');

      const response = await fetch('/api/partner/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          websiteUrl: form.websiteUrl.trim() ? normalizeWebsite(form.websiteUrl) : '',
          city: form.city.trim(),
          postalCode: form.postalCode.trim(),
          radiusKm: form.radiusKm,
          serviceMode: form.serviceMode,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || 'Onboarding konnte nicht gespeichert werden.');

      showToast('success', 'Onboarding abgeschlossen', payload?.verificationSummary || 'Ihre Angaben wurden gespeichert.');
      setCompletedAt(new Date().toISOString());
      setVerificationStatus(payload.verificationStatus || 'VERIFIED');
      setTimeout(() => {
        router.push(payload?.redirectTo || '/crm/partner');
      }, 900);
    } catch (submitError) {
      showToast('error', 'Speichern fehlgeschlagen', submitError instanceof Error ? submitError.message : 'Bitte erneut versuchen.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="my-auto flex flex-col items-center gap-4 rounded-[2rem] border border-white/80 bg-white p-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <Image src="/logo_transparent.png" alt="Umzugsnetz" width={170} height={44} className="h-10 w-auto" priority />
        <Loader2 className="h-7 w-7 animate-spin text-brand-blue" />
        <p className="font-black text-slate-900">Lädt Ihr Onboarding ...</p>
      </section>
    );
  }

  if (completedAt) {
    return (
      <section className="my-auto w-full max-w-xl rounded-[2rem] border border-white/80 bg-white p-10 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="h-9 w-9" />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600">Onboarding abgeschlossen</p>
        <h1 className="mt-3 text-2xl font-black text-slate-950">Willkommen im Umzugsnetz!</h1>
        <p className="mt-2 text-sm font-medium text-slate-500">
          Ihre Angaben wurden gespeichert. {verificationStatus === 'VERIFIED' ? 'Ihr Profil ist bereits verifiziert.' : 'Wir prüfen Ihre Angaben in den nächsten 24 Stunden.'}
        </p>
        <Link href="/crm/partner" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-brand-blue px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-blue/20">
          Zum Partner-Dashboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const currentStep = STEPS[stepIndex];
  const isLastStep = stepIndex === STEPS.length - 1;

  return (
    <section className="w-full">
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <Link href="/" aria-label="Zur Startseite">
          <Image src="/logo_transparent.png" alt="Umzugsnetz" width={170} height={44} className="h-10 w-auto" priority />
        </Link>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-brand-blue/10 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-brand-blue">
          <Sparkles className="h-3.5 w-3.5" />
          Partner-Onboarding
        </div>
        <h1 className="text-2xl font-black text-slate-950 sm:text-3xl">
          Schritt {stepIndex + 1} von {STEPS.length}: {currentStep.title}
        </h1>
        <p className="max-w-xl text-sm font-medium text-slate-500">
          {currentStep.subtitle} Mit nur wenigen Angaben schalten wir Ihren Zugang zum Marktplatz frei.
        </p>
      </div>

      <ProgressBar steps={STEPS} stepIndex={stepIndex} onSelect={goToStep} />

      <div className="mt-8 rounded-[2rem] border border-white/80 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="p-6 sm:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {currentStep.id === 'company' ? <CompanyStep form={form} errors={errors} update={update} /> : null}
              {currentStep.id === 'location' ? <LocationStep form={form} errors={errors} update={update} /> : null}
              {currentStep.id === 'services' ? <ServicesStep form={form} errors={errors} update={update} /> : null}
              {currentStep.id === 'review' ? <ReviewStep form={form} onEdit={(target) => goToStep(target)} /> : null}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <button
            type="button"
            onClick={handleBack}
            disabled={stepIndex === 0 || saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 transition-colors hover:border-slate-300 disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs font-black uppercase tracking-[0.18em] text-slate-400 sm:inline">
              Schritt {stepIndex + 1} / {STEPS.length}
            </span>
            {isLastStep ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? 'Wird gespeichert...' : 'Onboarding abschließen'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-blue/20"
              >
                Weiter
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3 text-xs font-medium text-slate-500">
        <ShieldCheck className="h-4 w-4 text-brand-blue" />
        Ihre Angaben werden DSGVO-konform übertragen und nur intern für Ihre Verifizierung genutzt.
      </div>
    </section>
  );
}

function ProgressBar({
  steps,
  stepIndex,
  onSelect,
}: {
  steps: StepConfig[];
  stepIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <nav aria-label="Fortschritt" className="overflow-x-auto">
      <ol className="flex min-w-max items-center gap-3 sm:gap-4">
        {steps.map((step, index) => {
          const completed = index < stepIndex;
          const active = index === stepIndex;
          return (
            <li key={step.id} className="flex items-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={classNames(
                  'flex items-center gap-3 rounded-2xl border px-4 py-2 text-left transition-colors',
                  active && 'border-brand-blue bg-brand-blue text-white shadow-lg shadow-brand-blue/20',
                  !active && completed && 'border-emerald-200 bg-emerald-50 text-emerald-700',
                  !active && !completed && 'border-slate-200 bg-white text-slate-500',
                )}
              >
                <span
                  className={classNames(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-black',
                    active && 'bg-white/15 text-white',
                    !active && completed && 'bg-emerald-100 text-emerald-700',
                    !active && !completed && 'bg-slate-100 text-slate-500',
                  )}
                >
                  {completed ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className="hidden flex-col sm:flex">
                  <span className="text-[11px] font-black uppercase tracking-[0.16em] opacity-70">Schritt {index + 1}</span>
                  <span className="text-sm font-black">{step.title}</span>
                </span>
                <span className="text-sm font-black sm:hidden">{step.title}</span>
              </button>
              {index < steps.length - 1 ? <span className="hidden h-px w-8 bg-slate-200 sm:block" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

type StepProps = {
  form: FormState;
  errors: Partial<Record<keyof FormState, string>>;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
};

function CompanyStep({ form, errors, update }: StepProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <FieldText
        label="Firmenname"
        icon={Building2}
        value={form.companyName}
        error={errors.companyName}
        placeholder="Musterfirma GmbH"
        onChange={(value) => update('companyName', value)}
        required
        wide
      />
      <FieldText
        label="Ansprechperson"
        icon={User2}
        value={form.fullName}
        error={errors.fullName}
        placeholder="Max Mustermann"
        onChange={(value) => update('fullName', value)}
        required
      />
      <FieldText
        label="Telefon"
        icon={Phone}
        type="tel"
        value={form.phone}
        error={errors.phone}
        placeholder="+49 170 1234567"
        onChange={(value) => update('phone', value)}
        required
      />
      <FieldText
        label="Firmen-Website"
        icon={Globe2}
        value={form.websiteUrl}
        error={errors.websiteUrl}
        placeholder="https://firma.de"
        onChange={(value) => update('websiteUrl', value)}
        wide
        helper="Optional, hilft aber bei der automatischen Verifizierung."
      />
    </div>
  );
}

function LocationStep({ form, errors, update }: StepProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-3">
        <FieldText
          label="Stadt"
          icon={MapPin}
          value={form.city}
          error={errors.city}
          placeholder="z. B. Berlin"
          onChange={(value) => update('city', value)}
          required
          wide
        />
        <FieldText
          label="Postleitzahl"
          value={form.postalCode}
          error={errors.postalCode}
          placeholder="10115"
          inputMode="numeric"
          maxLength={5}
          onChange={(value) => update('postalCode', value.replace(/\D/g, '').slice(0, 5))}
        />
      </div>

      <div className="rounded-[1.7rem] border border-slate-100 bg-slate-50/80 p-5 sm:p-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Einsatzradius</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{form.radiusKm} km</p>
          </div>
          <p className="max-w-xs text-right text-xs font-medium text-slate-500">
            Wir zeigen Ihnen Anfragen, deren Start- oder Zieladresse innerhalb dieses Radius liegt.
          </p>
        </div>
        <input
          type="range"
          min={5}
          max={300}
          step={5}
          value={form.radiusKm}
          onChange={(event) => update('radiusKm', Number(event.target.value))}
          className="brand-range mt-5 w-full cursor-pointer"
        />
        <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
          <span>5 km</span>
          <span>300 km</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {RADIUS_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => update('radiusKm', preset)}
              className={classNames(
                'rounded-full border px-4 py-1.5 text-xs font-black transition-colors',
                form.radiusKm === preset
                  ? 'border-brand-blue bg-brand-blue text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue',
              )}
            >
              {preset} km
            </button>
          ))}
        </div>
        {errors.radiusKm ? <p className="mt-3 text-xs font-bold text-red-600">{errors.radiusKm}</p> : null}
      </div>
    </div>
  );
}

function ServicesStep({ form, errors, update }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {SERVICE_OPTIONS.map((option) => {
          const active = form.serviceMode === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => update('serviceMode', option.value)}
              className={classNames(
                'group flex flex-col items-start gap-3 rounded-[1.7rem] border-2 p-5 text-left transition-all',
                active
                  ? 'border-brand-blue bg-brand-blue/5 shadow-[0_18px_45px_rgba(2,118,200,0.15)]'
                  : 'border-slate-200 bg-white hover:border-brand-blue/40 hover:bg-brand-blue/5',
              )}
            >
              <span className={classNames(
                'flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors',
                active ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-200 bg-slate-50 text-brand-blue',
              )}>
                <option.icon className="h-5 w-5" />
              </span>
              <p className="text-base font-black text-slate-950">{option.label}</p>
              <p className="text-xs font-medium text-slate-500">{option.description}</p>
              <span className={classNames(
                'mt-auto inline-flex items-center gap-1 text-xs font-black',
                active ? 'text-brand-blue' : 'text-slate-400',
              )}>
                {active ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Ausgewählt
                  </>
                ) : 'Auswählen'}
              </span>
            </button>
          );
        })}
      </div>
      {errors.serviceMode ? <p className="text-xs font-bold text-red-600">{errors.serviceMode}</p> : null}

      <p className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-xs font-medium text-slate-500">
        Hinweis: Sie können Ihre Leistungen später jederzeit über das Partner-Dashboard anpassen.
      </p>
    </div>
  );
}

function ReviewStep({ form, onEdit }: { form: FormState; onEdit: (step: number) => void }) {
  const cards = [
    {
      title: 'Firma',
      step: 0,
      rows: [
        { label: 'Firmenname', value: form.companyName || '–' },
        { label: 'Ansprechperson', value: form.fullName || '–' },
        { label: 'Telefon', value: form.phone || '–' },
        { label: 'Website', value: form.websiteUrl || 'Nicht angegeben' },
      ],
    },
    {
      title: 'Einsatzgebiet',
      step: 1,
      rows: [
        { label: 'Stadt', value: form.city || '–' },
        { label: 'PLZ', value: form.postalCode || 'Nicht angegeben' },
        { label: 'Radius', value: `${form.radiusKm} km` },
      ],
    },
    {
      title: 'Leistungen',
      step: 2,
      rows: [{ label: 'Auswahl', value: serviceLabel(form.serviceMode) }],
    },
  ];

  return (
    <div className="space-y-5">
      <p className="text-sm font-medium text-slate-600">
        Alles korrekt? Mit dem Klick auf <span className="font-black text-slate-900">Onboarding abschließen</span> aktivieren Sie Ihren Zugang
        zum Partner-Dashboard. Anschließend prüfen wir Ihre Angaben automatisch und schalten den Marktplatz frei.
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="rounded-[1.7rem] border border-slate-100 bg-slate-50/80 p-5">
            <header className="mb-3 flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{card.title}</p>
              <button type="button" onClick={() => onEdit(card.step)} className="text-xs font-black text-brand-blue hover:underline">
                Bearbeiten
              </button>
            </header>
            <dl className="space-y-2 text-sm">
              {card.rows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-3">
                  <dt className="font-medium text-slate-500">{row.label}</dt>
                  <dd className="break-words text-right font-black text-slate-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
    </div>
  );
}

function FieldText({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  error,
  required,
  wide,
  helper,
  maxLength,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'tel' | 'email' | 'url';
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  error?: string;
  required?: boolean;
  wide?: boolean;
  helper?: string;
  maxLength?: number;
}) {
  return (
    <label className={classNames('block', wide ? 'sm:col-span-2' : '')}>
      <span className="mb-2 flex items-center justify-between text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        <span>{label}{required ? ' *' : ''}</span>
        {helper ? <span className="text-[10px] font-bold normal-case tracking-normal text-slate-400">{helper}</span> : null}
      </span>
      <span className="relative block">
        {Icon ? <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" /> : null}
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          inputMode={inputMode}
          maxLength={maxLength}
          className={classNames(
            'w-full rounded-2xl border-2 bg-slate-50 py-3.5 text-sm font-semibold text-slate-900 outline-none transition-colors hover:border-slate-300 focus:border-brand-blue focus:bg-white focus:ring-4 focus:ring-brand-blue/10',
            Icon ? 'pl-12 pr-4' : 'px-4',
            error ? 'border-red-300' : 'border-slate-200',
          )}
        />
      </span>
      {error ? <p className="mt-2 text-xs font-bold text-red-600">{error}</p> : null}
    </label>
  );
}
