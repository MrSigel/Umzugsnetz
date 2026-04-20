'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard,
  ClipboardList,
  Wallet,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Settings,
  ArrowRightLeft,
  CreditCard
} from 'lucide-react';

export default function PartnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const checkUser = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push('/partners/login');
      return;
    }

    const { data: partnerData, error } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error || !partnerData) {
      router.push('/partners/login');
      return;
    }

    setPartner(partnerData);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void checkUser();
  }, [checkUser]);

  useEffect(() => {
    if (!partner?.id) {
      return;
    }

    const channel = supabase
      .channel(`partner:${partner.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'partners', filter: `id=eq.${partner.id}` },
        (payload) => {
          setPartner(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partner?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/partners/login');
  };

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const navItems = [
    { id: 'overview', label: 'Übersicht', icon: LayoutDashboard, href: '/partners/dashboard' },
    { id: 'tarife', label: 'Tarife', icon: ClipboardList, href: '/partners/dashboard/tarife' },
    { id: 'finanzen', label: 'Finanzen & Aufladung', icon: Wallet, href: '/partners/dashboard/finanzen' },
    { id: 'transactions', label: 'Transaktionen', icon: ArrowRightLeft, href: '/partners/dashboard/transaktionen' },
    { id: 'kundenanfragen', label: 'Kundenanfragen', icon: MessageSquare, href: '/partners/dashboard/anfragen' },
    { id: 'auto-topup', label: 'Automatische Aufladung', icon: CreditCard, href: '/partners/dashboard/auto-topup' },
    { id: 'settings', label: 'Einstellungen', icon: Settings, href: '/partners/dashboard/settings' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex font-sans">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={`fixed lg:sticky top-0 left-0 h-screen bg-white border-r border-slate-200 z-50 transition-all duration-300 w-72 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white shadow-lg shadow-brand-blue/10 flex-shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            {isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-1 mt-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.id} href={item.href} className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group relative ${isActive ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-blue'}`} />
                  <span className="font-bold text-sm tracking-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-6 border-t border-slate-100">
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 rounded-xl font-bold transition-all hover:bg-red-50 group">
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-6 lg:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-black text-slate-800 tracking-tight hidden sm:block break-words">
              Hallo, {partner.name}!
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-50 border border-slate-100 px-4 py-2 rounded-xl flex items-center gap-3 max-w-full">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <div className="text-right min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Guthaben</p>
                <p className="text-sm font-black text-slate-800 leading-tight">€{Number(partner.balance || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6 lg:p-10 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
