import {
  CircleDollarSign,
  BriefcaseBusiness,
  Building2,
  FileText,
  Gauge,
  Handshake,
  LayoutTemplate,
  Mail,
  MessageSquareText,
  ReceiptText,
  Settings2,
  SplitSquareVertical,
  TriangleAlert,
  UserCog,
  Users,
} from 'lucide-react';

export type AdminSectionId =
  | 'dashboard'
  | 'work'
  | 'customers'
  | 'requests'
  | 'partners'
  | 'distribution'
  | 'employees'
  | 'tickets'
  | 'billing'
  | 'content'
  | 'team-chat'
  | 'settings';

export type StaffRole = 'ADMIN' | 'EMPLOYEE';
export type StatusTone = 'blue' | 'amber' | 'emerald' | 'red' | 'slate';

export type NavItem = {
  id: AdminSectionId;
  label: string;
  icon: typeof Gauge;
  counter?: string;
};

export type PortalLead = {
  id: string;
  partner_id?: string | null;
  order_number?: string | null;
  service_category?: string | null;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  move_date?: string | null;
  von_city?: string | null;
  von_address?: string | null;
  nach_city?: string | null;
  nach_address?: string | null;
  estimated_price?: number | string | null;
  status?: string | null;
  notes?: string | null;
  created_at?: string | null;
  city?: string | null;
};

export type PortalPartner = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  regions?: string | null;
  status?: string | null;
  category?: string | null;
  service?: string | null;
  balance?: number | string | null;
  settings?: {
    address?: string | null;
    contact_person?: string | null;
    notes?: string | null;
    internal_notes?: string | null;
    [key: string]: unknown;
  } | null;
};

export type PortalTransaction = {
  id: string;
  type?: string | null;
  amount?: number | string | null;
  description?: string | null;
  created_at?: string | null;
};

export type PortalNotification = {
  id: string;
  title?: string | null;
  message?: string | null;
  created_at?: string | null;
  is_read?: boolean | null;
};

export type PortalTicket = {
  session_id: string;
  user_name?: string | null;
  support_category?: string | null;
  last_message?: string | null;
  last_at?: string | null;
  unread_count?: number;
  messages?: Array<{
    id?: string | null;
    sender?: string | null;
    text?: string | null;
    is_read?: boolean | null;
    created_at?: string | null;
  }>;
};

export type PortalSetting = {
  id: string;
  key?: string | null;
  value?: unknown;
};

export type PortalTeam = {
  id: string;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export type PortalResponse = {
  role: StaffRole;
  kpis?: {
    leads: number;
    orders: number;
    revenue: number;
    closeRate: number;
    averageOrderValue: number;
  };
  cities?: string[];
  leads?: PortalLead[];
  partners?: PortalPartner[];
  transactions?: PortalTransaction[];
  notifications?: PortalNotification[];
  tickets?: PortalTicket[];
  team?: PortalTeam[];
  settings?: PortalSetting[];
  workStats?: {
    totalCalls: number;
    callsToday: number;
    callsThisHour: number;
    won: number;
    lost: number;
    recontact: number;
    deleted: number;
    successRate: number;
    lastCallAt?: string | null;
  };
};

export type ContentRecord = {
  id: string;
  title: string;
  category: 'Ratgeber' | 'FAQ';
  updatedAt: string;
  owner: string;
  route: string;
  status: 'Live';
};

export const baseNavigation: Record<StaffRole, NavItem[]> = {
  ADMIN: [
    { id: 'dashboard', label: 'Übersicht', icon: Gauge },
    { id: 'work', label: 'Arbeiten', icon: BriefcaseBusiness },
    { id: 'customers', label: 'Firmen', icon: Building2 },
    { id: 'requests', label: 'Anfragen', icon: Mail },
    { id: 'partners', label: 'Partner', icon: Handshake },
    { id: 'distribution', label: 'Anfragen-Verteilung', icon: SplitSquareVertical },
    { id: 'employees', label: 'Mitarbeiter', icon: UserCog },
    { id: 'tickets', label: 'Support', icon: MessageSquareText },
    { id: 'team-chat', label: 'Team Chat', icon: MessageSquareText },
    { id: 'billing', label: 'Abrechnung', icon: ReceiptText },
    { id: 'content', label: 'Inhalte', icon: LayoutTemplate },
    { id: 'settings', label: 'Einstellungen', icon: Settings2 },
  ],
  EMPLOYEE: [
    { id: 'dashboard', label: 'Übersicht', icon: Gauge },
    { id: 'work', label: 'Arbeiten', icon: BriefcaseBusiness },
    { id: 'customers', label: 'Firmen', icon: Building2 },
    { id: 'tickets', label: 'Support', icon: MessageSquareText },
    { id: 'team-chat', label: 'Team Chat', icon: MessageSquareText },
  ],
};

export const liveContentItems: ContentRecord[] = [
  {
    id: 'guide-umzug-planen',
    title: 'Umzug planen: In 10 Schritten zum stressfreien Wechsel',
    category: 'Ratgeber',
    updatedAt: 'Landingpage',
    owner: 'Redaktion',
    route: '/ratgeber/umzug-planen',
    status: 'Live',
  },
  {
    id: 'guide-umzug-checkliste',
    title: 'Die ultimative Umzug-Checkliste (PDF & Online)',
    category: 'Ratgeber',
    updatedAt: 'Landingpage',
    owner: 'Redaktion',
    route: '/ratgeber/umzug-checkliste',
    status: 'Live',
  },
  {
    id: 'guide-umzugskosten-berechnen',
    title: 'Umzugskosten berechnen: Was kostet es wirklich?',
    category: 'Ratgeber',
    updatedAt: 'Landingpage',
    owner: 'Redaktion',
    route: '/ratgeber/umzugskosten-berechnen',
    status: 'Live',
  },
  {
    id: 'faq-1',
    title: 'Wie genau funktioniert der Vergleich?',
    category: 'FAQ',
    updatedAt: 'Landingpage',
    owner: 'Support',
    route: '/#faq',
    status: 'Live',
  },
  {
    id: 'faq-2',
    title: 'Ist der Service wirklich kostenlos?',
    category: 'FAQ',
    updatedAt: 'Landingpage',
    owner: 'Support',
    route: '/#faq',
    status: 'Live',
  },
  {
    id: 'faq-3',
    title: 'Wie werden die Partnerunternehmen geprüft?',
    category: 'FAQ',
    updatedAt: 'Landingpage',
    owner: 'Support',
    route: '/#faq',
    status: 'Live',
  },
  {
    id: 'faq-4',
    title: 'Muss ich ein Angebot annehmen?',
    category: 'FAQ',
    updatedAt: 'Landingpage',
    owner: 'Support',
    route: '/#faq',
    status: 'Live',
  },
  {
    id: 'faq-5',
    title: 'Wie schnell erhalte ich die Angebote?',
    category: 'FAQ',
    updatedAt: 'Landingpage',
    owner: 'Support',
    route: '/#faq',
    status: 'Live',
  },
];

export const emptyStateBySection: Record<AdminSectionId, { title: string; text: string }> = {
  dashboard: {
    title: 'Noch keine Daten in der Übersicht',
    text: 'Sobald Anfragen, Hinweise oder Transaktionen vorhanden sind, erscheinen sie hier.',
  },
  requests: {
    title: 'Keine Anfragen gefunden',
    text: 'Aktuell liegen für den gewählten Filter keine Anfragen oder Aufträge vor.',
  },
  work: {
    title: 'Keine Kunden zum Bearbeiten',
    text: 'Sobald offene Anfragen vorhanden sind, erscheint hier der nächste Kunde.',
  },
  customers: {
    title: 'Keine Firmen hinterlegt',
    text: 'Sobald Partnerfirmen gespeichert sind, erscheinen sie hier.',
  },
  'team-chat': {
    title: 'Kein aktiver Kanal',
    text: 'Sobald Sie einen Kanal auswählen, erscheinen die Nachrichten hier.',
  },
  partners: {
    title: 'Keine Partner verfügbar',
    text: 'In der Datenbank sind aktuell keine Partnerdatensätze für diese Ansicht vorhanden.',
  },
  distribution: {
    title: 'Keine offene Anfragen-Verteilung',
    text: 'Es gibt aktuell keine offenen oder prüfpflichtigen Anfragen für die Zuweisung.',
  },
  employees: {
    title: 'Keine Mitarbeiter vorhanden',
    text: 'Sobald Nutzer in der `team`-Tabelle existieren, erscheinen sie hier.',
  },
  tickets: {
    title: 'Keine Support-Anfragen vorhanden',
    text: 'Eingehende Chat-Anfragen erscheinen hier automatisch, sobald Nachrichten gespeichert sind.',
  },
  billing: {
    title: 'Keine Abrechnungsdaten vorhanden',
    text: 'Sobald Transaktionen vorliegen, werden sie hier in der Abrechnung angezeigt.',
  },
  content: {
    title: 'Keine Inhalte gefunden',
    text: 'Es konnten keine echten Ratgeber- oder FAQ-Einträge geladen werden.',
  },
  settings: {
    title: 'Keine Einstellungen geladen',
    text: 'Sobald Konfigurationen vorhanden sind, erscheinen sie hier.',
  },
};

export const sectionDescriptions: Record<AdminSectionId, string> = {
  dashboard: 'Operative Übersicht auf Basis der aktuellen Plattformdaten.',
  work: 'Telefonischer Bearbeitungsassistent für echte Kundenanfragen.',
  customers: 'Firmen mit Kontaktdaten, Adresse und internen Notizen.',
  'team-chat': 'Interner Team Chat für Geschäftsführer und Mitarbeiter.',
  requests: 'Anfrageeingang, Statuspflege und echte Anfragen aus dem System.',
  partners: 'Partnernetzwerk mit Regionen, Kontakt und Kontostand aus der Datenbank.',
  distribution: 'Offene Anfragen mit tatsächlich passenden Partnern nach Regionen.',
  employees: 'Mitarbeiter per E-Mail einladen und bestehende Zugänge verwalten.',
  tickets: 'Alle gespeicherten Chat-Anfragen und Support-Konversationen.',
  billing: 'Transaktionen, Umsatz und offene Finanzbewegungen aus dem System.',
  content: 'Aktive Ratgeber- und FAQ-Inhalte aus der eingebundenen Website.',
  settings: 'Konfigurationen und Team-Struktur aus den aktuellen Systemdaten.',
};

export const statusToneMap: Record<string, StatusTone> = {
  Neu: 'blue',
  Kontaktiert: 'amber',
  Angebot: 'amber',
  Gebucht: 'emerald',
  Abgelehnt: 'red',
  ACTIVE: 'emerald',
  PENDING: 'amber',
  DISABLED: 'red',
  aktiv: 'emerald',
  bezahlt: 'emerald',
  offen: 'amber',
  live: 'emerald',
};

export const toneClassMap: Record<StatusTone, string> = {
  blue: 'border-brand-blue/15 bg-brand-blue/10 text-brand-blue',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  red: 'border-red-200 bg-red-50 text-red-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-700',
};

export const kpiIcons = {
  leadsToday: Mail,
  openLeads: FileText,
  activePartners: Handshake,
  conversion: Users,
  revenue: CircleDollarSign,
  complaints: TriangleAlert,
};
