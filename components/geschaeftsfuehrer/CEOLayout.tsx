/**
 * Geschäftsführer-Oberfläche Layout
 * Helles Design passend zur Landing Page
 * Brand Blue: #0276c8 | Brand Green: #11b980
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  Package,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Home,
  Briefcase,
  Bell,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CEOLayoutProps {
  children: React.ReactNode;
}

export default function CEOLayout({ children }: CEOLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email || '');
    });

    // Echte Benachrichtigungen laden
    const fetchNotifications = async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5);
        setNotifications(data || []);
      } catch (e) {
        // Notifications sind optional
      }
    };
    fetchNotifications();
  }, []);

  const navItems = [
    {
      name: 'Dashboard',
      href: '/geschaeftsfuehrer/dashboard',
      icon: Home,
    },
    {
      name: 'Partner',
      href: '/geschaeftsfuehrer/partner',
      icon: Briefcase,
    },
    {
      name: 'Mitarbeiter',
      href: '/geschaeftsfuehrer/mitarbeiter',
      icon: Users,
    },
    {
      name: 'Pakete',
      href: '/geschaeftsfuehrer/pakete',
      icon: Package,
    },
    {
      name: 'Chat-Anfragen',
      href: '/geschaeftsfuehrer/chat',
      icon: MessageSquare,
    },
    {
      name: 'Einstellungen',
      href: '/geschaeftsfuehrer/einstellungen',
      icon: Settings,
    },
  ];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const handleLogout = async () => {
    document.cookie = 'sb-access-token=; path=/; max-age=0';
    document.cookie = 'user-role=; path=/; max-age=0';
    await supabase.auth.signOut();
    router.push('/login');
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className="min-h-screen flex bg-[#f4faff]">
      {/* MOBILE OVERLAY */}
      {mobileSidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <motion.aside
        animate={{ width: sidebarOpen ? 280 : 76 }}
        transition={{ duration: 0.2 }}
        className={`
          fixed lg:relative z-50 h-screen
          bg-white border-r border-brand-blue/10 flex flex-col overflow-hidden
          shadow-[4px_0_24px_rgba(2,118,200,0.06)]
          ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          transition-transform lg:transition-none
        `}
      >
        {/* Logo / Branding */}
        <div className="p-5 border-b border-brand-blue/8">
          <div className="flex items-center justify-between">
            <Link href="/geschaeftsfuehrer/dashboard" className="flex items-center gap-3">
              <img
                src="/logo_transparent.png"
                alt="Umzugsnetz"
                className="h-10 w-auto object-contain"
              />
              {sidebarOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h1 className="text-sm font-black text-slate-800">Geschäftsführer</h1>
                  <p className="text-[11px] text-slate-400">Verwaltung</p>
                </motion.div>
              )}
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1 text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                      active
                        ? 'bg-brand-blue text-white shadow-md shadow-brand-blue/20'
                        : 'text-slate-600 hover:bg-brand-blue-soft hover:text-brand-blue'
                    }`}
                    whileHover={{ x: active ? 0 : 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {sidebarOpen && (
                      <span className="text-sm font-semibold">{item.name}</span>
                    )}
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Info + Logout */}
        <div className="border-t border-brand-blue/8 p-3 space-y-1">
          {sidebarOpen && userEmail && (
            <div className="px-4 py-2">
              <p className="text-xs text-slate-400 truncate">{userEmail}</p>
            </div>
          )}
          <motion.button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600 transition"
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-semibold">Abmelden</span>}
          </motion.button>
        </div>

        {/* Sidebar Toggle */}
        <div className="hidden lg:block border-t border-brand-blue/8 p-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center py-2 text-slate-400 hover:text-brand-blue transition"
          >
            <ChevronLeft
              className={`w-5 h-5 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`}
            />
          </button>
        </div>
      </motion.aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-screen">
        {/* TOPBAR */}
        <header className="bg-white/80 backdrop-blur-md border-b border-brand-blue/8 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (window.innerWidth < 1024) {
                  setMobileSidebarOpen(!mobileSidebarOpen);
                } else {
                  setSidebarOpen(!sidebarOpen);
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-brand-blue hover:bg-brand-blue-soft transition"
            >
              {sidebarOpen ? (
                <Menu className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
            <div>
              <h1 className="text-lg font-black text-slate-800">
                {navItems.find((item) => isActive(item.href))?.name || 'Geschäftsführer'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Benachrichtigungen */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 rounded-xl text-slate-400 hover:text-brand-blue hover:bg-brand-blue-soft transition"
              >
                <Bell className="w-5 h-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              {notificationsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-[0_16px_48px_rgba(2,118,200,0.12)] border border-brand-blue/10 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-brand-blue/8">
                    <h3 className="text-sm font-black text-slate-800">Benachrichtigungen</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length > 0 ? (
                      notifications.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className="w-full p-3 text-left hover:bg-brand-blue-soft/50 transition border-b border-brand-blue/5 last:border-0"
                        >
                          <p className="text-sm font-semibold text-slate-800">{n.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{n.message}</p>
                        </button>
                      ))
                    ) : (
                      <div className="p-6 text-center text-sm text-slate-400">
                        Keine neuen Benachrichtigungen
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* User Badge */}
            <div className="flex items-center gap-2 pl-3 border-l border-brand-blue/10">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-blue to-brand-blue-2 flex items-center justify-center text-white text-xs font-black">
                {userEmail ? userEmail[0].toUpperCase() : 'A'}
              </div>
            </div>
          </div>
        </header>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
