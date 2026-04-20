'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BarChart3,
  BellRing,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  DollarSign,
  MessageSquareMore,
  PhoneCall,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getAdminAccessContext, type AdminAccessLevel } from '@/lib/adminAccess';

type DashboardStats = {
  orders: number;
  partners: number;
  pendingPartners: number;
  team: number;
  earnings: number;
  openOrders: number;
  openTopups: number;
  unreadChats: number;
  unreadNotifications: number;
  openPartnerApplications: number;
};

type PriorityItem = {
  key: string;
  label: string;
  value: number;
  hint: string;
  href: string;
  tone: 'blue' | 'amber' | 'green' | 'slate';
};

const priorityToneClasses: Record<PriorityItem['tone'], string> = {
  blue: 'bg-brand-blue-soft text-brand-blue border-brand-blue/15',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

const activityToneClasses = {
  order: 'bg-brand-blue-soft text-brand-blue',
  partner: 'bg-emerald-50 text-emerald-700',
  finance: 'bg-violet-50 text-violet-700',
  system: 'bg-slate-100 text-slate-700',
};

const statusClasses: Record<string, string> = {
  Neu: 'bg-brand-blue-soft text-brand-blue border-brand-blue/15',
  'In Bearbeitung': 'bg-amber-50 text-amber-700 border-amber-200',
  Abgeschlossen: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Storniert: 'bg-red-50 text-red-600 border-red-200',
};

function getStatusClasses(value: string) {
  return statusClasses[value] || 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatCurrency(value: number) {
  return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRelativeDate(value?: string) {
  if (!value) return 'Gerade eben';
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  const diffDays = Math.round(diffHours / 24);
  return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;
}

export default function AdminOverviewPage() {
  const router = useRouter();
  const [accessLevel, setAccessLevel] = useState<AdminAccessLevel>('admin');
  const [stats, setStats] = useState<DashboardStats>({
    orders: 0,
    partners: 0,
    pendingPartners: 0,
    team: 0,
    earnings: 0,
    openOrders: 0,
    openTopups: 0,
    unreadChats: 0,
    unreadNotifications: 0,
    openPartnerApplications: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestOrders, setLatestOrders] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<any[]>([]);

  useEffect(() => {
    void fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError(null);

    try {
      const access = await getAdminAccessContext();
      setAccessLevel(access.level === 'none' ? 'employee' : access.level);

      const [
        { count: ordersCount },
        { count: partnersCount },
        { count: pendingPartnersCount },
        { count: teamCount },
        { data: latestOrdersData },
        { count: openOrdersCount },
        { count: unreadChatsCount },
        { count: unreadNotificationsCount },
        { count: openPartnerApplicationsCount },
        { data: latestNotifications },
        { data: latestApplications },
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('partners').select('*', { count: 'exact', head: true }),
        supabase.from('partners').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('team').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['Neu', 'In Bearbeitung']),
        supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('sender', 'user').eq('is_read', false),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('partner_applications').select('*', { count: 'exact', head: true }).neq('status', 'ARCHIVED'),
        supabase.from('notifications').select('id, title, type, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('partner_applications').select('id, company_name, status, created_at').order('created_at', { ascending: false }).limit(4),
      ]);

      let totalEarnings = 0;
      let openTopups = 0;
      let latestTransactions: any[] = [];

      if (access.level === 'admin') {
        const [{ data: walletTransactions }, { count: openTopupsCount }, { data: transactionFeed }] = await Promise.all([
          supabase.from('wallet_transactions').select('amount').gt('amount', 0),
          supabase.from('wallet_topup_requests').select('*', { count: 'exact', head: true }).in('status', ['REQUESTED', 'IN_REVIEW']),
          supabase.from('transactions').select('id, type, amount, created_at, description').order('created_at', { ascending: false }).limit(4),
        ]);
        totalEarnings = walletTransactions?.reduce((total, entry) => total + Number(entry.amount || 0), 0) || 0;
        openTopups = openTopupsCount || 0;
        latestTransactions = transactionFeed || [];
      }

      setStats({
        orders: ordersCount || 0,
        partners: partnersCount || 0,
        pendingPartners: pendingPartnersCount || 0,
        team: teamCount || 0,
        earnings: totalEarnings,
        openOrders: openOrdersCount || 0,
        openTopups: openTopups,
        unreadChats: unreadChatsCount || 0,
        unreadNotifications: unreadNotificationsCount || 0,
        openPartnerApplications: openPartnerApplicationsCount || 0,
      });
      setLatestOrders(latestOrdersData || []);

      const mergedActivity = [
        ...(latestNotifications || []).map((item) => ({
          id: `notification-${item.id}`,
          title: item.title,
          detail: item.type,
          created_at: item.created_at,
          tone: item.type === 'NEW_ORDER' ? 'order' : item.type === 'NEW_PARTNER' || item.type === 'PARTNER_APPLICATION' ? 'partner' : 'system',
        })),
        ...(access.level === 'admin' ? latestTransactions.map((item) => ({
          id: `transaction-${item.id}`,
          title: item.description || item.type,
          detail: formatCurrency(Math.abs(Number(item.amount || 0))),
          created_at: item.created_at,
          tone: 'finance',
        })) : []),
        ...(latestApplications || []).map((item) => ({
          id: `application-${item.id}`,
          title: `${item.company_name} eingegangen`,
          detail: item.status,
          created_at: item.created_at,
          tone: 'partner',
        })),
      ]
        .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
        .slice(0, 6);

      setActivityFeed(mergedActivity);
    } catch (err: any) {
      setError(err.message || 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }

  const priorities = useMemo<PriorityItem[]>(() => {
    const base = [
      {
        key: 'partnerApplications',
        label: 'Neue Partneranfragen',
        value: stats.openPartnerApplications,
        hint: 'Landingpage- und Netzwerk-Anfragen prüfen',
        href: '/admin/dashboard/anrufliste',
        tone: 'amber' as const,
      },
      {
        key: 'chats',
        label: 'Ungelesene Chats',
        value: stats.unreadChats,
        hint: 'Support-Anfragen ohne Antwort',
        href: '/admin/dashboard/chat',
        tone: 'slate' as const,
      },
    ];

    if (accessLevel === 'admin') {
      return [
        ...base,
        {
          key: 'orders',
          label: 'Offene Kundenaufträge',
          value: stats.openOrders,
          hint: 'Neue und laufende Anfragen priorisieren',
          href: '/admin/dashboard/auftraege',
          tone: 'blue' as const,
        },
        {
          key: 'topups',
          label: 'Offene Guthabenanfragen',
          value: stats.openTopups,
          hint: 'Manuelle Zahlungen prüfen',
          href: '/admin/dashboard/transaktionen',
          tone: 'green' as const,
        },
      ];
    }

    return base;
  }, [accessLevel, stats.openOrders, stats.openPartnerApplications, stats.openTopups, stats.unreadChats]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 p-6 text-red-700">
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-bold">Fehler beim Laden</p>
          <p className="text-sm">{error}</p>
        </div>
        <button onClick={() => void fetchData()} className="ml-auto text-sm font-bold underline">Erneut versuchen</button>
      </div>
    );
  }

  const summaryCards = accessLevel === 'admin'
    ? [
        { label: 'Anfragen gesamt', value: stats.orders, caption: 'Alle eingegangenen Kundenaufträge', icon: BarChart3, chip: 'Kundenaufträge', href: '/admin/dashboard/auftraege' },
        { label: 'Partner aktiv', value: stats.partners, caption: `${stats.pendingPartners} warten auf Freischaltung`, icon: Users, chip: 'Partnernetzwerk', href: '/admin/dashboard/partner' },
        { label: 'Umsatz gesamt', value: formatCurrency(stats.earnings), caption: `${stats.unreadNotifications} neue Benachrichtigungen`, icon: TrendingUp, chip: 'Finanzen', href: '/admin/dashboard/einnahmen' },
        { label: 'Team & Rechte', value: stats.team, caption: 'Rollen und Berechtigungen im Blick', icon: ShieldCheck, chip: 'System', href: '/admin/dashboard/team' },
      ]
    : [
        { label: 'Support offen', value: stats.unreadChats, caption: 'Ungelesene Support-Anfragen', icon: MessageSquareMore, chip: 'Support', href: '/admin/dashboard/chat' },
        { label: 'Anrufliste offen', value: stats.openPartnerApplications, caption: 'Neue Firmenanfragen für die Telefonie', icon: PhoneCall, chip: 'Anrufliste', href: '/admin/dashboard/anrufliste' },
        { label: 'Benachrichtigungen', value: stats.unreadNotifications, caption: 'Neue interne Meldungen', icon: Activity, chip: 'System', href: '/admin/dashboard' },
        { label: 'Team gesamt', value: stats.team, caption: 'Interne Benutzerkonten im System', icon: ShieldCheck, chip: 'Mitarbeiter', href: '/admin/dashboard' },
      ];

  return (
    <div className="space-y-6 pb-10 font-sans text-slate-900">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button key={item.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: index * 0.05 }} onClick={() => router.push(item.href)} className="group relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 text-left shadow-sm">
              <div className="absolute right-6 top-4 rounded-full bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{item.chip}</div>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 text-slate-900 transition-all duration-300 group-hover:bg-slate-900 group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
              <h3 className="mt-1 text-3xl font-bold text-slate-900">{item.value}</h3>
              <p className="mt-1 text-xs font-medium text-slate-400">{item.caption}</p>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Prioritäten heute</h3>
              <p className="mt-1 text-sm text-slate-500">Offene Themen, die im internen Bereich zuerst bearbeitet werden sollten.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
              <BellRing className="h-4 w-4" />
              Live-Übersicht
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {priorities.map((item) => (
              <button key={item.key} onClick={() => router.push(item.href)} className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5 text-left transition-all hover:border-brand-blue/25 hover:bg-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${priorityToneClasses[item.tone]}`}>{item.label}</span>
                    <p className="mt-4 text-3xl font-bold text-slate-900">{item.value}</p>
                    <p className="mt-2 text-sm text-slate-500">{item.hint}</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Aktivitätslog</h3>
              <p className="mt-1 text-sm text-slate-500">Neue Meldungen aus Partnern, Support und System.</p>
            </div>
            <Activity className="h-5 w-5 text-slate-300" />
          </div>

          <div className="space-y-3">
            {activityFeed.length > 0 ? activityFeed.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4">
                <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${activityToneClasses[entry.tone as keyof typeof activityToneClasses] || activityToneClasses.system}`}>
                  {entry.tone === 'order' ? <ClipboardList className="h-5 w-5" /> : entry.tone === 'partner' ? <Users className="h-5 w-5" /> : entry.tone === 'finance' ? <Wallet className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800">{entry.title}</p>
                  <p className="mt-1 text-xs text-slate-500">{entry.detail}</p>
                </div>
                <span className="whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-slate-400">{formatRelativeDate(entry.created_at)}</span>
              </div>
            )) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">Noch keine Aktivität vorhanden.</div>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
          <h3 className="mb-6 text-lg font-bold text-slate-800">Schnellzugriff</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {(accessLevel === 'admin'
              ? [
                  { label: 'Partner prüfen', sublabel: 'Registrierungen & Freischaltungen', icon: Users, href: '/admin/dashboard/partner' },
                  { label: 'Preise anpassen', sublabel: 'Einnahmen und Preislogik', icon: DollarSign, href: '/admin/dashboard/einnahmen' },
                  { label: 'Aufträge verwalten', sublabel: 'Offene Kundenanfragen', icon: ClipboardList, href: '/admin/dashboard/auftraege' },
                  { label: 'Chats beantworten', sublabel: 'Support in Echtzeit', icon: MessageSquareMore, href: '/admin/dashboard/chat' },
                ]
              : [
                  { label: 'Anrufliste öffnen', sublabel: 'Firmenanfragen strukturiert abarbeiten', icon: PhoneCall, href: '/admin/dashboard/anrufliste' },
                  { label: 'Chats beantworten', sublabel: 'Support in Echtzeit', icon: MessageSquareMore, href: '/admin/dashboard/chat' },
                ]).map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.label} onClick={() => router.push(item.href)} className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 text-left transition-all hover:border-slate-900">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-900 transition-all duration-300 group-hover:bg-slate-900 group-hover:text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{item.label}</p>
                    <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">{item.sublabel}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-slate-900" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
          <h3 className="mb-6 text-lg font-bold text-slate-800">{accessLevel === 'admin' ? 'Systemstatus' : 'Operativer Status'}</h3>
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{accessLevel === 'admin' ? 'Registrierte Partner' : 'Firmenanfragen'}</span>
                <span className="text-xs font-bold text-slate-800">{accessLevel === 'admin' ? `${stats.partners} Partner` : `${stats.openPartnerApplications} offen`}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-brand-blue" style={{ width: `${Math.min(100, accessLevel === 'admin' ? stats.partners : stats.openPartnerApplications * 8)}%` }} />
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{accessLevel === 'admin' ? 'Offene Kundenaufträge' : 'Chat-Rückstau'}</span>
                <span className="text-xs font-bold text-slate-800">{accessLevel === 'admin' ? `${stats.openOrders} offen` : `${stats.unreadChats} ungelesen`}</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, (accessLevel === 'admin' ? stats.openOrders : stats.unreadChats) * 10)}%` }} />
              </div>
            </div>

            <div className="pt-2">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Benachrichtigungen</span>
                <span className="text-xs font-bold text-slate-800">{stats.unreadNotifications} neu</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, stats.unreadNotifications * 12)}%` }} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {accessLevel === 'admin' && (
        <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <div className="flex items-center justify-between p-8 pb-4">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Aktuelle Kundenaufträge</h3>
              <p className="mt-1 text-sm text-slate-500">Status-Badges und Prioritätensicht sind mit dem Rest des internen Bereichs vereinheitlicht.</p>
            </div>
            <button onClick={() => router.push('/admin/dashboard/auftraege')} className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-900">
              Alle anzeigen <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto px-8 pb-8">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="w-[25%] py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Name / E-Mail</th>
                  <th className="w-[15%] py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Leistung</th>
                  <th className="w-[25%] py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Stadt</th>
                  <th className="w-[15%] py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Datum</th>
                  <th className="w-[10%] py-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Status</th>
                  <th className="w-[10%] py-4 text-right text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {latestOrders.map((order) => (
                  <tr key={order.id} className="group transition-colors hover:bg-slate-50/50">
                    <td className="py-6 pr-4">
                      <p className="text-sm font-bold text-slate-800">{order.customer_name}</p>
                      <p className="mt-1 text-[11px] text-slate-400">{order.customer_email}</p>
                      <p className="text-[10px] font-medium text-slate-400">{order.customer_phone}</p>
                    </td>
                    <td className="py-6">
                      <span className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${order.service_category === 'PRIVATUMZUG' ? 'border-brand-blue/15 bg-brand-blue-soft text-brand-blue' : order.service_category === 'FIRMENUMZUG' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                        {order.service_category}
                      </span>
                    </td>
                    <td className="py-6">
                      <p className="text-sm font-medium text-slate-700">{order.von_city}{order.nach_city ? ` / ${order.nach_city}` : ''}</p>
                    </td>
                    <td className="py-6">
                      <p className="text-sm font-medium text-slate-700">{order.move_date ? new Date(order.move_date).toLocaleDateString('de-DE') : '—'}</p>
                      <p className="mt-0.5 text-[10px] text-slate-400">{new Date(order.created_at).toLocaleDateString('de-DE')}</p>
                    </td>
                    <td className="py-6">
                      <span className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-bold tracking-wider ${getStatusClasses(order.status)}`}>{order.status}</span>
                    </td>
                    <td className="py-6 text-right">
                      <button onClick={() => router.push('/admin/dashboard/auftraege')} className="ml-auto flex items-center gap-1 text-[11px] font-bold text-slate-400 transition-colors hover:text-brand-blue">
                        Details <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {latestOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm font-medium italic text-slate-400">Keine aktuellen Kundenaufträge vorhanden.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
