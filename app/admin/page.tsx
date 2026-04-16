'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Lock, User, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const ADMIN_INVITE_CODE = 'umzugsnetz.de2026!admin';

export default function AdminLoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const normalizeAdminEmail = (value: string) => {
    const trimmed = value.trim();
    return trimmed.includes('@') ? trimmed : `${trimmed}@admin.de`;
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: normalizeAdminEmail(username),
        password,
      });

      if (loginError) throw loginError;

      const isAdmin = data.user?.app_metadata?.role === 'admin' || data.user?.user_metadata?.role === 'admin';

      if (!isAdmin && process.env.NODE_ENV === 'production') {
        await supabase.auth.signOut();
        throw new Error('Zugriff verweigert. Dieses Konto hat keine Admin-Rechte.');
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ungültige Anmeldedaten. Bitte versuchen Sie es erneut.');
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    resetMessages();

    try {
      if (inviteCode.trim() !== ADMIN_INVITE_CODE) {
        throw new Error('Der Einladungscode ist ungültig.');
      }

      if (registerPassword !== confirmPassword) {
        throw new Error('Die Passwörter stimmen nicht überein.');
      }

      if (registerPassword.length < 8) {
        throw new Error('Das Passwort muss mindestens 8 Zeichen lang sein.');
      }

      const email = normalizeAdminEmail(registerUsername);
      const displayName = registerUsername.trim() || 'Admin';

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password: registerPassword,
        options: {
          data: {
            role: 'admin',
            full_name: displayName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        router.push('/admin/dashboard');
        return;
      }

      setSuccess('Registrierung abgeschlossen. Bitte prüfen Sie Ihre E-Mails und bestätigen Sie das Konto.');
      setActiveTab('login');
      setUsername(email);
      setPassword('');
      setRegisterUsername('');
      setRegisterPassword('');
      setConfirmPassword('');
      setInviteCode('');
    } catch (err: any) {
      setError(err.message || 'Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 font-sans">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-blue via-brand-green to-brand-blue"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-100 mb-4">
            <ShieldCheck className="w-8 h-8 text-brand-blue" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Portal</h1>
          <p className="text-slate-500 mt-2">
            {activeTab === 'login'
              ? 'Willkommen zurück! Bitte melden Sie sich an.'
              : 'Neues Admin-Konto mit Einladungscode registrieren.'}
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="grid grid-cols-2 gap-2 p-1 mb-6 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                resetMessages();
              }}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                activeTab === 'login' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Anmelden
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                resetMessages();
              }}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition-all ${
                activeTab === 'register' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Registrieren
            </button>
          </div>

          {activeTab === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Benutzername oder E-Mail</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-900"
                    placeholder="admin"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Passwort</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-900"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-100"
                >
                  {success}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-blue/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Anmelden
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Benutzername oder E-Mail</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-900"
                    placeholder="admin"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Passwort</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-900"
                    placeholder="Mindestens 8 Zeichen"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Passwort bestätigen</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-900"
                    placeholder="Passwort wiederholen"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Einladungscode</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-12 py-3.5 focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:border-brand-blue transition-all text-slate-900"
                    placeholder="Einladungscode eingeben"
                    required
                  />
                </div>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100"
                >
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-sm font-medium border border-emerald-100"
                >
                  {success}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#00b67a] hover:bg-[#009765] text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Registrieren
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <div className="mt-8"></div>
      </motion.div>
    </div>
  );
}
