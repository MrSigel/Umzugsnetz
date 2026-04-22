export const crmNavigation = {
  admin: [
    { label: 'Uebersicht', description: 'KPIs, Freigaben, Zahlungen und operative Status.', href: '/crm/admin' },
    { label: 'Benutzer', description: 'Registrierte Accounts und Rollenzuweisung.', href: '/crm/admin/users' },
    { label: 'Partner', description: 'Partnerprofile, Verifizierung, Pakete und Sperrungen.', href: '/crm/admin/partners' },
    { label: 'Leads', description: 'Lead-Verarbeitung, Matching und manuelle Zuweisung.', href: '/crm/admin/leads' },
    { label: 'Zahlungen', description: 'Pakete, Abos, Bankdaten und Zahlungsstatus.', href: '/crm/admin/payments' },
    { label: 'Einstellungen', description: 'Systemregeln, Preise und Konfiguration.', href: '/crm/admin/settings' },
    { label: 'Chats', description: 'Gespeicherte Chatverlaeufe und Kontaktanfragen.', href: '/crm/admin/chats' },
  ],
  partner: [
    { label: 'Uebersicht', description: 'Status, Limits, Paket und offene Aufgaben.', href: '/crm/partner' },
    { label: 'Leads', description: 'Freigegebene Leads und Bearbeitungsstaende.', href: '/crm/partner/leads' },
    { label: 'Profil', description: 'Leistungsarten, Regionen und Firmendaten.', href: '/crm/partner/profile' },
    { label: 'Abrechnung', description: 'Paket, Zahlungsstatus und Buchungshistorie.', href: '/crm/partner/billing' },
  ],
  employee: [
    { label: 'Arbeitsbereich', description: 'Platzhalter fuer spaetere operative Module.', href: '/crm/employee' },
    { label: 'Leads', description: 'Spaeter eingeschraenkter Scope nach Aufgabenbereich.', href: '/crm/employee/leads' },
  ],
} as const;
