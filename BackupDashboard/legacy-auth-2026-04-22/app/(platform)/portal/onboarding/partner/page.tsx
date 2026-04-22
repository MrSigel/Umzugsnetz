'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Building2, Globe, MapPin, Phone, User2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

const SERVICE_OPTIONS = [
  { value: 'UMZUG', label: 'Umzug' },
  { value: 'ENTRUEMPELUNG', label: 'Entrümpelung' },
  { value: 'BEIDES', label: 'Beides' },
];

export default function PartnerOnboardingPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [radiusKm, setRadiusKm] = useState('50');
  const [services, setServices] = useState<string[]>(['UMZUG']);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error || !data.session?.access_token) {
          throw error || new Error('Sitzung nicht gefunden.');
        }

        const response = await fetch('/api/partner/onboarding', {
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
          },
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Onboarding konnte nicht geladen werden.');
        }

        setCompanyName(payload.companyName || '');
        setFullName(payload.fullName || '');
        setPhone(payload.phone || '');
        setWebsiteUrl(payload.websiteUrl || '');
        setCity(payload.city || '');
        setPostalCode(payload.postalCode || '');
        setRadiusKm(String(payload.radiusKm || 50));
        setServices(payload.services?.length ? payload.services : ['UMZUG']);
      } catch (err: any) {
        showToast('error', 'Onboarding konnte nicht geladen werden', err.message);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [showToast]);

  const toggleService = (service: string) => {
    setServices((current) =>
      current.includes(service) ? current.filter((entry) => entry !== service) : [...current, service],
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);

    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session?.access_token) {
        throw error || new Error('Sitzung nicht gefunden.');
      }

      const response = await fetch('/api/partner/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.session.access_token}`,
        },
        body: JSON.stringify({
          companyName,
          fullName,
          phone,
          websiteUrl,
          city,
          postalCode,
          radiusKm: Number(radiusKm),
          services,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || 'Onboarding konnte nicht gespeichert werden.');
      }

      showToast('success', 'Onboarding gespeichert', payload?.verificationSummary || 'Ihre Angaben wurden gespeichert.');
      router.push(payload?.redirectTo || '/crm/partner');
    } catch (err: any) {
      showToast('error', 'Speichern fehlgeschlagen', err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="w-full max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Partner-Onboarding</p>
        <h1 className="mt-3 text-3xl font-bold text-slate-900">Unternehmensprofil abschließen</h1>
        <p className="mt-2 text-sm text-slate-600">
          Pflicht-Wizard für Firmenprofil, Einsatzgebiet, Leistungen und automatische Vorprüfung.
        </p>
      </div>

      {loading ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          Lade Onboarding ...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Firmenname</span>
              <span className="relative block">
                <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3.5 text-slate-900 outline-none focus:border-brand-blue" />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Ansprechperson</span>
              <span className="relative block">
                <User2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3.5 text-slate-900 outline-none focus:border-brand-blue" />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Telefon</span>
              <span className="relative block">
                <Phone className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3.5 text-slate-900 outline-none focus:border-brand-blue" />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Website</span>
              <span className="relative block">
                <Globe className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://..." className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3.5 text-slate-900 outline-none focus:border-brand-blue" />
              </span>
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <label className="block md:col-span-1">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Stadt</span>
              <span className="relative block">
                <MapPin className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
                <input value={city} onChange={(e) => setCity(e.target.value)} required className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-3.5 text-slate-900 outline-none focus:border-brand-blue" />
              </span>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">PLZ</span>
              <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-slate-900 outline-none focus:border-brand-blue" />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Einsatzradius (km)</span>
              <input type="number" min={1} value={radiusKm} onChange={(e) => setRadiusKm(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-slate-900 outline-none focus:border-brand-blue" />
            </label>
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold text-slate-700">Leistungen</p>
            <div className="flex flex-wrap gap-3">
              {SERVICE_OPTIONS.map((option) => {
                const active = services.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleService(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                      active
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-6 py-4 font-black text-white transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
          >
            {saving ? 'Speichert ...' : 'Onboarding abschließen'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>
      )}
    </section>
  );
}
