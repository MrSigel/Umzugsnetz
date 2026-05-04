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
  return <span className={cx('inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold', tone || 'border-slate-200 bg-slate-100 text-slate-700')}>{label}</span>;
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
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg">{title}</h2>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <div className={cx('flex h-9 w-9 items-center justify-center rounded-lg border', toneMap[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-sm font-medium text-slate-500">{hint}</p> : null}
    </div>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
      <p className="text-sm font-bold text-slate-700">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Image src="/logo_transparent.png" alt="Umzugsnetz" width={180} height={44} className="mx-auto h-10 w-auto" priority />
        <p className="mt-5 text-sm font-semibold text-slate-600">Partner-Dashboard wird geladen…</p>
      </div>
    </main>
  );
}

function ErrorState({ message, redirectTo }: { message: string; redirectTo?: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <Image src="/logo_transparent.png" alt="Umzugsnetz" width={180} height={44} className="mx-auto h-10 w-auto" priority />
        <p className="mt-5 text-sm font-semibold text-slate-700">{message}</p>
        {redirectTo ? (
          <Link href={redirectTo} className="mt-6 inline-flex rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white">
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
  const [profileForm, setProfileForm] = useState({
    phone: '',
    websiteUrl: '',
    emailNotif: true,
    smsNotif: false,
    smsNumber: '',
    fullName: '',
    city: '',
    postalCode: '',
    radiusKm: 50,
    serviceMode: 'UMZUG' as 'UMZUG' | 'ENTRUEMPELUNG' | 'BEIDES',
  });
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
        const region = payload.serviceRegions?.[0];
        const settingsRadius = Number(payload.partner?.settings?.radius_km);
        const partnerService = String(payload.partner?.service || '').toUpperCase();
        const partnerServices = (payload.partnerServices || []).map((entry: string) => String(entry || '').toUpperCase());
        const derivedMode: 'UMZUG' | 'ENTRUEMPELUNG' | 'BEIDES' = partnerService === 'BEIDES'
          ? 'BEIDES'
          : partnerService === 'ENTRÜMPELUNG' || partnerService === 'ENTRUEMPELUNG'
            ? 'ENTRUEMPELUNG'
            : partnerService === 'UMZUG'
              ? 'UMZUG'
              : (partnerServices.includes('UMZUG') && partnerServices.includes('ENTRUEMPELUNG'))
                ? 'BEIDES'
                : partnerServices.includes('ENTRUEMPELUNG')
                  ? 'ENTRUEMPELUNG'
                  : 'UMZUG';
        setProfileForm({
          phone: payload.partner?.phone || payload.profile?.phone || '',
          websiteUrl: payload.partner?.website_url || '',
          emailNotif: Boolean(payload.partner?.settings?.emailNotif ?? true),
          smsNotif: Boolean(payload.partner?.settings?.smsNotif ?? false),
          smsNumber: String(payload.partner?.settings?.smsNumber || payload.partner?.phone || ''),
          fullName: payload.profile?.full_name || '',
          city: region?.city || payload.partner?.regions || '',
          postalCode: region?.postal_code || '',
          radiusKm: Number.isFinite(settingsRadius) && settingsRadius > 0
            ? settingsRadius
            : Number(region?.radius_km) || 50,
          serviceMode: derivedMode,
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

  const handleRefundPurchase = useCallback(
    async (purchaseId: string, reason: string) => {
      const trimmed = reason.trim();
      if (trimmed.length < 10) {
        showToast('warning', 'Begründung zu kurz', 'Bitte mindestens 10 Zeichen Begründung angeben.');
        return false;
      }
      const result = await performAction('refund_purchase', { purchaseId, reason: trimmed }, `refund:${purchaseId}`);
      if (result) {
        const refundedToken = (result as { refundedToken?: boolean }).refundedToken;
        const refundedAmount = Number((result as { refundedAmount?: number }).refundedAmount || 0);
        showToast(
          'success',
          'Reklamation erfasst',
          refundedToken
            ? 'Bonus-Token wurde Ihrem Konto wieder gutgeschrieben.'
            : `${refundedAmount.toFixed(2)} € wurden Ihrem Guthaben gutgeschrieben.`,
        );
        await loadDashboard(accessToken);
        return true;
      }
      return false;
    },
    [accessToken, loadDashboard, performAction, showToast],
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
      if (!profileForm.fullName.trim()) {
        showToast('warning', 'Ansprechperson fehlt', 'Bitte einen Ansprechpartner angeben.');
        return;
      }
      if (!profileForm.city.trim()) {
        showToast('warning', 'Stadt fehlt', 'Bitte eine Stadt für Ihr Einsatzgebiet angeben.');
        return;
      }
      const result = await performAction(
        'update_profile',
        {
          phone: profileForm.phone.trim(),
          fullName: profileForm.fullName.trim(),
          websiteUrl: profileForm.websiteUrl.trim(),
          city: profileForm.city.trim(),
          postalCode: profileForm.postalCode.trim(),
          radiusKm: profileForm.radiusKm,
          serviceMode: profileForm.serviceMode,
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
    <main className="min-h-screen bg-slate-50">
      <div className="relative flex min-h-screen w-full">
        <div className={cx('fixed inset-0 z-30 bg-slate-900/40 lg:hidden', mobileNavOpen ? 'block' : 'hidden')} onClick={() => setMobileNavOpen(false)} />

        <aside
          className={cx(
            'fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col overflow-y-auto border-r border-slate-200 bg-white transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0',
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-brand-blue px-5 py-5">
            <Image src="/logo_transparent.png" alt="Umzugsnetz" width={150} height={36} className="h-8 w-auto brightness-0 invert" priority />
            <button type="button" onClick={() => setMobileNavOpen(false)} className="rounded-lg border border-white/30 p-1.5 text-white lg:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-shrink-0 border-b border-slate-200 px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Verfügbares Guthaben</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatCurrency(partner.balance)}</p>
            {partner.bonus_tokens > 0 ? (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                <Sparkles className="h-3 w-3" />
                {partner.bonus_tokens} Bonus
              </p>
            ) : null}
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {NAV_ITEMS.map((item) => {
              const counter =
                item.id === 'marketplace' ? data.marketplace.length
                : item.id === 'myleads' ? data.myLeads.length
                : null;
              const isActive = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setSection(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={cx(
                    'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                    isActive
                      ? 'bg-brand-blue/10 font-semibold text-brand-blue'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className={cx('h-4 w-4', isActive ? 'text-brand-blue' : 'text-slate-400')} />
                    <span className="text-sm">{item.label}</span>
                  </span>
                  {counter !== null && counter > 0 ? (
                    <span className={cx(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold',
                      isActive ? 'bg-brand-blue text-white' : 'bg-slate-100 text-slate-500',
                    )}>
                      {counter}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="space-y-2 border-t border-slate-200 px-3 py-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="break-all text-sm font-semibold text-slate-900">{partner.name || data.profile.full_name || data.profile.email}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Partner · {partnerStatusLabel(partner.status)}</p>
            </div>
            <button type="button" onClick={handleLogout} className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-red-200 hover:text-red-600">
              <LogOut className="h-4 w-4" />
              Abmelden
            </button>
          </div>
        </aside>

        <section className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-4 py-4 sm:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Menü öffnen" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 lg:hidden">
                  <Menu className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Partnerportal</p>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{sectionMeta.title}</h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAvailabilityToggle(!partner.is_available)}
                  className={cx(
                    'hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors sm:inline-flex',
                    partner.is_available ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500',
                  )}
                  disabled={actionInFlight === 'availability'}
                >
                  <span className={cx('h-2 w-2 rounded-full', partner.is_available ? 'bg-emerald-500' : 'bg-slate-400')} />
                  {partner.is_available ? 'Verfügbar' : 'Pausiert'}
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNotifications((current) => !current)}
                    aria-label="Hinweise öffnen"
                    className="relative rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition-colors hover:text-brand-blue"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadNotifications.length > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {unreadNotifications.length}
                      </span>
                    ) : null}
                  </button>
                  {showNotifications ? (
                    <div className="absolute right-0 z-30 mt-2 w-[320px] rounded-xl border border-slate-200 bg-white p-2 shadow-[0_8px_24px_rgba(15,23,42,0.12)]">
                      <p className="mb-2 px-2 pt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Hinweise</p>
                      {data.notifications.length ? (
                        <div className="space-y-1 max-h-[340px] overflow-y-auto">
                          {data.notifications.slice(0, 8).map((entry) => (
                            <button
                              key={entry.id}
                              type="button"
                              onClick={() => handleMarkNotificationRead(entry.id)}
                              className={cx(
                                'block w-full rounded-lg border p-3 text-left transition-colors',
                                entry.is_read ? 'border-slate-100 bg-white' : 'border-brand-blue/30 bg-brand-blue/5',
                              )}
                            >
                              <p className="text-sm font-semibold text-slate-900">{entry.title || 'Hinweis'}</p>
                              <p className="mt-1 text-xs font-medium text-slate-500">{entry.message || '-'}</p>
                              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{formatDateTime(entry.created_at)}</p>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm font-medium text-slate-500">Keine Hinweise vorhanden.</p>
                      )}
                    </div>
                  ) : null}
                </div>

                <button type="button" onClick={handleLogout} className="hidden rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-red-200 hover:text-red-600 sm:inline-flex sm:items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  Abmelden
                </button>
              </div>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500">{sectionMeta.subtitle}</p>
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
                onRefund={handleRefundPurchase}
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
              className="inline-flex items-center gap-2 rounded-2xl bg-brand-blue px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
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
            <button type="button" onClick={() => onSwitchSection('marketplace')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue">
              Alle ansehen
            </button>
          }
        >
          {data.marketplace.length === 0 ? (
            <EmptyState title="Keine offenen Anfragen" text="Sobald passende Kundenanfragen für Ihre Region eingehen, erscheinen sie hier." />
          ) : (
            <div className="space-y-3">
              {data.marketplace.slice(0, 4).map((entry) => (
                <div key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{serviceLabel(entry.service_category)} · {entry.von_city_masked} → {entry.nach_city_masked}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {[entry.size_info, entry.rooms_info ? `${entry.rooms_info} Zi.` : null, entry.move_date ? `Termin ${formatDate(entry.move_date)}` : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-brand-blue/15 bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">{formatCurrency(entry.price)}</span>
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
            <button type="button" onClick={() => onSwitchSection('myleads')} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue">
              Alle ansehen
            </button>
          }
        >
          {data.myLeads.length === 0 ? (
            <EmptyState title="Noch keine Anfragen gekauft" text="Sobald Sie eine Anfrage aus dem Marktplatz kaufen, erscheinen die Kontaktdaten hier." />
          ) : (
            <div className="space-y-3">
              {data.myLeads.slice(0, 4).map((entry) => (
                <div key={entry.id} className="flex flex-col gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{entry.customer_name || 'Kunde'}</p>
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
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Tarif</p>
            <p className="mt-1 text-base font-bold text-slate-900">{partner.category || 'Standard Anfragen'}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{data.pricingTier ? formatCurrency(data.pricingTier.price) + ' pro Anfrage' : '-'}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Paket</p>
            <p className="mt-1 text-base font-bold text-slate-900">{partner.package_code || 'FREE'}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">{partner.lead_limit_monthly > 0 ? `${partner.lead_limit_used}/${partner.lead_limit_monthly} genutzt` : 'Kein Monatslimit'}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Verifizierung</p>
            <p className="mt-1 text-base font-bold text-slate-900">{verificationLabel(partner.verification_status)}</p>
            <p className="mt-1 text-xs font-medium text-slate-500">Status: {partnerStatusLabel(partner.status)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Region</p>
            <p className="mt-1 text-base font-bold text-slate-900">{data.serviceRegions[0]?.city || partner.regions || '-'}</p>
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
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
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
              <article key={entry.id} className="flex flex-col gap-4 rounded-xl border border-white/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-blue">{serviceLabel(entry.service_category)}</p>
                    <h3 className="mt-1 text-lg font-bold text-slate-950">{entry.von_city_masked} → {entry.nach_city_masked}</h3>
                    <p className="text-xs font-medium text-slate-500">
                      {[entry.von_plz_masked, entry.nach_plz_masked].filter(Boolean).join(' / ') || 'Postleitzahl wird nach Kauf sichtbar'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-brand-blue/15 bg-brand-blue/10 px-4 py-2 text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-blue">Preis</p>
                    <p className="text-lg font-bold text-brand-blue">{formatCurrency(entry.price)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs">
                  <div>
                    <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Termin</p>
                    <p className="mt-1 font-bold text-slate-800">{entry.move_date ? formatDate(entry.move_date) : 'Flexibel'}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Größe</p>
                    <p className="mt-1 font-bold text-slate-800">{entry.size_info || entry.sqm || '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Räume</p>
                    <p className="mt-1 font-bold text-slate-800">{entry.rooms_info || '-'}</p>
                  </div>
                  <div>
                    <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Erreichbarkeit</p>
                    <p className="mt-1 font-bold text-slate-800">{entry.erreichbarkeit || 'k. A.'}</p>
                  </div>
                </div>

                {entry.additional_services && entry.additional_services.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {entry.additional_services.map((service) => (
                      <span key={service} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
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
  onRefund,
  actionInFlight,
}: {
  data: DashboardData;
  statusDraft: Record<string, { status: string; notes: string }>;
  onDraftChange: (orderId: string, draft: { status: string; notes: string }) => void;
  onStatusSave: (orderId: string) => Promise<void>;
  onRefund: (purchaseId: string, reason: string) => Promise<boolean>;
  actionInFlight: string | null;
}) {
  const [refundFor, setRefundFor] = useState<DashboardData['myLeads'][number] | null>(null);

  if (data.myLeads.length === 0) {
    return <EmptyState title="Noch keine gekauften Anfragen" text="Sobald Sie eine Anfrage gekauft haben, erscheinen Kontaktdaten und Statusoptionen hier." />;
  }

  return (
    <div className="space-y-4">
      {data.myLeads.map((entry) => {
        const draft = statusDraft[entry.id] || { status: '', notes: '' };
        const saving = actionInFlight === `status:${entry.id}`;
        const refunding = actionInFlight === `refund:${entry.purchase_id}`;
        const canRefund = entry.status !== 'Abgeschlossen';
        return (
          <article key={entry.id} className="rounded-xl border border-white/90 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-blue">{serviceLabel(entry.service_category)} · {entry.order_number || entry.id.slice(0, 8)}</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{entry.customer_name || 'Kunde'}</h3>
                <p className="text-xs font-medium text-slate-500">Gekauft am {formatDateTime(entry.purchased_at)} für {formatCurrency(entry.purchase_price)}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge label={statusLabel(entry.status)} tone={statusToneClass(entry.status)} />
                {canRefund ? (
                  <button
                    type="button"
                    onClick={() => setRefundFor(entry)}
                    disabled={refunding}
                    className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-red-200 hover:text-red-600 disabled:opacity-60"
                  >
                    {refunding ? 'Wird bearbeitet…' : 'Reklamieren'}
                  </button>
                ) : null}
              </div>
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
                  <span key={service} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600">
                    {service}
                  </span>
                ))}
              </div>
            ) : null}

            {entry.notes ? (
              <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-line">{entry.notes}</div>
            ) : null}

            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-[180px_1fr_auto] sm:items-end">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Status aktualisieren</span>
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
                <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Notiz (optional)</span>
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? 'Speichert...' : 'Speichern'}
              </button>
            </div>
          </article>
        );
      })}

      {refundFor ? (
        <RefundDialog
          lead={refundFor}
          inFlight={actionInFlight === `refund:${refundFor.purchase_id}`}
          onClose={() => setRefundFor(null)}
          onConfirm={async (reason) => {
            const success = await onRefund(refundFor.purchase_id, reason);
            if (success) setRefundFor(null);
          }}
        />
      ) : null}
    </div>
  );
}

function RefundDialog({
  lead,
  inFlight,
  onClose,
  onConfirm,
}: {
  lead: DashboardData['myLeads'][number];
  inFlight: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void | Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const presets = [
    'Telefonnummer ist nicht erreichbar.',
    'E-Mail-Adresse ist ungültig.',
    'Kunde hat die Anfrage zurückgezogen.',
    'Falsche oder unvollständige Angaben im Auftrag.',
    'Region passt nicht zu meinem Einsatzgebiet.',
  ];
  const refundLabel = Number(lead.purchase_price) > 0
    ? `${formatCurrency(lead.purchase_price)} Guthaben`
    : '1 Bonus-Token';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-600">Anfrage reklamieren</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{lead.customer_name || 'Anfrage'}</h2>
            <p className="text-sm text-slate-500">Bei berechtigter Reklamation erhalten Sie {refundLabel} zurück und der Auftrag wird wieder freigegeben.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={inFlight}
            aria-label="Schließen"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-60"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Begründung</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Bitte erläutern Sie kurz, warum die Anfrage nicht verwertbar ist."
            rows={4}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
          />
          <p className="mt-1 text-xs text-slate-400">Mindestens 10 Zeichen.</p>
        </label>

        <div className="mt-3 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setReason((current) => (current.trim() ? current : preset))}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
            >
              {preset}
            </button>
          ))}
        </div>

        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          Hinweis: Reklamationen werden protokolliert. Bei Missbrauch behalten wir uns die Sperrung des Kontos vor.
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={inFlight}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={inFlight || reason.trim().length < 10}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
          >
            {inFlight ? 'Wird gesendet…' : 'Reklamation absenden'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ icon: Icon, label, value, hint, href }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string | null; hint?: string; href?: string }) {
  const content = (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-brand-blue/15 bg-brand-blue/10 text-brand-blue">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
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
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Betrag (€)</span>
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
                  className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
                >
                  {preset} €
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Notiz (optional)</span>
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
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60"
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
                <div key={entry.id} className="flex flex-col gap-1 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{formatCurrency(entry.amount)}</p>
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
                <tr className="text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
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
                      <td className="py-3 pr-4 font-semibold text-slate-800">{transactionLabel(entry.type)}</td>
                      <td className="py-3 pr-4">{entry.description || '-'}</td>
                      <td className={cx('py-3 pr-4 text-right font-semibold', positive ? 'text-emerald-600' : 'text-red-600')}>
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

const SERVICE_MODE_OPTIONS: Array<{ value: 'UMZUG' | 'ENTRUEMPELUNG' | 'BEIDES'; label: string; description: string; icon: React.ComponentType<{ className?: string }> }> = [
  { value: 'UMZUG', label: 'Umzüge', description: 'Privatumzüge, Firmenumzüge, Auslandsumzüge.', icon: Truck },
  { value: 'ENTRUEMPELUNG', label: 'Entrümpelungen', description: 'Wohnungs-, Haus- und Gewerbeentrümpelungen.', icon: Package },
  { value: 'BEIDES', label: 'Umzüge & Entrümpelungen', description: 'Beide Leistungen aus einer Hand anbieten.', icon: Building2 },
];

const RADIUS_PRESETS = [10, 25, 50, 75, 100, 150];

function ProfileSection({
  data,
  form,
  onChange,
  onSubmit,
  actionInFlight,
  onAvailabilityToggle,
}: {
  data: DashboardData;
  form: {
    phone: string;
    websiteUrl: string;
    emailNotif: boolean;
    smsNotif: boolean;
    smsNumber: string;
    fullName: string;
    city: string;
    postalCode: string;
    radiusKm: number;
    serviceMode: 'UMZUG' | 'ENTRUEMPELUNG' | 'BEIDES';
  };
  onChange: (changes: Partial<{
    phone: string;
    websiteUrl: string;
    emailNotif: boolean;
    smsNotif: boolean;
    smsNumber: string;
    fullName: string;
    city: string;
    postalCode: string;
    radiusKm: number;
    serviceMode: 'UMZUG' | 'ENTRUEMPELUNG' | 'BEIDES';
  }>) => void;
  onSubmit: (event: React.FormEvent) => Promise<void>;
  actionInFlight: string | null;
  onAvailabilityToggle: (next: boolean) => Promise<void>;
}) {
  const partner = data.partner;
  const profile = data.profile;

  return (
    <div className="space-y-6">
      <SectionCard
        title="Firmen-Stammdaten"
        description="Firma und E-Mail-Adresse können nur unser Support-Team ändern. Bitte schreiben Sie uns, falls hier etwas korrigiert werden muss."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <ReadOnlyRow icon={Building2} label="Firma" value={partner.name} />
          <ReadOnlyRow icon={Mail} label="E-Mail" value={profile.email || partner.email} />
        </div>
      </SectionCard>

      <SectionCard
        title="Profil bearbeiten"
        description="Aktualisieren Sie Ansprechperson, Website, Region und Leistungen jederzeit selbst."
      >
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <FieldInput
              label="Ansprechperson"
              icon={User2}
              value={form.fullName}
              onChange={(value) => onChange({ fullName: value })}
              placeholder="Max Mustermann"
              required
            />
            <FieldInput
              label="Website"
              icon={Globe2}
              value={form.websiteUrl}
              onChange={(value) => onChange({ websiteUrl: value })}
              placeholder="https://..."
            />
            <FieldInput
              label="Telefon"
              icon={Phone}
              value={form.phone}
              onChange={(value) => onChange({ phone: value })}
              placeholder="+49 170 1234567"
              required
            />
          </div>

          <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Einsatzgebiet</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Stadt und Radius bestimmen, welche Anfragen Sie im Marktplatz sehen.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <FieldInput
                label="Stadt"
                icon={MapPin}
                value={form.city}
                onChange={(value) => onChange({ city: value })}
                placeholder="z. B. Berlin"
                required
                wide
              />
              <FieldInput
                label="Postleitzahl"
                value={form.postalCode}
                onChange={(value) => onChange({ postalCode: value.replace(/\D/g, '').slice(0, 5) })}
                placeholder="10115"
                inputMode="numeric"
                maxLength={5}
              />
            </div>
            <div>
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Einsatzradius</p>
                  <p className="mt-1 text-2xl font-bold text-slate-950">{form.radiusKm} km</p>
                </div>
              </div>
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={form.radiusKm}
                onChange={(event) => onChange({ radiusKm: Number(event.target.value) })}
                className="brand-range mt-3 w-full cursor-pointer"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                {RADIUS_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => onChange({ radiusKm: preset })}
                    className={cx(
                      'rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors',
                      form.radiusKm === preset
                        ? 'border-brand-blue bg-brand-blue text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue',
                    )}
                  >
                    {preset} km
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Leistungen</p>
              <p className="mt-1 text-sm font-medium text-slate-500">Welche Anfragen möchten Sie erhalten?</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {SERVICE_MODE_OPTIONS.map((option) => {
                const active = form.serviceMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => onChange({ serviceMode: option.value })}
                    className={cx(
                      'flex h-full flex-col items-start gap-3 rounded-xl border-2 p-4 text-left transition-all',
                      active
                        ? 'border-brand-blue bg-brand-blue/5 shadow-[0_14px_30px_rgba(2,118,200,0.14)]'
                        : 'border-slate-200 bg-white hover:border-brand-blue/40 hover:bg-brand-blue/5',
                    )}
                  >
                    <span className={cx(
                      'flex h-10 w-10 items-center justify-center rounded-2xl border transition-colors',
                      active ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-200 bg-slate-50 text-brand-blue',
                    )}>
                      <option.icon className="h-4 w-4" />
                    </span>
                    <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                    <p className="text-xs font-medium text-slate-500">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
            <ToggleRow label="E-Mail-Benachrichtigungen" description="Neue Anfragen, Statusänderungen, Aufladungen" checked={form.emailNotif} onChange={(value) => onChange({ emailNotif: value })} />
            <ToggleRow label="SMS-Benachrichtigungen" description="Sofortige SMS bei dringenden Anfragen" checked={form.smsNotif} onChange={(value) => onChange({ smsNotif: value })} />
          </div>

          {form.smsNotif ? (
            <FieldInput
              label="SMS-Nummer"
              icon={Phone}
              value={form.smsNumber}
              onChange={(value) => onChange({ smsNumber: value })}
              placeholder="+49 ..."
              wide
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Verfügbarkeit</p>
              <p className="text-xs font-medium text-slate-500">Pausieren Sie eingehende Anfragen, ohne Ihr Konto zu deaktivieren.</p>
            </div>
            <button
              type="button"
              onClick={() => onAvailabilityToggle(!partner.is_available)}
              disabled={actionInFlight === 'availability'}
              className={cx(
                'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-colors',
                partner.is_available ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500',
              )}
            >
              <span className={cx('h-2.5 w-2.5 rounded-full', partner.is_available ? 'bg-emerald-500' : 'bg-slate-400')} />
              {partner.is_available ? 'Verfügbar' : 'Pausiert'}
            </button>
          </div>

          <button
            type="submit"
            disabled={actionInFlight === 'profile'}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 disabled:opacity-60 sm:w-auto"
          >
            <CheckCircle2 className="h-4 w-4" />
            {actionInFlight === 'profile' ? 'Speichert...' : 'Profil speichern'}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="Konto-Status" description="Aktueller Status Ihrer Mitgliedschaft.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Verifizierung</p>
            <p className="mt-1 text-base font-bold text-slate-900">{verificationLabel(partner.verification_status)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Status</p>
            <p className="mt-1 text-base font-bold text-slate-900">{partnerStatusLabel(partner.status)}</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Mitglied seit</p>
            <p className="mt-1 text-base font-bold text-slate-900">{formatDate(partner.created_at)}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

function ReadOnlyRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-100/60 p-4">
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-300 bg-white text-slate-500">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          {label}
          <span aria-hidden className="text-slate-300">·</span>
          <span className="text-[10px] font-bold text-slate-400">nicht änderbar</span>
        </p>
        <p className="mt-1 break-words text-sm font-bold text-slate-900">{value || '-'}</p>
      </div>
    </div>
  );
}

function FieldInput({
  label,
  icon: Icon,
  value,
  onChange,
  placeholder,
  required,
  wide,
  inputMode,
  maxLength,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}) {
  return (
    <label className={cx('block', wide ? 'sm:col-span-2' : '')}>
      <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}{required ? ' *' : ''}
      </span>
      <span className="relative block">
        {Icon ? <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" /> : null}
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          required={required}
          inputMode={inputMode}
          maxLength={maxLength}
          className={cx(
            'w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 text-sm font-semibold text-slate-900 outline-none focus:border-brand-blue focus:bg-white',
            Icon ? 'pl-12 pr-4' : 'px-4',
          )}
        />
      </span>
    </label>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-left transition-colors hover:border-brand-blue/40">
      <div>
        <p className="text-sm font-semibold text-slate-900">{label}</p>
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
        { code: 'FREE', name: 'Starter', monthly_price: 0, lead_limit_monthly: 25, priority: 3, release_delay_seconds: 1800, purchasable: false },
        { code: 'PREMIUM', name: 'Pro', monthly_price: 49, lead_limit_monthly: 150, priority: 2, release_delay_seconds: 300, purchasable: data.stripeConfigured },
        { code: 'BUSINESS', name: 'Business', monthly_price: 149, lead_limit_monthly: 500, priority: 1, release_delay_seconds: 0, purchasable: data.stripeConfigured },
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
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-brand-blue/40 hover:text-brand-blue disabled:opacity-60"
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
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">Aktuelles Abo</p>
            <p className="mt-1 font-semibold text-slate-900">
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

      <div className="grid gap-4 pt-3 lg:grid-cols-3">
        {orderedPackages.map((pkg) => {
          const theme = PACKAGE_THEME[pkg.code];
          const isCurrent = pkg.code === currentCode && (pkg.code === 'FREE' || subscriptionStatus === 'ACTIVE' || subscriptionStatus === 'PAST_DUE');
          const subscribing = actionInFlight === `subscribe:${pkg.code}`;
          const isPaid = pkg.code !== 'FREE';
          const isRecommended = pkg.code === 'BUSINESS' && !isCurrent;
          return (
            <article
              key={pkg.code}
              className={cx(
                'relative flex h-full flex-col gap-4 rounded-xl border-2 p-5 transition-all',
                isCurrent
                  ? 'border-emerald-400 bg-emerald-50/60 shadow-[0_18px_45px_rgba(16,185,129,0.12)]'
                  : isRecommended
                    ? 'border-amber-300 bg-gradient-to-br from-amber-50/80 to-white shadow-[0_18px_45px_rgba(245,158,11,0.15)] ring-2 ring-amber-200/60'
                    : theme.accent,
              )}
            >
              {isRecommended ? (
                <span className="pointer-events-none absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-lg ring-1 ring-amber-600/20">
                  <Sparkles className="h-3 w-3" /> Empfohlen
                </span>
              ) : null}
              <header className="space-y-2">
                <span className={cx('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]', theme.chip)}>
                  {pkg.code === 'FREE' ? 'Einstieg' : pkg.code === 'PREMIUM' ? 'Beliebt' : 'Top-Tier'}
                </span>
                <h3 className="text-2xl font-bold text-slate-950">{pkg.name}</h3>
                <p className="text-xs font-medium text-slate-500">{theme.tagline}</p>
              </header>

              <div className="rounded-2xl border border-slate-100 bg-white px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Preis</p>
                <p className="mt-1 text-2xl font-bold text-slate-950">
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
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-white px-4 py-3 text-sm font-semibold text-emerald-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Aktives Paket
                  </span>
                ) : pkg.code === 'FREE' ? (
                  <span className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-500">
                    Standard ohne Buchung
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSubscribe(pkg.code as 'PREMIUM' | 'BUSINESS')}
                    disabled={!data.stripeConfigured || !pkg.purchasable || subscribing}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-blue/20 transition-colors hover:bg-brand-blue-hover disabled:opacity-60"
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
