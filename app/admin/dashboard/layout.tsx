'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRightLeft,
  Bell,
  ClipboardList,
  Euro,
  LogOut,
  Menu,
  MessageSquare,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
  X,
  LayoutDashboard,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getAdminAccessContext, type AdminAccessLevel } from '@/lib/adminAccess';

type NavItem = {
  id: string;
  label: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
  badge?: string;
};

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [adminName, setAdminName] = useState('Admin');
  const [accessLevel, setAccessLevel] = useState<AdminAccessLevel>('none');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  const navGroups = useMemo(() => ([
    {
      title: 'Dashboard',
      items: [
        { id: 'overview', label: 'Übersicht', icon: LayoutDashboard, href: '/admin/dashboard' },
      ] satisfies NavItem[],
    },
    {
      title: 'Operativ',
      items: [
        { id: 'support', label: 'Support', icon: MessageSquare, href: '/admin/dashboard/chat', badge: chatCount > 0 ? chatCount.toString() : undefined },
        { id: 'calls', label: 'Anrufliste', icon: PhoneCall, href: '/admin/dashboard/anrufliste' },
        { id: 'orders', label: 'Kundenaufträge', icon: ClipboardList, href: '/admin/dashboard/auftraege', adminOnly: true },
      ] satisfies NavItem[],
    },
    {
      title: 'Netzwerk',
      items: [
        { id: 'partner', label: 'Partner-Netzwerk', icon: Users, href: '/admin/dashboard/partner', adminOnly: true },
        { id: 'team', label: 'Team', icon: Users, href: '/admin/dashboard/team', adminOnly: true },
      ] satisfies NavItem[],
    },
    {
      title: 'Finanzen',
      items: [
        { id: 'transactions', label: 'Transaktionen', icon: ArrowRightLeft, href: '/admin/dashboard/transaktionen', adminOnly: true },
        { id: 'revenue', label: 'Einnahmen', icon: Euro, href: '/admin/dashboard/einnahmen', adminOnly: true },
      ] satisfies NavItem[],
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Einstellungen', icon: Settings, href: '/admin/dashboard/settings', adminOnly: true },
      ] satisfies NavItem[],
    },
  ]), [chatCount]);

  const visibleNavGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => !(accessLevel === 'employee' && item.adminOnly)),
        }))
        .filter((group) => group.items.length > 0),
    [accessLevel, navGroups],
  );

  const checkAccess = useCallback(async () => {
    const access = await getAdminAccessContext();

    if (access.level === 'none') {
      router.push('/admin');
      return false;
    }

    setAdminName(access.displayName);
    setAccessLevel(access.level);
    setIsLoading(false);
    return true;
  }, [router]);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(10);
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter((entry) => !entry.is_read).length);
    }
  }, []);

  const fetchChatCount = useCallback(async () => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('session_id, sender, is_read, text')
      .eq('sender', 'user');

    if (error || !data) {
      setChatCount(0);
      return;
    }

    const unresolvedSessions = new Set(
      data
        .filter((message) => {
          const text = String(message.text || '');
          return message.is_read === false && !text.startsWith('WEITERLEITUNG AN MITARBEITER');
        })
        .map((message) => message.session_id),
    );

    setChatCount(unresolvedSessions.size);
  }, []);

  useEffect(() => {
    void checkAccess();
  }, [checkAccess]);

  useEffect(() => {
    if (isLoading) return;

    const employeeBlockedPaths = [
      '/admin/dashboard/auftraege',
      '/admin/dashboard/partner',
      '/admin/dashboard/team',
      '/admin/dashboard/transaktionen',
      '/admin/dashboard/einnahmen',
      '/admin/dashboard/settings',
    ];

    if (accessLevel === 'employee' && employeeBlockedPaths.includes(pathname)) {
      router.replace('/admin/dashboard/anrufliste');
      return;
    }

    void fetchNotifications();
    void fetchChatCount();

    const notificationChannel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications((prev) => [payload.new, ...prev]);
        setUnreadCount((prev) => prev + 1);
      })
      .subscribe();

    const chatChannel = supabase
      .channel('admin-chat-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => {
        void fetchChatCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notificationChannel);
      supabase.removeChannel(chatChannel);
    };
  }, [accessLevel, fetchChatCount, fetchNotifications, isLoading, pathname, router]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications((prev) => prev.map((entry) => (entry.id === id ? { ...entry, is_read: true } : entry)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllNotificationsAsRead = async () => {
    const unreadIds = notifications.filter((entry) => !entry.is_read).map((entry) => entry.id);
    if (unreadIds.length === 0) return;

    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
    setUnreadCount(0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f8fafc]">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSidebarOpen(false)} className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-sm lg:hidden" />
        )}
      </AnimatePresence>

      <aside className={`fixed left-0 top-0 z-50 h-screen border-r border-slate-200 bg-white transition-all duration-500 ease-in-out lg:sticky ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} ${isCollapsed ? 'w-24' : 'w-72'}`}>
        <div className="flex h-full flex-col">
          <div className={`flex items-center p-6 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-brand-green text-white shadow-lg shadow-brand-blue/20">
                <ShieldCheck className="h-6 w-6" />
              </div>
            )}
            <button onClick={() => (isCollapsed ? setIsCollapsed(false) : setIsSidebarOpen(false))} className="text-slate-400 hover:text-slate-600 lg:hidden">
              <X className="h-6 w-6" />
            </button>
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 shadow-inner transition-all hover:bg-white hover:text-brand-blue hover:shadow-sm lg:flex">
              <Menu className="h-5 w-5" />
            </button>
          </div>

          <nav className="custom-scrollbar mt-2 flex-1 space-y-6 overflow-y-auto px-4">
            {visibleNavGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                {!isCollapsed && <p className="mb-2 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{group.title}</p>}
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link key={item.id} href={item.href} className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${isActive ? 'bg-gradient-to-r from-brand-blue to-brand-green text-white shadow-lg shadow-brand-blue/20' : 'text-slate-600 hover:bg-slate-50'} ${isCollapsed ? 'justify-center' : ''}`}>
                      <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-blue'}`} />
                      {!isCollapsed && <span className="text-sm font-bold tracking-tight">{item.label}</span>}
                      {item.badge && !isActive && !isCollapsed && (
                        <span className="absolute right-4 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {item.badge}
                        </span>
                      )}
                      {isActive && !isCollapsed && <motion.div layoutId="active-pill" className="absolute left-0 h-6 w-1 rounded-r-full bg-white" />}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="border-t border-slate-100 bg-white/50 p-6">
            <button onClick={handleLogout} className={`group flex w-full items-center gap-3 rounded-xl border-2 border-red-500/10 bg-red-50/50 px-4 py-3 font-bold text-red-500 transition-all hover:bg-red-500 hover:text-white ${isCollapsed ? 'justify-center p-3' : ''}`}>
              <LogOut className={`h-5 w-5 transition-transform ${isCollapsed ? '' : 'group-hover:translate-x-1'}`} />
              {!isCollapsed && <span>Abmelden</span>}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex min-h-screen min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md lg:px-8">
          <button onClick={() => setIsSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden">
            <Menu className="h-6 w-6" />
          </button>

          <div className="hidden lg:block">
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-800">
              <div className="h-6 w-1.5 rounded-full bg-brand-blue" />
              {visibleNavGroups.flatMap((group) => group.items).find((item) => pathname === item.href)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button onClick={() => setIsNotifOpen(!isNotifOpen)} className={`relative flex h-11 w-11 items-center justify-center rounded-xl transition-all ${isNotifOpen ? 'bg-brand-blue-soft text-brand-blue ring-2 ring-brand-blue/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-brand-blue'}`}>
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white">{unreadCount}</span>}
              </button>

              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" onClick={() => setIsNotifOpen(false)} />
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute right-0 z-50 mt-3 w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl sm:w-80">
                      <div className="flex items-center justify-between border-b border-slate-50 bg-slate-50/50 p-5">
                        <h3 className="font-bold text-slate-800">Benachrichtigungen</h3>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-brand-blue-soft px-2 py-1 text-[10px] font-black uppercase tracking-widest text-brand-blue">{unreadCount} Neu</span>
                          <button type="button" onClick={markAllNotificationsAsRead} className="text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-brand-blue">Alle lesen</button>
                        </div>
                      </div>
                      <div className="custom-scrollbar max-h-[400px] overflow-y-auto overflow-x-hidden">
                        {notifications.length > 0 ? notifications.map((entry) => (
                          <button key={entry.id} onClick={() => { void markAsRead(entry.id); if (entry.link) router.push(entry.link); setIsNotifOpen(false); }} className={`relative flex w-full gap-4 border-b border-slate-50 p-4 text-left transition-colors hover:bg-slate-50 ${!entry.is_read ? 'bg-brand-blue/5' : ''}`}>
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                              <Bell className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm font-bold text-slate-800">{entry.title}</p>
                              <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-slate-500">{entry.message}</p>
                            </div>
                            {!entry.is_read && <span className="absolute right-4 top-4 h-2 w-2 rounded-full bg-brand-blue" />}
                          </button>
                        )) : (
                          <div className="p-10 text-center text-sm font-medium text-slate-400">Keine neuen Meldungen</div>
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            <div className="mx-2 h-8 w-px bg-slate-200" />
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold leading-none text-slate-800">{adminName}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{accessLevel === 'employee' ? 'Mitarbeiter' : 'Administrator'}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-green p-[2px]">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                  <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=005ea6&color=fff`} alt="Admin Avatar" className="h-full w-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
