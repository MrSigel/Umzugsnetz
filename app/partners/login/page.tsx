'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, Lock, ArrowRight, UserCheck } from 'lucide-react';
import Link from 'next/link';

export default function PartnerLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;
      
      // Check if this user is a partner
      const { data: partner, error: pError } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (pError || !partner) {
        await supabase.auth.signOut();
        throw new Error('Dieses Konto ist nicht als Partner registriert.');
      }

      // Status-Prüfung
      if (partner.status === 'SUSPENDED') {
        await supabase.auth.signOut();
        throw new Error('Ihr Account wurde gesperrt. Bitte kontaktieren Sie den Support.');
      }

      if (partner.status === 'PENDING') {
        await supabase.auth.signOut();
        throw new Error('Ihr Account wird noch geprüft. Sie erhalten eine Benachrichtigung, sobald er freigeschaltet ist.');
      }

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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0075c9] to-[#00b67a] flex items-center justify-center text-white shadow-xl mx-auto ring-4 ring-white">
              <ShieldCheck className="w-10 h-10" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-slate-800">Partner Login</h1>
          <p className="text-slate-500 mt-2 font-medium">Verwalten Sie Ihre Aufträge</p>
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

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="email" required placeholder="E-Mail Adresse"
                value={email} onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#0075c9] transition-all font-medium text-black"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input 
                type="password" required placeholder="Passwort"
                value={password} onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:border-[#0075c9] transition-all font-medium text-black"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-[#0075c9] text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-500/20 hover:bg-[#005ea6] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Anmeldung...' : 'Einloggen'} <ArrowRight className="w-5 h-5" />
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500 font-medium">
            Noch kein Konto? <Link href="/partners/register" className="text-[#0075c9] font-bold hover:underline">Registrieren</Link>
          </p>
        </motion.div>

        <div className="mt-8 flex items-center justify-center gap-2 text-slate-400">
           <UserCheck className="w-4 h-4" />
           <span className="text-[10px] font-bold uppercase tracking-widest text-center">Sicherer Login für verifizierte Partner</span>
        </div>
      </div>
    </div>
  );
}
