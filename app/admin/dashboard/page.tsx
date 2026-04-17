'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
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
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

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
  ACTIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
  SUSPENDED: 'bg-red-50 text-red-600 border-red-200',
  REQUESTED: 'bg-brand-blue-soft text-brand-blue border-brand-blue/15',
  IN_REVIEW: 'bg-amber-50 text-amber-700 border-amber-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  CANCELLED: 'bg-red-50 text-red-600 border-red-200',
};

function getStatusClasses(value: string) {
  return statusClasses[value] || 'bg-slate-100 text-slate-700 border-slate-200';
}

function formatCurrency(value: number) {
  return `€${value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatRelativeDate(value?: string) {
  if (!value) {
    return 'Gerade eben';
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));

  if (diffMinutes < 60) {
    return `vor ${diffMinutes} Min.`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `vor ${diffHours} Std.`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;
}

export default function AdminOverviewPage() {
  const router = useRouter();
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
      const [
        { count: ordersCount },
        { count: partnersCount },
        { count: pendingPartnersCount },
        { count: teamCount },
        { data: walletTransactions },
        { data: latestOrdersData },
        { count: openOrdersCount },
        { count: openTopupsCount },
        { count: unreadChatsCount },
        { count: unreadNotificationsCount },
        { count: openPartnerApplicationsCount },
        { data: latestNotifications },
        { data: latestTransactions },
        { data: latestApplications },
      ] = await Promise.all([
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('partners').select('*', { count: 'exact', head: true }),
        supabase.from('partners').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('team').select('*', { count: 'exact', head: true }),
        supabase.from('wallet_transactions').select('amount').gt('amount', 0),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5),
        supabase.from('orders').select('*', { count: 'exact', head: true }).in('status', ['Neu', 'In Bearbeitung']),
        supabase.from('wallet_topup_requests').select('*', { count: 'exact', head: true }).in('status', ['REQUESTED', 'IN_REVIEW']),
        supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('sender', 'user').eq('is_read', false),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabase.from('partner_applications').select('*', { count: 'exact', head: true }).neq('status', 'ARCHIVED'),
        supabase.from('notifications').select('id, title, type, created_at').order('created_at', { ascending: false }).limit(4),
        supabase.from('transactions').select('id, type, amount, created_at, description').order('created_at', { ascending: false }).limit(4),
        supabase.from('partner_applications').select('id, company_name, status, created_at').order('created_at', { ascending: false }).limit(4),
      ]);

      const totalEarnings = walletTransactions?.reduce((total, entry) => total + Number(entry.amount || 0), 0) || 0;

      setStats({
        orders: ordersCount || 0,
        partners: partnersCount || 0,
        pendingPartners: pendingPartnersCount || 0,
        team: teamCount || 0,
        earnings: totalEarnings,
        openOrders: openOrdersCount || 0,
        openTopups: openTopupsCount || 0,
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
        ...(latestTransactions || []).map((item) => ({
          id: `transaction-${item.id}`,
          title: item.description || item.type,
          detail: formatCurrency(Math.abs(Number(item.amount || 0))),
          created_at: item.created_at,
          tone: 'finance',
        })),
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

  const priorities = useMemo<PriorityItem[]>(
    () => [
      {
        key: 'partnerApplications',
        label: 'Neue Partneranfragen',
        value: stats.openPartnerApplications,
        hint: 'Landingpage- und Netzwerk-Anfragen prüfen',
        href: '/admin/dashboard/partner',
        tone: 'amber',
      },
      {
        key: 'orders',
        label: 'Offene Kundenaufträge',
        value: stats.openOrders,
        hint: 'Neue und laufende Anfragen priorisieren',
        href: '/admin/dashboard/auftraege',
        tone: 'blue',
      },
      {
        key: 'topups',
        label: 'Offene Guthabenanfragen',
        value: stats.openTopups,
        hint: 'Manuelle Zahlungen prüfen',
        href: '/admin/dashboard/transaktionen',
        tone: 'green',
      },
      {
        key: 'chats',
        label: 'Ungelesene Chats',
        value: stats.unreadChats,
        hint: 'Support-Anfragen ohne Antwort',
        href: '/admin/dashboard/chat',
        tone: 'slate',
      },
    ],
    [stats.openOrders, stats.openPartnerApplications, stats.openTopups, stats.unreadChats],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-6 bg-red-50 rounded-2xl border border-red-100 text-red-700">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <div>
          <p className="font-bold">Fehler beim Laden</p>
          <p className="text-sm">{error}</p>
        </div>
        <button onClick={fetchData} className="ml-auto text-sm font-bold underline">
          Erneut versuchen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-slate-900 pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Anfragen gesamt',
            value: stats.orders,
            caption: 'Alle eingegangenen Kundenaufträge',
            icon: BarChart3,
            chip: 'Kundenaufträge',
            href: '/admin/dashboard/auftraege',
          },
          {
            label: 'Partner aktiv',
            value: stats.partners,
            caption: `${stats.pendingPartners} warten auf Freischaltung`,
            icon: Users,
            chip: 'Partnernetzwerk',
            href: '/admin/dashboard/partner',
          },
          {
            label: 'Umsatz gesamt',
            value: formatCurrency(stats.earnings),
            caption: `${stats.unreadNotifications} neue Benachrichtigungen`,
            icon: TrendingUp,
            chip: 'Finanzen',
            href: '/admin/dashboard/einnahmen',
          },
          {
            label: 'Team & Rechte',
            value: stats.team,
            caption: 'Admin-Berechtigungen im Blick',
            icon: ShieldCheck,
            chip: 'System',
            href: '/admin/dashboard/team',
          },
        ].map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.button
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
              onClick={() => router.push(item.href)}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group text-left"
            >
              <div className="absolute top-4 right-6 px-3 py-1 bg-slate-50 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {item.chip}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-900 mb-6 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{item.value}</h3>
              <p className="text-xs text-slate-400 mt-1 font-medium">{item.caption}</p>
            </motion.button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
        <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Prioritäten heute</h3>
              <p className="text-sm text-slate-500 mt-1">Offene Themen, die im Admin zuerst bearbeitet werden sollten.</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <BellRing className="w-4 h-4" />
              Live-Übersicht
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {priorities.map((item) => (
              <button
                key={item.key}
                onClick={() => router.push(item.href)}
                className="rounded-[1.5rem] border border-slate-100 bg-slate-50/70 p-5 text-left hover:border-brand-blue/25 hover:bg-white transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${priorityToneClasses[item.tone]}`}>
                      {item.label}
                    </span>
                    <p className="text-3xl font-bold text-slate-900 mt-4">{item.value}</p>
                    <p className="text-sm text-slate-500 mt-2">{item.hint}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">Aktivitätslog</h3>
              <p className="text-sm text-slate-500 mt-1">Neue Meldungen aus Partnern, Finanzen und System.</p>
            </div>
            <Activity className="w-5 h-5 text-slate-300" />
          </div>

          <div className="space-y-3">
            {activityFeed.length > 0 ? (
              activityFeed.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4">
                  <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl ${activityToneClasses[entry.tone as keyof typeof activityToneClasses] || activityToneClasses.system}`}>
                    {entry.tone === 'order' ? (
                      <ClipboardList className="w-5 h-5" />
                    ) : entry.tone === 'partner' ? (
                      <Users className="w-5 h-5" />
                    ) : entry.tone === 'finance' ? (
                      <Wallet className="w-5 h-5" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-800">{entry.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{entry.detail}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    {formatRelativeDate(entry.created_at)}
                  </span>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
                Noch keine Aktivität vorhanden.
              </div>
            )}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Schnellzugriff</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Partner prüfen', sublabel: 'Registrierungen & Freischaltungen', icon: Users, href: '/admin/dashboard/partner' },
              { label: 'Preise anpassen', sublabel: 'Einnahmen und Preislogik', icon: DollarSign, href: '/admin/dashboard/einnahmen' },
              { label: 'Aufträge verwalten', sublabel: 'Offene Kundenanfragen', icon: ClipboardList, href: '/admin/dashboard/auftraege' },
              { label: 'Chats beantworten', sublabel: 'Support in Echtzeit', icon: MessageSquareMore, href: '/admin/dashboard/chat' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 text-left hover:border-slate-900 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900 flex-shrink-0 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{item.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-medium uppercase tracking-wider">{item.sublabel}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Systemstatus</h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Registrierte Partner</span>
                <span className="text-xs font-bold text-slate-800">{stats.partners} Partner</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-blue rounded-full" style={{ width: `${Math.min(100, stats.partners)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Offene Kundenaufträge</span>
                <span className="text-xs font-bold text-slate-800">{stats.openOrders} offen</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, stats.openOrders * 8)}%` }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Chat-Rückstau</span>
                <span className="text-xs font-bold text-slate-800">{stats.unreadChats} ungelesen</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, stats.unreadChats * 12)}%` }} />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Datenbankstatus</span>
              <span className="text-[10px] font-bold text-[#00b67a] uppercase tracking-widest bg-[#00b67a]/10 px-2 py-0.5 rounded">
                Verbunden
              </span>
            </div>
          </div>
        </section>
      </div>

      <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 pb-4 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Aktuelle Kundenaufträge</h3>
            <p className="text-sm text-slate-500 mt-1">Status-Badges und Prioritätensicht sind mit dem Rest des Admin-Bereichs vereinheitlicht.</p>
          </div>
          <button
            onClick={() => router.push('/admin/dashboard/auftraege')}
            className="text-slate-400 text-[11px] font-bold hover:text-slate-900 transition-colors flex items-center gap-1 uppercase tracking-widest"
          >
            Alle anzeigen <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto px-8 pb-8">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[25%]">Name / E-Mail</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[15%]">Leistung</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[25%]">Stadt</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[15%]">Datum</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[10%]">Status</th>
                <th className="py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] w-[10%] text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {latestOrders.map((order) => (
                <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                  <td className="py-6 pr-4">
                    <p className="text-sm font-bold text-slate-800">{order.customer_name}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{order.customer_email}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{order.customer_phone}</p>
                  </td>
                  <td className="py-6">
                    <span
                      className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
                        order.service_category === 'PRIVATUMZUG'
                          ? 'bg-brand-blue-soft text-brand-blue border-brand-blue/15'
                          : order.service_category === 'FIRMENUMZUG'
                            ? 'bg-violet-50 text-violet-700 border-violet-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {order.service_category}
                    </span>
                  </td>
                  <td className="py-6">
                    <p className="text-sm font-medium text-slate-700">
                      {order.von_city}
                      {order.nach_city ? ` → ${order.nach_city}` : ''}
                    </p>
                  </td>
                  <td className="py-6">
                    <p className="text-sm font-medium text-slate-700">
                      {order.move_date ? new Date(order.move_date).toLocaleDateString('de-DE') : '—'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{new Date(order.created_at).toLocaleDateString('de-DE')}</p>
                  </td>
                  <td className="py-6">
                    <span className={`inline-flex rounded-xl border px-3 py-1.5 text-[10px] font-bold tracking-wider ${getStatusClasses(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="py-6 text-right">
                    <button
                      onClick={() => router.push('/admin/dashboard/auftraege')}
                      className="text-[11px] font-bold text-slate-400 hover:text-brand-blue transition-colors flex items-center gap-1 ml-auto whitespace-nowrap"
                    >
                      Details <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {latestOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 text-sm italic font-medium">
                    Keine aktuellen Kundenaufträge vorhanden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
