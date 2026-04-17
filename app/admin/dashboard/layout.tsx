'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  ArrowRightLeft, 
  Euro, 
  MessageSquare, 
  Settings, 
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Bell
} from 'lucide-react';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [adminName, setAdminName] = useState('Admin User');
  
  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [chatCount, setChatCount] = useState(0);

  const navGroups = [
    {
      title: 'Dashboard',
      items: [
        { id: 'overview', label: 'Übersicht', icon: LayoutDashboard, href: '/admin/dashboard' },
      ]
    },
    {
      title: 'Kern-Funktionen',
      items: [
        { id: 'orders', label: 'Kundenaufträge', icon: ClipboardList, href: '/admin/dashboard/auftraege' },
        { id: 'chat', label: 'Support Chat', icon: MessageSquare, href: '/admin/dashboard/chat', badge: chatCount > 0 ? chatCount.toString() : undefined },
      ]
    },
    {
      title: 'Netzwerk',
      items: [
        { id: 'partner', label: 'Partner-Netzwerk', icon: Users, href: '/admin/dashboard/partner' },
        { id: 'team', label: 'Team', icon: Users, href: '/admin/dashboard/team' },
      ]
    },
    {
      title: 'Finanzen',
      items: [
        { id: 'transactions', label: 'Transaktionen', icon: ArrowRightLeft, href: '/admin/dashboard/transaktionen' },
        { id: 'revenue', label: 'Einnahmen', icon: Euro, href: '/admin/dashboard/einnahmen' },
      ]
    },
    {
      title: 'System',
      items: [
        { id: 'settings', label: 'Einstellungen', icon: Settings, href: '/admin/dashboard/settings' },
      ]
    }
  ];

  const checkAdmin = useCallback(async () => {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      router.push('/admin');
      return false;
    }

    const isAdmin = user.app_metadata?.role === 'admin' || user.user_metadata?.role === 'admin';

    if (!isAdmin) {
      await supabase.auth.signOut();
      router.push('/admin');
      return false;
    }

    const fallbackName = user.email?.split('@')[0] || 'Admin User';
    const fullName = user.user_metadata?.full_name || user.user_metadata?.name || fallbackName;
    setAdminName(fullName);
    setIsLoading(false);
    return true;
  }, [router]);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  }, []);

  const fetchChatCount = useCallback(async () => {
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender', 'user')
      .eq('is_read', false);
    
    setChatCount(count || 0);
  }, []);

  useEffect(() => {
    const loadAdmin = async () => {
      await checkAdmin();
    };

    void loadAdmin();
  }, [checkAdmin]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    void fetchNotifications();
    void fetchChatCount();

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    const chatChannel = supabase
      .channel('chat-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        () => {
          fetchChatCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(chatChannel);
    };
  }, [fetchChatCount, fetchNotifications, isLoading]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllNotificationsAsRead = async () => {
    const unreadIds = notifications.filter((notification) => !notification.is_read).map((notification) => notification.id);
    if (unreadIds.length === 0) {
      return;
    }

    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    setNotifications((prev) => prev.map((notification) => ({ ...notification, is_read: true })));
    setUnreadCount(0);
  };


  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar Overlay for Mobile */}
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

      {/* Sidebar */}
      <aside 
        className={`fixed lg:sticky top-0 left-0 h-screen transition-all duration-500 ease-in-out bg-white border-r border-slate-200 z-50 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-24' : 'w-72'}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Toggle Section */}
          <div className={`p-6 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            {!isCollapsed && (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-blue to-brand-green flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                <ShieldCheck className="w-6 h-6" />
              </div>
            )}
            <button 
              onClick={() => isCollapsed ? setIsCollapsed(false) : setIsSidebarOpen(false)}
              className="lg:hidden text-slate-400 hover:text-slate-600"
            >
              <X className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex w-8 h-8 items-center justify-center rounded-lg bg-slate-50 text-slate-400 hover:text-brand-blue hover:bg-white hover:shadow-sm transition-all shadow-inner"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 space-y-6 overflow-y-auto mt-2 custom-scrollbar">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!isCollapsed && (
                  <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">{group.title}</p>
                )}
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative ${
                        isActive 
                          ? 'bg-gradient-to-r from-brand-blue to-brand-green text-white shadow-lg shadow-brand-blue/20' 
                          : 'text-slate-600 hover:bg-slate-50'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-blue'}`} />
                      {!isCollapsed && <span className="font-bold text-sm tracking-tight">{item.label}</span>}
                      {item.badge && !isActive && !isCollapsed && (
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                      {isActive && !isCollapsed && (
                        <motion.div 
                          layoutId="active-pill"
                          className="absolute left-0 w-1 h-6 bg-white rounded-r-full"
                        />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Bottom Sidebar Section */}
          <div className="p-6 border-t border-slate-100 bg-white/50">
            {/* Time and Date */}

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-3 px-4 py-3 border-2 border-red-500/10 text-red-500 rounded-xl font-bold transition-all hover:bg-red-500 hover:text-white group bg-red-50/50 ${isCollapsed ? 'justify-center p-3' : ''}`}
            >
              <LogOut className={`w-5 h-5 ${isCollapsed ? '' : 'group-hover:translate-x-1'} transition-transform`} />
              {!isCollapsed && <span>Abmelden</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="hidden lg:block">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
              <div className="w-1.5 h-6 bg-brand-blue rounded-full"></div>
              {navGroups.flatMap(g => g.items).find(item => pathname === item.href)?.label || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className={`w-11 h-11 flex items-center justify-center rounded-xl transition-all relative ${isNotifOpen ? 'bg-brand-blue-soft text-brand-blue ring-2 ring-brand-blue/20' : 'bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-brand-blue'}`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full ring-2 ring-white flex items-center justify-center animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              <AnimatePresence>
                {isNotifOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40"
                      onClick={() => setIsNotifOpen(false)}
                    />
                     <motion.div 
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 10, scale: 0.95 }}
                       className="absolute right-0 mt-3 w-[calc(100vw-2rem)] sm:w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
                     >
                      <div className="p-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800">Benachrichtigungen</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-brand-blue bg-brand-blue-soft px-2 py-1 rounded-full uppercase tracking-widest">{unreadCount} Neu</span>
                          <button
                            type="button"
                            onClick={markAllNotificationsAsRead}
                            className="text-[10px] font-bold text-slate-500 hover:text-brand-blue transition-colors uppercase tracking-widest"
                          >
                            Alle lesen
                          </button>
                        </div>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto overflow-x-hidden custom-scrollbar">
                        {notifications.length > 0 ? (
                           notifications.map((n) => (
                            <button 
                              key={n.id}
                              onClick={() => {
                                markAsRead(n.id);
                                if (n.link) router.push(n.link);
                                setIsNotifOpen(false);
                              }}
                              className={`w-full p-4 text-left border-b border-slate-50 hover:bg-slate-50 transition-colors relative flex gap-4 ${!n.is_read ? 'bg-brand-blue/5' : ''}`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                n.type === 'NEW_ORDER' ? 'bg-brand-blue/10 text-brand-blue' : 
                                n.type === 'NEW_PARTNER' || n.type === 'PARTNER_APPLICATION' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {n.type === 'NEW_ORDER' ? <ClipboardList className="w-5 h-5" /> : 
                                 n.type === 'NEW_PARTNER' || n.type === 'PARTNER_APPLICATION' ? <Users className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-slate-800 line-clamp-1">{n.title}</p>
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                                <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-wider">{new Date(n.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</p>
                              </div>
                              {!n.is_read && <span className="absolute top-4 right-4 w-2 h-2 bg-brand-blue rounded-full"></span>}
                            </button>
                          ))
                        ) : (
                          <div className="p-10 text-center">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mx-auto mb-3">
                              <Bell className="w-6 h-6" />
                            </div>
                            <p className="text-sm text-slate-400 font-medium">Keine neuen Meldungen</p>
                          </div>
                        )}
                      </div>
                      <button 
                        className="w-full p-4 text-xs font-bold text-slate-400 hover:text-brand-blue transition-colors border-t border-slate-50 hover:bg-slate-50"
                        onClick={() => router.push('/admin/dashboard/auftraege')}
                      >
                        Alle Benachrichtigungen anzeigen
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-800 leading-none">{adminName}</p>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Super Admin</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-green p-[2px]">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                   <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=005ea6&color=fff`} 
                    alt="Admin Avatar"
                    className="w-full h-full object-cover"
                   />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
