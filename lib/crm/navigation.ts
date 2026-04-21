export const crmNavigation = {
  admin: [
    { label: 'Übersicht', description: 'KPIs, Freigaben, Zahlungen und operative Status.', href: '/crm/admin' },
    { label: 'Partner', description: 'Partnerprofile, Verifizierung, Pakete und Sperrungen.', href: '/crm/admin/partners' },
    { label: 'Leads', description: 'Lead-Verarbeitung, Matching und manuelle Zuweisung.', href: '/crm/admin/leads' },
    { label: 'Zahlungen', description: 'Pakete, Abos, Bankdaten und Zahlungsstatus.', href: '/crm/admin/payments' },
    { label: 'Einstellungen', description: 'Systemregeln, Preise und Konfiguration.', href: '/crm/admin/settings' },
    { label: 'Chats', description: 'Gespeicherte Chatverläufe und Kontaktanfragen.', href: '/crm/admin/chats' },
  ],
  partner: [
    { label: 'Übersicht', description: 'Status, Limits, Paket und offene Aufgaben.', href: '/crm/partner' },
    { label: 'Leads', description: 'Freigegebene Leads und Bearbeitungsstände.', href: '/crm/partner/leads' },
    { label: 'Profil', description: 'Leistungsarten, Regionen und Firmendaten.', href: '/crm/partner/profile' },
    { label: 'Abrechnung', description: 'Paket, Zahlungsstatus und Buchungshistorie.', href: '/crm/partner/billing' },
  ],
  employee: [
    { label: 'Arbeitsbereich', description: 'Platzhalter für spätere operative Module.', href: '/crm/employee' },
    { label: 'Leads', description: 'Später eingeschränkter Scope nach Aufgabenbereich.', href: '/crm/employee/leads' },
  ],
} as const;
