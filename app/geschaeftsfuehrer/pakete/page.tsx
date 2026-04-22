/**
 * Paketverwaltung
 * Echte Daten aus Supabase packages-Tabelle, helles Design
 */

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Zap, Crown, Rocket } from 'lucide-react';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

interface PackageRow {
  id: string;
  name: string;
  monthlyPrice: number;
  leadLimitMonthly: number;
  priority: number;
  releaseDelaySeconds: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function PackagePage() {
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/geschaeftsfuehrer/pakete/list');
        const json = await res.json();
        setPackages(json.data || []);
      } catch { /* empty */ } finally { setLoading(false); }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-3 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  const getPackageIcon = (name: string) => {
    if (name.toLowerCase().includes('business')) return Rocket;
    if (name.toLowerCase().includes('premium')) return Crown;
    return Zap;
  };

  const getPackageGradient = (name: string) => {
    if (name.toLowerCase().includes('business')) return 'from-violet-500 to-purple-600';
    if (name.toLowerCase().includes('premium')) return 'from-brand-blue to-brand-blue-2';
    return 'from-brand-green to-emerald-500';
  };

  const formatDelay = (seconds: number) => {
    if (seconds === 0) return 'Sofort';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} Min.`;
    return `${Math.round(seconds / 3600)} Std.`;
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-black text-slate-800">Paketverwaltung</h1>
        <p className="text-slate-500 text-sm mt-1">
          {packages.filter((p) => p.isActive).length} aktive Pakete
        </p>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {packages.map((pkg) => {
          const Icon = getPackageIcon(pkg.name);
          const gradient = getPackageGradient(pkg.name);

          return (
            <motion.div
              key={pkg.id}
              className="bg-white rounded-2xl border border-brand-blue/8 overflow-hidden shadow-[0_2px_12px_rgba(2,118,200,0.06)] hover:shadow-[0_8px_30px_rgba(2,118,200,0.10)] transition-all"
              whileHover={{ y: -3 }}
            >
              {/* Header mit Gradient */}
              <div className={`bg-gradient-to-r ${gradient} p-5`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{pkg.name}</h3>
                      <p className="text-white/70 text-xs">Paket-Code: {pkg.id}</p>
                    </div>
                  </div>
                  {pkg.isActive ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-white/20 text-white">
                      <Eye className="w-3 h-3" /> Aktiv
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-black/20 text-white/70">
                      <EyeOff className="w-3 h-3" /> Inaktiv
                    </span>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-3xl font-black text-slate-800">
                    €{pkg.monthlyPrice.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-400">pro Monat</p>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Lead-Limit / Monat</span>
                    <span className="font-bold text-slate-800">{pkg.leadLimitMonthly}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Priorität</span>
                    <span className="font-bold text-slate-800">{pkg.priority}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Freigabe-Verzögerung</span>
                    <span className="font-bold text-slate-800">{formatDelay(pkg.releaseDelaySeconds)}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {packages.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-sm">Noch keine Pakete konfiguriert</p>
        </div>
      )}
    </motion.div>
  );
}
