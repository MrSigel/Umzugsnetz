'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Globe2,
  Handshake,
  LogOut,
  Mail,
  MapPin,
  Menu,
  Package,
  Phone,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  User2,
  Wallet,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ToastProvider';

type PartnerSectionId = 'overview' | 'marketplace' | 'myleads' | 'wallet' | 'profile';

type DashboardData = {
  partner: {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    regions: string | null;
    service: string | null;
    status: string | null;
    category: string | null;
    balance: number;
    bonus_tokens: number;
    bonus_tokens_claimed_at: string | null;
    package_code: string | null;
    verification_status: string | null;
    lead_limit_monthly: number;
    lead_limit_used: number;
    is_available: boolean;
    website_url: string | null;
    settings: Record<string, unknown> | null;
    created_at: string | null;
  };
  profile: {
    full_name: string | null;
    email: string | null;
    phone: string | null;
  };
  serviceRegions: Array<{ id: string; city: string | null; postal_code: string | null; radius_km: number | null; country_code: string | null }>;
  partnerServices: string[];
  pricingTier: { id: string; alias: string; label: string; name: string; price: number } | null;
  pricingConfig: {
    umzug: Array<{ id: string; alias: string; label: string; name: string; price: number }>;
    entruempelung: Array<{ id: string; alias: string; label: string; name: string; price: number }>;
  };
  billingSettings: { beneficiary: string; iban: string; bic: string; note: string };
  minTopupAmount: number;
  kpis: {
    balance: number;
    bonus_tokens: number;
    purchases_this_month: number;
    purchases_total: number;
    won_this_month: number;
    open_leads_available: number;
    conversion_rate: number;
  };
  marketplace: Array<{
    id: string;
    order_number: string | null;
    service_category: string | null;
    move_date: string | null;
    von_city_masked: string;
    nach_city_masked: string;
    von_plz_masked: string | null;
    nach_plz_masked: string | null;
    size_info: string | null;
    rooms_info: string | null;
    sqm: string | null;
    additional_services: string[] | null;
    erreichbarkeit: string | null;
    estimated_price: number | string | null;
    status: string | null;
    created_at: string | null;
    price: number;
  }>;
  myLeads: Array<{
    id: string;
    purchase_id: string;
    purchase_price: number;
    purchased_at: string;
    order_number: string | null;
    service_category: string | null;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    move_date: string | null;
    von_city: string | null;
    von_address: string | null;
    von_plz: string | null;
    von_floor: string | null;
    von_lift: boolean | null;
    nach_city: string | null;
    nach_address: string | null;
    nach_plz: string | null;
    nach_floor: string | null;
    nach_lift: boolean | null;
    size_info: string | null;
    rooms_info: string | null;
    sqm: string | null;
    additional_services: string[] | null;
    notes: string | null;
    erreichbarkeit: string | null;
    estimated_price: number | string | null;
    status: string | null;
    created_at: string | null;
  }>;
  walletTransactions: Array<{ id: string; type: string | null; amount: number | string | null; description: string | null; created_at: string | null }>;
  topupRequests: Array<{ id: string; reference: string; amount: number | string; payment_method: string | null; note: string | null; status: string; created_at: string | null; processed_at: string | null }>;
  notifications: Array<{ id: string; title: string | null; message: string | null; link: string | null; is_read: boolean | null; created_at: string | null }>;
  packages: Array<{
    code: 'FREE' | 'PREMIUM' | 'BUSINESS';
    name: string;
    monthly_price: number;
    lead_limit_monthly: number;
    priority: number;
    release_delay_seconds: number;
    purchasable: boolean;
  }>;
  subscription: {
    id: string;
    package_code: string;
    provider: string | null;
    external_reference: string | null;
    status: string;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  } | null;
  stripeConfigured: boolean;
};

const NAV_ITEMS: Array<{ id: PartnerSectionId; label: string; icon: typeof Gauge }> = [
  { id: 'overview', label: 'Übersicht', icon: Gauge },
  { id: 'marketplace', label: 'Marktplatz', icon: ShoppingBag },
  { id: 'myleads', label: 'Meine Anfragen', icon: Truck },
  { id: 'wallet', label: 'Guthaben', icon: Wallet },
  { id: 'profile', label: 'Profil', icon: User2 },
];

const SECTION_DESCRIPTIONS: Record<PartnerSectionId, { title: string; subtitle: string }> = {
  overview: {
    title: 'Übersicht',
    subtitle: 'Ihre wichtigsten Kennzahlen, neue Anfragen und Status auf einen Blick.',
  },
  marketplace: {
    title: 'Marktplatz',
    subtitle: 'Verfügbare Kundenanfragen aus Ihrer Region. Kaufen Sie passende Anfragen mit einem Klick.',
  },
  myleads: {
    title: 'Meine Anfragen',
    subtitle: 'Alle gekauften Anfragen mit vollständigen Kontaktdaten und Bearbeitungsstatus.',
  },
  wallet: {
    title: 'Guthaben & Aufladung',
    subtitle: 'Aktueller Kontostand, Aufladungen und Transaktionen.',
  },
  profile: {
    title: 'Firmenprofil',
    subtitle: 'Kontaktdaten, Einsatzgebiet, Leistungen und Benachrichtigungen.',
  },
};

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

function formatCurrency(value: unknown) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value));
  } catch {
    return '-';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return '-';
  }
}

function serviceLabel(value?: string | null) {
  const code = String(value || '').toUpperCase();
  if (code === 'PRIVATUMZUG') return 'Privatumzug';
  if (code === 'FIRMENUMZUG') return 'Firmenumzug';
  if (code === 'ENTRÜMPELUNG' || code === 'ENTRUEMPELUNG') return 'Entrümpelung';
  if (code === 'UMZUG') return 'Umzug';
  return value || '-';
}

function statusLabel(value?: string | null) {
  const status = String(value || '').trim();
  if (status === 'Neu') return 'Neu';
  if (status === 'In Bearbeitung') return 'In Bearbeitung';
  if (status === 'Abgeschlossen') return 'Abgeschlossen';
  if (status === 'Storniert') return 'Storniert';
  return status || 'Neu';
}

function statusToneClass(value?: string | null) {
  const status = String(value || '');
  if (status === 'Abgeschlossen') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'Storniert') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'In Bearbeitung') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-brand-blue/15 bg-brand-blue/10 text-brand-blue';
}

function partnerStatusLabel(value?: string | null) {
  const status = String(value || '').toUpperCase();
  if (status === 'ACTIVE') return 'Aktiv';
  if (status === 'PENDING') return 'In Prüfung';
  if (status === 'SUSPENDED') return 'Pausiert';
  return value || '-';
}

function verificationLabel(value?: string | null) {
  const status = String(value || '').toUpperCase();
  if (status === 'VERIFIED') return 'Verifiziert';
  if (status === 'MANUAL_REVIEW') return 'Wird geprüft';
  if (status === 'REJECTED') return 'Abgelehnt';
  if (status === 'SUSPENDED') return 'Pausiert';
  return 'Ausstehend';
}

function transactionLabel(value?: string | null) {
  const type = String(value || '').toUpperCase();
  if (type === 'TOPUP') return 'Aufladung';
  if (type === 'LEAD_PURCHASE') return 'Anfrage gekauft';
  if (type === 'ADMIN_CREDIT') return 'Gutschrift';
  if (type === 'REFUND') return 'Erstattung';
  if (type === 'BONUS_CREDIT') return 'Startbonus';
  if (type === 'TOKEN_REDEMPTION') return 'Bonus eingelöst';
  return value || '-';
}

function topupStatusLabel(value?: string | null) {
  const status = String(value || '').toUpperCase();
  if (status === 'REQUESTED') return 'Eingegangen';
  if (status === 'IN_REVIEW') return 'In Prüfung';
  if (status === 'COMPLETED') return 'Abgeschlossen';
  if (status === 'CANCELLED') return 'Storniert';
  return value || '-';
}

function StatusBadge({ label, tone }: { label: string; tone?: string }) {
  return <span className={cx('inline-flex rounded-full border px-3 py-1 text-xs font-black', tone || 'border-slate-200 bg-slate-100 text-slate-700')}>{label}</span>;
}

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">{title}</h2>
          {description ? <p className="mt-1 text-sm font-medium text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'blue',
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: 'blue' | 'emerald' | 'amber' | 'slate';
}) {
  const toneMap = {
    blue: 'border-brand-blue/15 bg-brand-blue/10 text-brand-blue',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    slate: 'border-slate-200 bg-slate-100 text-slate-700',
  } as const;

  return (
    <div className="relative overflow-hidden rounded-[1.7rem] border border-white/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-brand-blue/8 blur-3xl" />
      <div className={cx('relative flex h-12 w-12 items-center justify-center rounded-2xl border', toneMap[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="relative mt-5 text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="relative mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      {hint ? <p className="relative mt-2 text-sm font-semibold text-slate-500">{hint}</p> : null}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[1.7rem] border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center">
      <p className="text-base font-black text-slate-800">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(2,118,200,0.12),transparent_28%),linear-gradient(180deg,#f6f9fc,#eef4f8)] p-6">
      <div className="rounded-[2rem] border border-white/80 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <Image src="/logo_transparent.png" alt="Umzugsnetz" width={180} height={44} className="mx-auto h-11 w-auto" priority />
        <p className="mt-5 font-black text-slate-950">Lädt Partner-Dashboard...</p>
      </div>
    </main>
  );
}

function ErrorState({ message, redirectTo }: { message: string; redirectTo?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(2,118,200,0.12),transparent_28%),linear-gradient(180deg,#f6f9fc,#eef4f8)] p-6">
      <div className="w-full max-w-md rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <Image src="/logo_transparent.png" alt="Umzugsnetz" width={180} height={44} className="mx-auto h-11 w-auto" priority />
        <p className="mt-5 font-black text-slate-950">{message}</p>
        {redirectTo ? (
          <Link href={redirectTo} className="mt-6 inline-flex rounded-2xl bg-brand-blue px-6 py-3 text-sm font-black text-white">
            Weiter
          </Link>
        ) : null}
      </div>
    </main>
  );
}

export function PartnerDashboard() {
  const { showToast } = useToast();
  const [section, setSection] = useState<PartnerSectionId>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState<{ message: string; redirectTo?: string } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [topupNote, setTopupNote] = useState('');
  const [profileForm, setProfileForm] = useState({ phone: '', websiteUrl: '', emailNotif: true, smsNotif: false, smsNumber: '' });
  const [statusDraft, setStatusDraft] = useState<Record<string, { status: string; notes: string }>>({});

  const loadDashboard = useCallback(
    async (token: string | null) => {
      if (!token) return;
      try {
        const response = await fetch('/api/partner/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (payload?.redirectTo) {
            setErrorState({ message: payload?.error || 'Dashboard nicht verfügbar.', redirectTo: payload.redirectTo });
            return;
          }
          throw new Error(payload?.error || 'Daten konnten nicht geladen werden.');
        }
        setData(payload as DashboardData);
        setErrorState(null);
        setProfileForm({
          phone: payload.partner?.phone || payload.profile?.phone || '',
          websiteUrl: payload.partner?.website_url || '',
          emailNotif: Boolean(payload.partner?.settings?.emailNotif ?? true),
          smsNotif: Boolean(payload.partner?.settings?.smsNotif ?? false),
          smsNumber: String(payload.partner?.settings?.smsNumber || payload.partner?.phone || ''),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Daten konnten nicht geladen werden.';
        setErrorState({ message });
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const topup = params.get('topup');
    const pkg = params.get('package');
    if (!topup && !pkg) return;
    if (topup === 'success') {
      showToast('success', 'Aufladung erfolgreich', 'Stripe verarbeitet die Zahlung. Das Guthaben erscheint in wenigen Sekunden.');
    } else if (topup === 'cancel') {
      showToast('info', 'Aufladung abgebrochen', 'Die Zahlung wurde nicht abgeschlossen.');
    }
    if (pkg === 'success') {
      showToast('success', 'Paket gebucht', 'Stripe verarbeitet Ihr Abonnement. Das aktive Paket erscheint in wenigen Sekunden.');
    } else if (pkg === 'cancel') {
      showToast('info', 'Buchung abgebrochen', 'Das Paket wurde nicht aktiviert.');
    }
    params.delete('topup');
    params.delete('package');
    params.delete('session_id');
    const cleaned = params.toString();
    const url = `${window.location.pathname}${cleaned ? `?${cleaned}` : ''}`;
    window.history.replaceState({}, '', url);
  }, [showToast]);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        const { data: session, error } = await supabase.auth.getSession();
        if (error) throw error;
        const token = session.session?.access_token || null;
        if (!token) {
          if (mounted) setErrorState({ message: 'Sitzung abgelaufen.', redirectTo: '/login' });
          if (mounted) setLoading(false);
          return;
        }
        if (mounted) setAccessToken(token);
        await loadDashboard(token);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Sitzung konnte nicht geladen werden.';
        if (mounted) {
          setErrorState({ message, redirectTo: '/login' });
          setLoading(false);
        }
      }
    };
    void init();
    return () => {
      mounted = false;
    };
  }, [loadDashboard]);

  const performAction = useCallback(
    async (action: string, body: Record<string, unknown>, key?: string) => {
      if (!accessToken) {
        showToast('error', 'Sitzung abgelaufen', 'Bitte erneut anmelden.');
        return null;
      }
      setActionInFlight(key || action);
      try {
        const response = await fetch('/api/partner/dashboard', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ action, ...body }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.error || 'Aktion fehlgeschlagen.');
        }
        return payload as Record<string, unknown>;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Aktion fehlgeschlagen.';
        showToast('error', 'Aktion fehlgeschlagen', message);
        return null;
      } finally {
        setActionInFlight(null);
      }
    },
    [accessToken, showToast],
  );

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  }, []);

  const handlePurchase = useCallback(
    async (orderId: string, price: number) => {
      if (!confirm(`Möchten Sie diese Anfrage für ${formatCurrency(price)} kaufen?`)) return;
      const result = await performAction('purchase_lead', { orderId }, `purchase:${orderId}`);
      if (result) {
        showToast('success', 'Anfrage gekauft', 'Die Kontaktdaten sind nun unter "Meine Anfragen" verfügbar.');
        await loadDashboard(accessToken);
        setSection('myleads');
      }
    },
    [accessToken, loadDashboard, performAction, showToast],
  );

  const handleStatusUpdate = useCallback(
    async (orderId: string) => {
      const draft = statusDraft[orderId];
      if (!draft || !draft.status) {
        showToast('warning', 'Bitte Status auswählen', 'Wählen Sie einen Status, bevor Sie speichern.');
        return;
      }
      const result = await performAction('update_status', { orderId, status: draft.status, notes: draft.notes || '' }, `status:${orderId}`);
      if (result) {
        showToast('success', 'Status aktualisiert', `Neuer Status: ${draft.status}`);
        setStatusDraft((current) => {
          const next = { ...current };
          delete next[orderId];
          return next;
        });
        await loadDashboard(accessToken);
      }
    },
    [accessToken, loadDashboard, performAction, showToast, statusDraft],
  );

  const handleTopup = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const amount = Number(topupAmount.replace(',', '.'));
      if (!Number.isFinite(amount) || amount <= 0) {
        showToast('warning', 'Ungültiger Betrag', 'Bitte einen Betrag größer 0 € angeben.');
        return;
      }
      const minimum = Math.max(data?.minTopupAmount || 10, 10);
      if (amount < minimum) {
        showToast('warning', 'Mindestbetrag nicht erreicht', `Bitte mindestens ${minimum.toFixed(2)} € aufladen.`);
        return;
      }
      const result = await performAction('topup', { amount, note: topupNote || null }, 'topup');
      if (result?.checkoutUrl && typeof result.checkoutUrl === 'string') {
        window.location.href = result.checkoutUrl;
        return;
      }
      if (result) {
        showToast('success', 'Aufladung gestartet', `Referenz: ${String(result.reference || '-')}`);
        setTopupAmount('');
        setTopupNote('');
        await loadDashboard(accessToken);
      }
    },
    [accessToken, data?.minTopupAmount, loadDashboard, performAction, showToast, topupAmount, topupNote],
  );

  const handleClaimBonus = useCallback(async () => {
    const result = await performAction('claim_bonus', {}, 'claim_bonus');
    if (result) {
      showToast('success', 'Startbonus aktiviert', `${result.tokens || 0} kostenlose Anfragen gutgeschrieben.`);
      await loadDashboard(accessToken);
    }
  }, [accessToken, loadDashboard, performAction, showToast]);

  const handleProfileSave = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const result = await performAction(
        'update_profile',
        {
          phone: profileForm.phone.trim(),
          websiteUrl: profileForm.websiteUrl.trim(),
          settings: {
            emailNotif: profileForm.emailNotif,
            smsNotif: profileForm.smsNotif,
            smsNumber: profileForm.smsNumber.trim(),
          },
        },
        'profile',
      );
      if (result) {
        showToast('success', 'Profil gespeichert', 'Ihre Änderungen wurden übernommen.');
        await loadDashboard(accessToken);
      }
    },
    [accessToken, loadDashboard, performAction, profileForm, showToast],
  );

  const handleAvailabilityToggle = useCallback(
    async (next: boolean) => {
      const result = await performAction('update_profile', { isAvailable: next }, 'availability');
      if (result) {
        showToast(next ? 'success' : 'info', next ? 'Verfügbar' : 'Pausiert', next ? 'Sie erscheinen wieder im Marktplatz.' : 'Anfragen werden Ihnen vorübergehend nicht mehr angeboten.');
        await loadDashboard(accessToken);
      }
    },
    [accessToken, loadDashboard, performAction, showToast],
  );

  const handleMarkNotificationRead = useCallback(
    async (id: string) => {
      const result = await performAction('mark_notification_read', { notificationId: id }, `notif:${id}`);
      if (result) {
        await loadDashboard(accessToken);
      }
    },
    [accessToken, loadDashboard, performAction],
  );

  const handleSubscribePackage = useCallback(
    async (code: 'PREMIUM' | 'BUSINESS') => {
      const result = await performAction('subscribe_package', { packageCode: code }, `subscribe:${code}`);
      if (result?.checkoutUrl && typeof result.checkoutUrl === 'string') {
        window.location.href = result.checkoutUrl;
      }
    },
    [performAction],
  );

  const handleManageSubscription = useCallback(async () => {
    const result = await performAction('manage_subscription', {}, 'manage_subscription');
    if (result?.portalUrl && typeof result.portalUrl === 'string') {
      window.location.href = result.portalUrl;
    }
  }, [performAction]);

  const filteredMarketplace = useMemo(() => {
    if (!data) return [];
    const query = marketplaceSearch.trim().toLowerCase();
    if (!query) return data.marketplace;
    return data.marketplace.filter((entry) => {
      const haystack = [
        entry.von_city_masked,
        entry.nach_city_masked,
        entry.service_category,
        entry.size_info,
        entry.rooms_info,
        entry.von_plz_masked,
        entry.nach_plz_masked,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data, marketplaceSearch]);

  const unreadNotifications = useMemo(() => (data?.notifications || []).filter((entry) => !entry.is_read), [data?.notifications]);

  if (loading) return <LoadingState />;
  if (errorState) return <ErrorState message={errorState.message} redirectTo={errorState.redirectTo} />;
  if (!data) return <ErrorState message="Keine Daten verfügbar." redirectTo="/login" />;

  const partner = data.partner;
  const sectionMeta = SECTION_DESCRIPTIONS[section];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(2,118,200,0.12),transparent_32%),linear-gradient(180deg,#f6f9fc,#eef4f8)]">
      <div className="relative flex min-h-screen w-full">
        <div className={cx('fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden', mobileNavOpen ? 'block' : 'hidden')} onClick={() => setMobileNavOpen(false)} />

        <aside
          className={cx(
            'fixed inset-y-0 left-0 z-40 flex w-[290px] flex-col border-r border-white/70 bg-white/95 p-5 shadow-[0_25px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:shadow-none',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <Image src="/logo_transparent.png" alt="Umzugsnetz" width={170} height={44} className="h-10 w-auto" priority />
            <button type="button" onClick={() => setMobileNavOpen(false)} className="rounded-2xl border border-slate-200 p-2 text-slate-500 lg:hidden">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-6 rounded-[1.5rem] border border-slate-100 bg-gradient-to-br from-brand-blue/10 to-emerald-50 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Verfügbares Guthaben</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{formatCurrency(partner.balance)}</p>
            {partner.bonus_tokens > 0 ? (
              <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1 text-[11px] font-black text-emerald-700">
                <Sparkles className="h-3 w-3" />
                {partner.bonus_tokens} Bonus-Anfragen
              </p>
            ) : null}
          </div>

          <nav className="flex-1 space-y-2">
            {NAV_ITEMS.map((item) => {
              const counter =
                item.id === 'marketplace' ? data.marketplace.length
                : item.id === 'myleads' ? data.myLeads.length
                : null;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSection(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={cx(
                    'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-all',
                    section === item.id ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-950',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="text-sm font-black">{item.label}</span>
                  </span>
                  {counter !== null && counter > 0 ? (
                    <span className={cx('rounded-full px-2.5 py-1 text-[11px] font-black', section === item.id ? 'bg-white/15 text-white' : 'bg-white text-slate-500')}>
                      {counter}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="break-all text-sm font-black text-slate-900">{partner.name || data.profile.full_name || data.profile.email}</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Partner · {partnerStatusLabel(partner.status)}</p>
            </div>
            <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition-colors hover:border-red-200 hover:text-red-600">
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </div>
        </aside>

        <section className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/70 bg-white/85 px-4 py-4 backdrop-blur-xl sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMobileNavOpen(true)} className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-600 lg:hidden">
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Partnerportal</p>
                  <h1 className="text-xl font-black text-slate-950 sm:text-2xl">{sectionMeta.title}</h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleAvailabilityToggle(!partner.is_available)}
                  className={cx(
                    'hidden items-center gap-2 rounded-full border px-4 py-2 text-xs font-black transition-colors sm:inline-flex',
                    partner.is_available ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500',
                  )}
                  disabled={actionInFlight === 'availability'}
                >
                  <span className={cx('h-2.5 w-2.5 rounded-full', partner.is_available ? 'bg-emerald-500' : 'bg-slate-400')} />
                  {partner.is_available ? 'Verfügbar' : 'Pausiert'}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifications((current) => !current)}
                    className="relative rounded-2xl border border-slate-200 bg-white p-2.5 text-slate-600 transition-colors hover:text-brand-blue"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotifications.length > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                        {unreadNotifications.length}
                      </span>
                    ) : null}
                  </button>
                  {showNotifications ? (
                    <div className="absolute right-0 z-30 mt-2 w-[320px] rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
                      <p className="mb-2 px-1 text-xs font-black uppercase tracking-[0.16em] text-slate-400">Hinweise</p>
                      {data.notifications.length ? (
                        <div className="space-y-2 max-h-[340px] overflow-y-auto">
                          {data.notifications.slice(0, 8).map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => handleMarkNotificationRead(entry.id)}
                              className={cx(
                                'block w-full rounded-2xl border p-3 text-left transition-colors',
                                entry.is_read ? 'border-slate-100 bg-white' : 'border-brand-blue/15 bg-brand-blue/5',
                              )}
                            >
                              <p className="text-sm font-black text-slate-900">{entry.title || 'Hinweis'}</p>
                              <p className="mt-1 text-xs font-medium text-slate-500">{entry.message || '-'}</p>
                              <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{formatDateTime(entry.created_at)}</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-semibold text-slate-500">Keine Hinweise vorhanden.</p>
                      )}
                    </div>
                  ) : null}
                </div>

                <button type="button" onClick={handleLogout} className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition-colors hover:border-red-200 hover:text-red-600 sm:inline-flex">
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm font-medium text-slate-500">{sectionMeta.subtitle}</p>
          </header>

          <div className="flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
            {section === 'overview' ? <OverviewSection data={data} onClaimBonus={handleClaimBonus} actionInFlight={actionInFlight} onSwitchSection={setSection} /> : null}
            {section === 'marketplace' ? (
              <MarketplaceSection
                data={data}
                searchValue={marketplaceSearch}
                onSearchChange={setMarketplaceSearch}
                filtered={filteredMarketplace}
                onPurchase={handlePurchase}
                actionInFlight={actionInFlight}
              />
            ) : null}
            {section === 'myleads' ? (
              <MyLeadsSection
                data={data}
                statusDraft={statusDraft}
                onDraftChange={(orderId, draft) => setStatusDraft((current) => ({ ...current, [orderId]: draft }))}
                onStatusSave={handleStatusUpdate}
                actionInFlight={actionInFlight}
              />
            ) : null}
            {section === 'wallet' ? (
              <WalletSection
                data={data}
                topupAmount={topupAmount}
                topupNote={topupNote}
                onAmountChange={setTopupAmount}
                onNoteChange={setTopupNote}
                onSubmit={handleTopup}
                actionInFlight={actionInFlight}
                onSubscribe={handleSubscribePackage}
                onManage={handleManageSubscription}
              />
            ) : null}
            {section === 'profile' ? (
              <ProfileSection
                data={data}
                form={profileForm}
                onChange={(changes) => setProfileForm((current) => ({ ...current, ...changes }))}
                onSubmit={handleProfileSave}
                actionInFlight={actionInFlight}
                onAvailabilityToggle={handleAvailabilityToggle}
              />
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function OverviewSection({
  data,
  onClaimBonus,
  actionInFlight,
  onSwitchSection,
}: {
  data: DashboardData;
  onClaimBonus: () => Promise<void>;
  actionInFlight: string | null;
  onSwitchSection: (section: PartnerSectionId) => void;
}) {
  const partner = data.partner;
  const showBonusClaim = !partner.bonus_tokens_claimed_at && partner.bonus_tokens === 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Guthaben" value={formatCurrency(partner.balance)} hint={partner.bonus_tokens > 0 ? `+ ${partner.bonus_tokens} Bonus-Token` : 'Aufladen für mehr Anfragen'} icon={Wallet} tone="blue" />
        <KpiCard label="Käufe diesen Monat" value={String(data.kpis.purchases_this_month)} hint={`Insgesamt ${data.kpis.purchases_total}`} icon={ShoppingBag} tone="emerald" />
        <KpiCard label="Verfügbare Anfragen" value={String(data.kpis.open_leads_available)} hint="Marktplatz aktualisiert" icon={Truck} tone="amber" />
        <KpiCard label="Conversion" value={`${data.kpis.conversion_rate}%`} hint={`${data.kpis.won_this_month} Aufträge diesen Monat gebucht`} icon={Handshake} tone="slate" />
      </div>

      {showBonusClaim ? (
        <SectionCard
          title="Startbonus aktivieren"
          description="Sichern Sie sich kostenlose Test-Anfragen, um den Marktplatz risikofrei kennenzulernen."
          action={
            <button
              type="button"
              onClick={onClaimBonus}
              disabled={actionInFlight === 'claim_bonus'}
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-blue px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              {actionInFlight === 'claim_bonus' ? 'Aktiviert...' : 'Startbonus einlösen'}
            </button>
          }
        >
          <p className="text-sm font-medium text-slate-500">Mit dem Klick erhalten Sie bis zu 5 kostenlose Anfragen aus Ihrer Region. Das Angebot ist einmalig pro Unternehmen.</p>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Neue Anfragen im Marktplatz"
          description={`${data.marketplace.length} verfügbare Kundenanfragen`}
          action={
            <button type="button" onClick={() => onSwitchSection('marketplace')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue">
              Alle ansehen
            </button>
          }
        >
          {data.marketplace.length === 0 ? (
            <EmptyState title="Keine offenen Anfragen" text="Sobald passende Kundenanfragen für Ihre Region eingehen, erscheinen sie hier." />
          ) : (
            <div className="space-y-3">
              {data.marketplace.slice(0, 4).map((entry) => (
                <div key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-black text-slate-900">{serviceLabel(entry.service_category)} · {entry.von_city_masked} → {entry.nach_city_masked}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {[entry.size_info, entry.rooms_info ? `${entry.rooms_info} Zi.` : null, entry.move_date ? `Termin ${formatDate(entry.move_date)}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-brand-blue/15 bg-brand-blue/10 px-3 py-1 text-xs font-black text-brand-blue">{formatCurrency(entry.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Letzte gekaufte Anfragen"
          description={`${data.myLeads.length} Anfragen insgesamt`}
          action={
            <button type="button" onClick={() => onSwitchSection('myleads')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue">
              Alle ansehen
            </button>
          }
        >
          {data.myLeads.length === 0 ? (
            <EmptyState title="Noch keine Anfragen gekauft" text="Sobald Sie eine Anfrage aus dem Marktplatz kaufen, erscheinen die Kontaktdaten hier." />
          ) : (
            <div className="space-y-3">
              {data.myLeads.slice(0, 4).map((entry) => (
                <div key={entry.id} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-900">{entry.customer_name || 'Kunde'}</p>
                    <StatusBadge label={statusLabel(entry.status)} tone={statusToneClass(entry.status)} />
                  </div>
                  <p className="text-xs font-medium text-slate-500">{serviceLabel(entry.service_category)} · {entry.von_city || '-'} → {entry.nach_city || '-'}</p>
                  <p className="text-xs font-medium text-slate-500">Gekauft am {formatDateTime(entry.purchased_at)} · {formatCurrency(entry.purchase_price)}</p>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Konto-Status" description="Ihre Vertragskategorie und Verifizierung">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Tarif</p>
            <p className="mt-1 text-base font-black text-slate-900">{partner.category || 'Standard Anfragen'}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{data.pricingTier ? formatCurrency(data.pricingTier.price) + ' pro Anfrage' : '-'}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Paket</p>
            <p className="mt-1 text-base font-black text-slate-900">{partner.package_code || 'FREE'}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{partner.lead_limit_monthly > 0 ? `${partner.lead_limit_used}/${partner.lead_limit_monthly} genutzt` : 'Kein Monatslimit'}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Verifizierung</p>
            <p className="mt-1 text-base font-black text-slate-900">{verificationLabel(partner.verification_status)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Status: {partnerStatusLabel(partner.status)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Region</p>
            <p className="mt-1 text-base font-black text-slate-900">{data.serviceRegions[0]?.city || partner.regions || '-'}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Radius {data.serviceRegions[0]?.radius_km || 50} km</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function MarketplaceSection({
  data,
  searchValue,
  onSearchChange,
  filtered,
  onPurchase,
  actionInFlight,
}: {
  data: DashboardData;
  searchValue: string;
  onSearchChange: (value: string) => void;
  filtered: DashboardData['marketplace'];
  onPurchase: (orderId: string, price: number) => Promise<void>;
  actionInFlight: string | null;
}) {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Filter"
        description="Suchen Sie gezielt nach Stadt, Service oder Größe."
        action={
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-brand-blue/10 px-3 py-1 text-xs font-black text-brand-blue">
            <Truck className="h-3 w-3" />
            {data.marketplace.length} verfügbar
          </span>
        }
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="z. B. Berlin, 80qm, Privatumzug"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
          />
        </div>
      </SectionCard>

      {filtered.length === 0 ? (
        <EmptyState title="Keine passenden Anfragen" text="Aktuell finden wir keine offenen Anfragen mit diesen Kriterien. Erweitern Sie Ihre Region oder versuchen Sie es später erneut." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((entry) => {
            const buying = actionInFlight === `purchase:${entry.id}`;
            return (
              <article key={entry.id} className="flex flex-col gap-4 rounded-[1.7rem] border border-white/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-blue">{serviceLabel(entry.service_category)}</p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">{entry.von_city_masked} → {entry.nach_city_masked}</h3>
                    <p className="text-xs font-medium text-slate-500">
                      {[entry.von_plz_masked, entry.nach_plz_masked].filter(Boolean).join(' / ') || 'Postleitzahl wird nach Kauf sichtbar'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-brand-blue/15 bg-brand-blue/10 px-4 py-2 text-right">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-blue">Preis</p>
                    <p className="text-lg font-black text-brand-blue">{formatCurrency(entry.price)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-xs">
                  <div>
                    <p className="font-black uppercase tracking-[0.16em] text-slate-400">Termin</p>
                    <p className="mt-1 font-bold text-slate-800">{entry.move_date ? formatDate(entry.move_date) : 'Flexibel'}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-[0.16em] text-slate-400">Größe</p>
                    <p className="mt-1 font-bold text-slate-800">{entry.size_info || entry.sqm || '-'}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-[0.16em] text-slate-400">Räume</p>
                    <p className="mt-1 font-bold text-slate-800">{entry.rooms_info || '-'}</p>
                  </div>
                  <div>
                    <p className="font-black uppercase tracking-[0.16em] text-slate-400">Erreichbarkeit</p>
                    <p className="mt-1 font-bold text-slate-800">{entry.erreichbarkeit || 'k. A.'}</p>
                  </div>
                </div>

                {entry.additional_services && entry.additional_services.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {entry.additional_services.map((service) => (
                      <span key={service} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
                        {service}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
                  <span>Eingegangen {formatDateTime(entry.created_at)}</span>
                  <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-brand-blue" /> Kontaktdaten erst nach Kauf sichtbar</span>
                </div>

                <button
                  type="button"
                  onClick={() => onPurchase(entry.id, entry.price)}
                  disabled={buying}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-blue/20 transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
                >
                  <ShoppingBag className="h-4 w-4" />
                  {buying ? 'Wird gekauft...' : `Anfrage für ${formatCurrency(entry.price)} kaufen`}
                </button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MyLeadsSection({
  data,
  statusDraft,
  onDraftChange,
  onStatusSave,
  actionInFlight,
}: {
  data: DashboardData;
  statusDraft: Record<string, { status: string; notes: string }>;
  onDraftChange: (orderId: string, draft: { status: string; notes: string }) => void;
  onStatusSave: (orderId: string) => Promise<void>;
  actionInFlight: string | null;
}) {
  if (data.myLeads.length === 0) {
    return <EmptyState title="Noch keine gekauften Anfragen" text="Sobald Sie eine Anfrage gekauft haben, erscheinen Kontaktdaten und Statusoptionen hier." />;
  }

  return (
    <div className="space-y-4">
      {data.myLeads.map((entry) => {
        const draft = statusDraft[entry.id] || { status: '', notes: '' };
        const saving = actionInFlight === `status:${entry.id}`;
        return (
          <article key={entry.id} className="rounded-[1.7rem] border border-white/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-brand-blue">{serviceLabel(entry.service_category)} · {entry.order_number || entry.id.slice(0, 8)}</p>
                <h3 className="mt-1 text-xl font-black text-slate-950">{entry.customer_name || 'Kunde'}</h3>
                <p className="text-xs font-medium text-slate-500">Gekauft am {formatDateTime(entry.purchased_at)} für {formatCurrency(entry.purchase_price)}</p>
              </div>
              <StatusBadge label={statusLabel(entry.status)} tone={statusToneClass(entry.status)} />
            </header>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ContactRow icon={Phone} label="Telefon" value={entry.customer_phone} href={entry.customer_phone ? `tel:${entry.customer_phone}` : undefined} />
              <ContactRow icon={Mail} label="E-Mail" value={entry.customer_email} href={entry.customer_email ? `mailto:${entry.customer_email}` : undefined} />
              <ContactRow icon={MapPin} label="Von" value={[entry.von_address, entry.von_plz, entry.von_city].filter(Boolean).join(', ') || '-'} hint={entry.von_floor ? `${entry.von_floor}. Etage${entry.von_lift ? ' · Aufzug' : ''}` : undefined} />
              <ContactRow icon={MapPin} label="Nach" value={[entry.nach_address, entry.nach_plz, entry.nach_city].filter(Boolean).join(', ') || '-'} hint={entry.nach_floor ? `${entry.nach_floor}. Etage${entry.nach_lift ? ' · Aufzug' : ''}` : undefined} />
              <ContactRow icon={Truck} label="Termin" value={entry.move_date ? formatDate(entry.move_date) : 'Flexibel'} hint={entry.erreichbarkeit || undefined} />
              <ContactRow icon={Package} label="Volumen" value={[entry.size_info, entry.rooms_info ? `${entry.rooms_info} Zi.` : null, entry.sqm ? `${entry.sqm} m²` : null].filter(Boolean).join(' · ') || '-'} />
            </div>

            {entry.additional_services && entry.additional_services.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {entry.additional_services.map((service) => (
                  <span key={service} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
                    {service}
                  </span>
                ))}
              </div>
            ) : null}

            {entry.notes ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-700 whitespace-pre-line">{entry.notes}</div>
            ) : null}

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Status aktualisieren</span>
                <select
                  value={draft.status}
                  onChange={(event) => onDraftChange(entry.id, { status: event.target.value, notes: draft.notes })}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                >
                  <option value="">Status wählen</option>
                  <option value="Kontaktiert">Kontaktiert</option>
                  <option value="Angebot">Angebot gesendet</option>
                  <option value="Gebucht">Gebucht</option>
                  <option value="Abgelehnt">Abgelehnt</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Notiz (optional)</span>
                <input
                  value={draft.notes}
                  onChange={(event) => onDraftChange(entry.id, { status: draft.status, notes: event.target.value })}
                  placeholder="z. B. Termin am Mittwoch um 14:00"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                />
              </label>
              <button
                type="button"
                onClick={() => onStatusSave(entry.id)}
                disabled={saving || !draft.status}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, hint, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null; hint?: string; href?: string }) {
  const content = (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-blue/15 bg-brand-blue/10 text-brand-blue">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
        <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || '-'}</p>
        {hint ? <p className="mt-0.5 text-xs font-medium text-slate-500">{hint}</p> : null}
      </div>
    </div>
  );
  if (href) {
    return <a href={href} className="block transition-colors hover:[&>div]:border-brand-blue/40">{content}</a>;
  }
  return content;
}

function WalletSection({
  data,
  topupAmount,
  topupNote,
  onAmountChange,
  onNoteChange,
  onSubmit,
  actionInFlight,
  onSubscribe,
  onManage,
}: {
  data: DashboardData;
  topupAmount: string;
  topupNote: string;
  onAmountChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  actionInFlight: string | null;
  onSubscribe: (code: 'PREMIUM' | 'BUSINESS') => Promise<void>;
  onManage: () => Promise<void>;
}) {
  const partner = data.partner;
  const transactions = data.walletTransactions;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Aktuelles Guthaben" value={formatCurrency(partner.balance)} hint={`Mindestaufladung ${formatCurrency(data.minTopupAmount)}`} icon={Wallet} tone="blue" />
        <KpiCard label="Bonus-Token" value={String(partner.bonus_tokens)} hint={partner.bonus_tokens > 0 ? 'Wird beim nächsten Kauf eingesetzt' : 'Kein Bonus aktiv'} icon={Sparkles} tone="emerald" />
        <KpiCard label="Käufe gesamt" value={String(data.kpis.purchases_total)} hint={`${data.kpis.purchases_this_month} diesen Monat`} icon={ShoppingBag} tone="amber" />
      </div>

      <PackagesSection data={data} actionInFlight={actionInFlight} onSubscribe={onSubscribe} onManage={onManage} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <SectionCard title="Guthaben aufladen" description="Tragen Sie den gewünschten Betrag ein und schließen Sie die Zahlung über Stripe ab. Das Guthaben wird sofort nach Zahlungseingang gutgeschrieben.">
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Betrag (€)</span>
              <input
                type="number"
                inputMode="decimal"
                min={Math.max(data.minTopupAmount, 10)}
                step="0.01"
                value={topupAmount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder={`Mindestens ${Math.max(data.minTopupAmount, 10).toFixed(0)} €`}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                required
              />
              <p className="mt-2 text-[11px] font-medium text-slate-500">Mindestbetrag {Math.max(data.minTopupAmount, 10).toFixed(2)} €. Sie wählen den Betrag selbst – auch krumme Summen sind möglich.</p>
            </label>
            <div className="flex flex-wrap gap-2">
              {[25, 50, 100, 250, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onAmountChange(String(preset))}
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-black text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  {preset} €
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Notiz (optional)</span>
              <textarea
                value={topupNote}
                onChange={(event) => onNoteChange(event.target.value)}
                placeholder="Verwendungszweck, Hinweise"
                rows={3}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
              />
            </label>
            <button
              type="submit"
              disabled={actionInFlight === 'topup'}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
            >
              <CircleDollarSign className="h-4 w-4" />
              {actionInFlight === 'topup' ? 'Weiterleitung zu Stripe...' : 'Mit Stripe aufladen'}
            </button>
          </form>

          <p className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-brand-blue/15 bg-brand-blue/5 px-3 py-2 text-[11px] font-bold text-brand-blue">
            <ShieldCheck className="h-3.5 w-3.5" />
            Zahlung über Stripe – Kreditkarte, Apple Pay, Google Pay, SEPA Lastschrift.
          </p>
        </SectionCard>

        <SectionCard title="Aufladungen" description={`${data.topupRequests.length} Vorgänge`}>
          {data.topupRequests.length === 0 ? (
            <EmptyState title="Keine Aufladungen" text="Sobald Sie eine Aufladung durchgeführt haben, erscheinen Status und Referenz hier." />
          ) : (
            <div className="space-y-3">
              {data.topupRequests.map((entry) => (
                <div key={entry.id} className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-black text-slate-900">{formatCurrency(entry.amount)}</p>
                    <StatusBadge label={topupStatusLabel(entry.status)} tone={entry.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : entry.status === 'CANCELLED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber-200 bg-amber-50 text-amber-700'} />
                  </div>
                  <p className="text-xs font-medium text-slate-500">Ref. {entry.reference} · {formatDateTime(entry.created_at)}</p>
                  {entry.note ? <p className="text-xs font-medium text-slate-500">{entry.note}</p> : null}
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Transaktionen" description="Bewegungen auf Ihrem Guthabenkonto">
        {transactions.length === 0 ? (
          <EmptyState title="Noch keine Transaktionen" text="Käufe, Aufladungen und Gutschriften werden hier protokolliert." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-black uppercase tracking-[0.16em] text-slate-400">
                  <th className="pb-3 pr-4">Datum</th>
                  <th className="pb-3 pr-4">Typ</th>
                  <th className="pb-3 pr-4">Beschreibung</th>
                  <th className="pb-3 pr-4 text-right">Betrag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-700">
                {transactions.map((entry) => {
                  const amount = Number(entry.amount || 0);
                  const positive = amount >= 0;
                  return (
                    <tr key={entry.id}>
                      <td className="py-3 pr-4 text-xs font-bold text-slate-500">{formatDateTime(entry.created_at)}</td>
                      <td className="py-3 pr-4 font-black text-slate-800">{transactionLabel(entry.type)}</td>
                      <td className="py-3 pr-4">{entry.description || '-'}</td>
                      <td className={cx('py-3 pr-4 text-right font-black', positive ? 'text-emerald-600' : 'text-red-600')}>
                        {positive ? '+' : ''}{formatCurrency(amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function ProfileSection({
  data,
  form,
  onChange,
  onSubmit,
  actionInFlight,
  onAvailabilityToggle,
}: {
  data: DashboardData;
  form: { phone: string; websiteUrl: string; emailNotif: boolean; smsNotif: boolean; smsNumber: string };
  onChange: (changes: Partial<{ phone: string; websiteUrl: string; emailNotif: boolean; smsNotif: boolean; smsNumber: string }>) => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  actionInFlight: string | null;
  onAvailabilityToggle: (next: boolean) => Promise<void>;
}) {
  const partner = data.partner;
  const profile = data.profile;
  const region = data.serviceRegions[0];

  return (
    <div className="space-y-6">
      <SectionCard title="Firmenprofil" description="Diese Daten haben Sie beim Onboarding gespeichert.">
        <div className="grid gap-4 sm:grid-cols-2">
          <ContactRow icon={Building2} label="Firma" value={partner.name} />
          <ContactRow icon={User2} label="Ansprechperson" value={profile.full_name} />
          <ContactRow icon={Mail} label="E-Mail" value={profile.email || partner.email} />
          <ContactRow icon={Globe2} label="Website" value={partner.website_url} />
          <ContactRow icon={MapPin} label="Region" value={region?.city || partner.regions} hint={region ? `Radius ${region.radius_km || 50} km${region.postal_code ? ` · PLZ ${region.postal_code}` : ''}` : undefined} />
          <ContactRow icon={Truck} label="Leistungen" value={data.partnerServices.length ? data.partnerServices.map(serviceLabel).join(', ') : 'Alle'} />
        </div>
      </SectionCard>

      <SectionCard
        title="Kontaktdaten & Benachrichtigungen"
        description="Aktualisieren Sie Telefonnummer, Website und Benachrichtigungspräferenzen."
      >
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Telefon</span>
            <input
              value={form.phone}
              onChange={(event) => onChange({ phone: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
              placeholder="+49 ..."
              required
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">Website</span>
            <input
              value={form.websiteUrl}
              onChange={(event) => onChange({ websiteUrl: event.target.value })}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
              placeholder="https://..."
            />
          </label>

          <div className="sm:col-span-2 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
            <ToggleRow label="E-Mail-Benachrichtigungen" description="Neue Anfragen, Statusänderungen, Aufladungen" checked={form.emailNotif} onChange={(value) => onChange({ emailNotif: value })} />
            <ToggleRow label="SMS-Benachrichtigungen" description="Sofortige SMS bei dringenden Anfragen" checked={form.smsNotif} onChange={(value) => onChange({ smsNotif: value })} />
          </div>

          {form.smsNotif ? (
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-black uppercase tracking-[0.16em] text-slate-400">SMS-Nummer</span>
              <input
                value={form.smsNumber}
                onChange={(event) => onChange({ smsNumber: event.target.value })}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue"
                placeholder="+49 ..."
              />
            </label>
          ) : null}

          <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <div>
              <p className="text-sm font-black text-slate-900">Verfügbarkeit</p>
              <p className="text-xs font-medium text-slate-500">Pausieren Sie eingehende Anfragen, ohne Ihr Konto zu deaktivieren.</p>
            </div>
            <button
              type="button"
              onClick={() => onAvailabilityToggle(!partner.is_available)}
              disabled={actionInFlight === 'availability'}
              className={cx(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black transition-colors',
                partner.is_available ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500',
              )}
            >
              <span className={cx('h-2.5 w-2.5 rounded-full', partner.is_available ? 'bg-emerald-500' : 'bg-slate-400')} />
              {partner.is_available ? 'Verfügbar' : 'Pausiert'}
            </button>
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={actionInFlight === 'profile'}
              className="flex items-center justify-center gap-2 rounded-2xl bg-brand-blue px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              {actionInFlight === 'profile' ? 'Speichert...' : 'Profil speichern'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Onboarding & Verifizierung" description="Bei Änderungen an Region oder Leistungen wenden Sie sich an unseren Support.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Verifizierung</p>
            <p className="mt-1 text-base font-black text-slate-900">{verificationLabel(partner.verification_status)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Status</p>
            <p className="mt-1 text-base font-black text-slate-900">{partnerStatusLabel(partner.status)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Mitglied seit</p>
            <p className="mt-1 text-base font-black text-slate-900">{formatDate(partner.created_at)}</p>
          </div>
        </div>
        <Link href="/portal/onboarding/partner" className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue">
          <ReceiptText className="h-4 w-4" />
          Onboarding-Daten überprüfen
        </Link>
      </SectionCard>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left transition-colors hover:border-brand-blue/40">
      <div>
        <p className="text-sm font-black text-slate-900">{label}</p>
        <p className="mt-0.5 text-xs font-medium text-slate-500">{description}</p>
      </div>
      <span className={cx('relative mt-1 inline-flex h-6 w-11 flex-shrink-0 rounded-full transition-colors', checked ? 'bg-brand-blue' : 'bg-slate-200')}>
        <span className={cx('absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-md transition-transform', checked ? 'translate-x-5' : 'translate-x-0')} />
      </span>
    </button>
  );
}

const PACKAGE_THEME: Record<'FREE' | 'PREMIUM' | 'BUSINESS', { tagline: string; perks: string[]; accent: string; chip: string }> = {
  FREE: {
    tagline: 'Für den Einstieg in den Marktplatz.',
    perks: [
      'Standard-Zugriff auf neue Anfragen',
      'Volle Marktplatz-Nutzung',
      'Bezahlung nur pro gekaufter Anfrage',
    ],
    accent: 'border-slate-200 bg-white',
    chip: 'border-slate-200 bg-slate-100 text-slate-600',
  },
  PREMIUM: {
    tagline: 'Mehr Sichtbarkeit und früherer Zugriff.',
    perks: [
      'Bevorzugte Reihenfolge im Marktplatz',
      'Schnellerer Zugriff auf neue Anfragen',
      'Bis zu 150 Anfragen pro Monat',
    ],
    accent: 'border-brand-blue/40 bg-brand-blue/5',
    chip: 'border-brand-blue/15 bg-brand-blue/10 text-brand-blue',
  },
  BUSINESS: {
    tagline: 'Maximale Priorität für skalierende Firmen.',
    perks: [
      'Höchste Priorität bei Exklusiv-Anfragen',
      'Sofort-Zugriff ohne Wartezeit',
      'Bis zu 500 Anfragen pro Monat',
    ],
    accent: 'border-emerald-300 bg-emerald-50',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
};

function packageStatusLabel(status?: string | null) {
  const value = String(status || '').toUpperCase();
  if (value === 'ACTIVE') return 'Aktiv';
  if (value === 'PAST_DUE') return 'Zahlung offen';
  if (value === 'PAUSED') return 'Pausiert';
  if (value === 'CANCELED') return 'Gekündigt';
  if (value === 'INCOMPLETE') return 'In Bearbeitung';
  if (value === 'EXPIRED') return 'Abgelaufen';
  return value || 'Aktiv';
}

function PackagesSection({
  data,
  actionInFlight,
  onSubscribe,
  onManage,
}: {
  data: DashboardData;
  actionInFlight: string | null;
  onSubscribe: (code: 'PREMIUM' | 'BUSINESS') => Promise<void>;
  onManage: () => Promise<void>;
}) {
  const currentCode = (data.partner.package_code || 'FREE') as 'FREE' | 'PREMIUM' | 'BUSINESS';
  const subscription = data.subscription;
  const subscriptionStatus = subscription?.status || null;
  const subscriptionEnd = subscription?.current_period_end || null;
  const cancelAtPeriodEnd = Boolean(subscription?.cancel_at_period_end);

  const sortedPackages = [...data.packages].sort((a, b) => a.monthly_price - b.monthly_price);
  const orderedPackages = sortedPackages.length
    ? sortedPackages
    : ([
        { code: 'FREE', name: 'Free', monthly_price: 0, lead_limit_monthly: 25, priority: 3, release_delay_seconds: 1800, purchasable: false },
        { code: 'PREMIUM', name: 'Premium', monthly_price: 99, lead_limit_monthly: 150, priority: 2, release_delay_seconds: 300, purchasable: data.stripeConfigured },
        { code: 'BUSINESS', name: 'Business', monthly_price: 249, lead_limit_monthly: 500, priority: 1, release_delay_seconds: 0, purchasable: data.stripeConfigured },
      ] as DashboardData['packages']);

  return (
    <SectionCard
      title="Pakete & Mitgliedschaft"
      description="Schalten Sie schnellere Anfragen, höhere Limits und Premium-Sichtbarkeit per Stripe-Subscription frei."
      action={subscription ? (
        <button
          type="button"
          onClick={onManage}
          disabled={actionInFlight === 'manage_subscription'}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue disabled:opacity-60"
        >
          <ReceiptText className="h-3.5 w-3.5" />
          {actionInFlight === 'manage_subscription' ? 'Öffnet...' : 'Abo verwalten'}
        </button>
      ) : null}
    >
      {!data.stripeConfigured ? (
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-700">
          Hinweis: Stripe ist auf dieser Umgebung noch nicht aktiviert. Sie können die Pakete einsehen, der Buchungs-Button öffnet erst nach Konfiguration.
        </p>
      ) : null}

      {subscription ? (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-blue/15 bg-brand-blue/5 px-4 py-3 text-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-brand-blue">Aktuelles Abo</p>
            <p className="mt-1 font-black text-slate-900">
              {subscription.package_code} · {packageStatusLabel(subscriptionStatus)}
              {cancelAtPeriodEnd ? ' · Kündigung zum Periodenende geplant' : ''}
            </p>
          </div>
          {subscriptionEnd ? (
            <p className="text-xs font-medium text-slate-500">
              {cancelAtPeriodEnd ? 'Endet am ' : 'Verlängert sich am '}{formatDate(subscriptionEnd)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        {orderedPackages.map((pkg) => {
          const theme = PACKAGE_THEME[pkg.code];
          const isCurrent = pkg.code === currentCode && (pkg.code === 'FREE' || subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'PAST_DUE');
          const subscribing = actionInFlight === `subscribe:${pkg.code}`;
          const isPaid = pkg.code !== 'FREE';
          return (
            <article
              key={pkg.code}
              className={cx(
                'flex h-full flex-col gap-4 rounded-[1.7rem] border-2 p-5 transition-all',
                isCurrent ? 'border-emerald-400 bg-emerald-50/60 shadow-[0_18px_45px_rgba(16,185,129,0.12)]' : theme.accent,
              )}
            >
              <header className="space-y-2">
                <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em]', theme.chip)}>
                  {pkg.code === 'FREE' ? 'Basis' : pkg.code === 'PREMIUM' ? 'Pro' : 'Premium'}
                </span>
                <h3 className="text-2xl font-black text-slate-950">{pkg.name}</h3>
                <p className="text-xs font-medium text-slate-500">{theme.tagline}</p>
              </header>

              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Preis</p>
                <p className="mt-1 text-2xl font-black text-slate-950">
                  {isPaid ? `${formatCurrency(pkg.monthly_price)} / Monat` : 'Kostenfrei'}
                </p>
                {isPaid ? <p className="mt-1 text-[11px] font-medium text-slate-500">Monatlich kündbar</p> : null}
              </div>

              <ul className="space-y-2 text-sm font-medium text-slate-700">
                {theme.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-blue" />
                    <span>{perk}</span>
                  </li>
                ))}
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-blue" />
                  <span>{pkg.lead_limit_monthly > 0 ? `${pkg.lead_limit_monthly} Anfragen pro Monat` : 'Unlimitierter Marktplatz-Zugriff'}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-blue" />
                  <span>{pkg.release_delay_seconds === 0 ? 'Sofortiger Zugriff auf neue Anfragen' : `Vorlauf von ${Math.round(pkg.release_delay_seconds / 60)} Minuten`}</span>
                </li>
              </ul>

              <div className="mt-auto">
                {isCurrent ? (
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-black text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Aktives Paket
                  </span>
                ) : pkg.code === 'FREE' ? (
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500">
                    Standard ohne Buchung
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSubscribe(pkg.code as 'PREMIUM' | 'BUSINESS')}
                    disabled={!data.stripeConfigured || !pkg.purchasable || subscribing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-3 text-sm font-black text-white shadow-lg shadow-brand-blue/20 transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
                  >
                    {subscribing ? 'Weiterleitung...' : `Mit Stripe buchen`}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
                {isPaid && !pkg.purchasable ? (
                  <p className="mt-2 text-[11px] font-bold text-amber-700">Stripe-Preis-ID fehlt – bitte STRIPE_PRICE_{pkg.code} hinterlegen.</p>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </SectionCard>
  );
}
