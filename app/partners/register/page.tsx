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
      // 1. Check Invite Code
      const { data: codeData, error: codeError } = await supabase
        .from('partner_invite_codes')
        .select('*')
        .eq('code', form.inviteCode.toUpperCase())
        .eq('is_used', false)
        .single();

      if (codeError || !codeData) {
        throw new Error('Ungültiger oder bereits verwendeter Einmalcode.');
      }

      // 2. Register User in Supabase Auth
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

      // 3. Create Partner Profile linked to User ID
      // Status: PENDING - Admin muss den Account freischalten
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
        // Rollback: Auth-User löschen wenn Partner-Profil nicht erstellt werden konnte
        // (Supabase Admin API benötigt, daher nur Hinweis)
        throw new Error(`Profil konnte nicht erstellt werden: ${profileError.message}`);
      }

      // 4. Mark Code as Used
      const { error: codeUpdateError } = await supabase
        .from('partner_invite_codes')
        .update({ is_used: true, used_by: partnerProfile?.id || null })
        .eq('id', codeData.id);

      if (codeUpdateError) {
        console.error('Code-Update fehlgeschlagen:', codeUpdateError);
        // Nicht kritisch - weiter
      }

      await supabase.from('notifications').insert([{
        type: 'NEW_PARTNER',
        title: 'Neue Partner-Registrierung',
        message: `${form.firmenname} hat sich als Partner registriert und wartet auf Freischaltung.`,
        link: '/admin/dashboard/partner',
        is_read: false,
      }]);

      // Success
      showToast('success', 'Registrierung erfolgreich!', 'Ihr Account wird vom Admin geprüft und freigeschaltet.');
      router.push('/partners/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <Link href="/" className="inline-block mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white shadow-xl mx-auto ring-4 ring-white">
              <ShieldCheck className="w-10 h-10" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-slate-800">Partner werden</h1>
          <p className="text-slate-500 mt-2 font-medium">Registrieren Sie Ihr Unternehmen</p>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 md:p-10"
        >
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100 italic">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="relative">
              <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="text" required placeholder="Firmenname"
                  value={form.firmenname} onChange={e => setForm({...form, firmenname: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-brand-blue transition-all font-medium text-black"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="text" required placeholder="Ihr Name"
                  value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-brand-blue transition-all font-medium text-black"
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input 
                  type="tel" required placeholder="Telefon"
                  value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-brand-blue transition-all font-medium text-black"
                />
              </div>
            </div>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="email" required placeholder="E-Mail Adresse"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-brand-blue transition-all font-medium text-black"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="password" required placeholder="Passwort wählen"
                value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-brand-blue transition-all font-medium text-black"
              />
            </div>

            <div className="pt-2 border-t border-slate-50 mt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Einmal-Freischaltcode</label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500" />
                <input 
                  type="text" required placeholder="XXXX-XXXX"
                  value={form.inviteCode} onChange={e => setForm({...form, inviteCode: e.target.value.toUpperCase()})}
                  className="w-full bg-amber-50 border-2 border-amber-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-amber-500 transition-all font-bold text-amber-900 placeholder:text-amber-200"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand-blue/20 hover:bg-brand-blue-hover transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Wird erstellt...' : 'Konto erstellen'} <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Bereits Partner? <Link href="/partners/login" className="text-brand-blue font-bold hover:underline">Hier einloggen</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
