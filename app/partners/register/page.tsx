'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ToastProvider';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, User, Mail, Lock, Key, ArrowRight, Building2, Phone } from 'lucide-react';
import Link from 'next/link';

export default function PartnerRegisterPage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    firmenname: '',
    email: '',
    phone: '',
    password: '',
    inviteCode: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: codeData, error: codeError } = await supabase
        .from('partner_invite_codes')
        .select('*')
        .eq('code', form.inviteCode.toUpperCase())
        .eq('is_used', false)
        .single();

      if (codeError || !codeData) {
        throw new Error('Ungültiger oder bereits verwendeter Einmalcode.');
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.name,
            company_name: form.firmenname
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Registrierung fehlgeschlagen.');

      const { data: partnerProfile, error: profileError } = await supabase.from('partners').insert([{
        user_id: authData.user.id,
        name: form.firmenname,
        email: form.email,
        phone: form.phone,
        status: 'PENDING',
        category: 'Standard Anfragen',
        balance: 0
      }]).select('id').single();

      if (profileError) {
        throw new Error(`Profil konnte nicht erstellt werden: ${profileError.message}`);
      }

      await supabase
        .from('partner_invite_codes')
        .update({ is_used: true, used_by: partnerProfile?.id || null })
        .eq('id', codeData.id);

      await supabase.from('notifications').insert([{
        type: 'NEW_PARTNER',
        title: 'Neue Partner-Registrierung',
        message: `${form.firmenname} hat sich als Partner registriert und wartet auf Freischaltung.`,
        link: '/admin/dashboard/partner',
        is_read: false,
      }]);

      showToast('success', 'Registrierung erfolgreich!', 'Ihr Account wird automatisiert geprüft und anschließend freigeschaltet.');
      router.push('/partners/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 font-sans text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(28,120,204,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(0,182,122,0.18),transparent_28%)]" />
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/8 shadow-[0_35px_90px_rgba(15,23,42,0.45)] backdrop-blur-xl">
          <div className="grid lg:grid-cols-[1fr_1fr]">
            <div className="relative min-h-[320px] overflow-hidden lg:min-h-[760px]">
              <img src="/1.jpeg" alt="Umzugsnetz Partner Registrierung" className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/88 via-brand-blue-hover/66 to-brand-green/52" />
              <div className="relative z-10 flex h-full flex-col justify-between p-6 sm:p-8 lg:p-10">
                <Link href="/" className="inline-flex w-max items-center gap-3 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/90 transition-colors hover:bg-white/16">
                  <ShieldCheck className="h-4 w-4" />
                  Umzugsnetz Partner
                </Link>
                <div className="max-w-lg space-y-6 py-12">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-white/80">
                    Premium Netzwerk
                  </div>
                  <div>
                    <h1 className="text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                      Werden Sie Teil des Umzugsnetz Partnerbereichs.
                    </h1>
                    <p className="mt-4 max-w-md text-base leading-relaxed text-white/72 sm:text-lg">
                      Registrierung, Freischaltcode und Firmendaten sind auf einer einzigen hochwertigen Oberfläche gebündelt.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 text-slate-900 sm:p-8 lg:p-10">
              <div className="mx-auto w-full max-w-md">
                <div className="mb-8">
                  <div className="inline-flex items-center justify-center rounded-3xl border border-brand-blue/10 bg-brand-blue-soft p-4 shadow-sm">
                    <ShieldCheck className="h-8 w-8 text-brand-blue" />
                  </div>
                  <h2 className="mt-6 text-3xl font-black tracking-tight">Partner werden</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500">
                    Registrieren Sie Ihr Unternehmen und reichen Sie den Freischaltcode direkt im ersten Schritt ein.
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-7">
                  {error && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600">{error}</div>}

                  <form onSubmit={handleRegister} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Firmenname</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                        <input type="text" required placeholder="z. B. Mueller Umzuege GmbH" value={form.firmenname} onChange={e => setForm({ ...form, firmenname: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Ihr Name</label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                          <input type="text" required placeholder="Max Mustermann" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15" />
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">Telefon</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                          <input type="tel" required placeholder="+49 171 1234567" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15" />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">E-Mail Adresse</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                        <input type="email" required placeholder="partner@firma.de" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15" />
                      </div>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">Passwort</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-300" />
                        <input type="password" required placeholder="Passwort wählen" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-12 py-4 text-slate-900 transition-all focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/15" />
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-4">
                      <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-amber-700">Einmal-Freischaltcode</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-500" />
                        <input type="text" required placeholder="XXXX-XXXX" value={form.inviteCode} onChange={e => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })} className="w-full rounded-2xl border border-amber-200 bg-white px-12 py-4 font-bold text-amber-900 transition-all focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200" />
                      </div>
                    </div>

                    <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-3 rounded-2xl bg-brand-blue py-4 font-black text-white shadow-xl shadow-brand-blue/20 transition-all hover:bg-brand-blue-hover disabled:opacity-50">
                      {loading ? 'Wird erstellt...' : 'Konto erstellen'} <ArrowRight className="h-5 w-5" />
                    </button>
                  </form>
                </div>

                <p className="mt-6 text-center text-sm font-medium text-slate-500">
                  Bereits Partner? <Link href="/partners/login" className="font-bold text-brand-blue hover:underline">Hier einloggen</Link>
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
