/**
 * Geschäftsführer-Dashboard
 * Echte KPIs aus Supabase, helles Design passend zur Landing Page
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  Briefcase,
  MessageSquare,
  Package,
  ArrowUpRight,
  FileText,
  Euro,
  Clock,
} from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

interface DashboardData {
  totalPartners: number;
  activePartners: number;
  pendingPartners: number;
  totalEmployees: number;
  activeEmployees: number;
  openChatRequests: number;
  totalRevenue: number;
  monthlyRevenue: number;
  activePackages: number;
  pendingApplications: number;
  recentPartners: Array<{
    id: string;
    companyName: string;
    email: string;
    status: string;
    createdAt: string;
  }>;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    serviceCategory: string;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/geschaeftsfuehrer/dashboard/stats');
        const payload = await response.json();
        if (payload.success) {
          setStats(payload.data);
        } else {
          setError(payload.error || 'Fehler beim Laden');
        }
      } catch (err) {
        setError('Verbindungsfehler');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <p className="text-red-500 font-semibold">{error || 'Fehler beim Laden'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 rounded-xl bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue-hover transition"
          >
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      title: 'Aktive Partner',
      value: stats.activePartners,
      subtitle: `von ${stats.totalPartners} gesamt`,
      icon: Briefcase,
      gradient: 'from-brand-blue to-brand-blue-2',
      bgLight: 'bg-brand-blue-soft',
      textColor: 'text-brand-blue',
    },
    {
      title: 'Mitarbeiter',
      value: stats.activeEmployees,
      subtitle: `von ${stats.totalEmployees} gesamt`,
      icon: Users,
      gradient: 'from-violet-500 to-violet-600',
      bgLight: 'bg-violet-50',
      textColor: 'text-violet-600',
    },
    {
      title: 'Offene Chats',
      value: stats.openChatRequests,
      subtitle: 'unbeantwortet',
      icon: MessageSquare,
      gradient: 'from-amber-500 to-orange-500',
      bgLight: 'bg-amber-50',
      textColor: 'text-amber-600',
    },
    {
      title: 'Neue Bewerbungen',
      value: stats.pendingApplications,
      subtitle: 'warten auf Prüfung',
      icon: FileText,
      gradient: 'from-brand-green to-emerald-500',
      bgLight: 'bg-emerald-50',
      textColor: 'text-brand-green',
    },
  ];

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; label: string }> = {
      Neu: { bg: 'bg-brand-blue-soft', text: 'text-brand-blue', label: 'Neu' },
      'In Bearbeitung': { bg: 'bg-amber-50', text: 'text-amber-600', label: 'In Bearbeitung' },
      Abgeschlossen: { bg: 'bg-emerald-50', text: 'text-brand-green', label: 'Abgeschlossen' },
      Storniert: { bg: 'bg-red-50', text: 'text-red-500', label: 'Storniert' },
      ACTIVE: { bg: 'bg-emerald-50', text: 'text-brand-green', label: 'Aktiv' },
      PENDING: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Ausstehend' },
      SUSPENDED: { bg: 'bg-red-50', text: 'text-red-500', label: 'Gesperrt' },
    };
    const config = map[status] || { bg: 'bg-slate-100', text: 'text-slate-500', label: status };
    return (
      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-bold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getCategoryLabel = (cat: string) => {
    const map: Record<string, string> = {
      PRIVATUMZUG: 'Privatumzug',
      FIRMENUMZUG: 'Firmenumzug',
      'ENTRÜMPELUNG': 'Entrümpelung',
    };
    return map[cat] || cat;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-black text-slate-800">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">
          Überblick über Ihre Plattform
        </p>
      </motion.div>

      {/* KPI Grid */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.title}
              className="bg-white rounded-2xl border border-brand-blue/8 p-5 shadow-[0_2px_12px_rgba(2,118,200,0.06)] hover:shadow-[0_8px_30px_rgba(2,118,200,0.10)] transition-all"
              whileHover={{ y: -3 }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-xl ${kpi.bgLight} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${kpi.textColor}`} />
                </div>
              </div>
              <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{kpi.title}</p>
              <p className="text-3xl font-black text-slate-800 mt-1">{kpi.value}</p>
              <p className="text-xs text-slate-400 mt-1">{kpi.subtitle}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Revenue Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-brand-blue/8 p-6 shadow-[0_2px_12px_rgba(2,118,200,0.06)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-brand-blue-soft flex items-center justify-center">
              <Euro className="w-5 h-5 text-brand-blue" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Gesamtumsatz</p>
          </div>
          <p className="text-3xl font-black text-slate-800">
            €{stats.totalRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-brand-blue/8 p-6 shadow-[0_2px_12px_rgba(2,118,200,0.06)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-brand-green" />
            </div>
            <p className="text-sm font-semibold text-slate-500">Monatlicher Umsatz</p>
          </div>
          <p className="text-3xl font-black text-slate-800">
            €{stats.monthlyRevenue.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Neue Partner */}
        <div className="bg-white rounded-2xl border border-brand-blue/8 p-6 shadow-[0_2px_12px_rgba(2,118,200,0.06)]">
          <h2 className="text-base font-black text-slate-800 mb-4">Neue Partner</h2>
          {stats.recentPartners.length > 0 ? (
            <div className="space-y-3">
              {stats.recentPartners.map((partner) => (
                <div key={partner.id} className="flex items-center justify-between p-3 rounded-xl bg-[#f8fbff] border border-brand-blue/5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{partner.companyName}</p>
                    <p className="text-xs text-slate-400 truncate">{partner.email}</p>
                  </div>
                  {getStatusBadge(partner.status)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">Noch keine Partner vorhanden</p>
          )}
        </div>

        {/* Letzte Kundenanfragen */}
        <div className="bg-white rounded-2xl border border-brand-blue/8 p-6 shadow-[0_2px_12px_rgba(2,118,200,0.06)]">
          <h2 className="text-base font-black text-slate-800 mb-4">Letzte Kundenanfragen</h2>
          {stats.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-[#f8fbff] border border-brand-blue/5">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{order.customerName}</p>
                    <p className="text-xs text-slate-400">{getCategoryLabel(order.serviceCategory)}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    {getStatusBadge(order.status)}
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(order.createdAt).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 py-6 text-center">Noch keine Anfragen vorhanden</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
