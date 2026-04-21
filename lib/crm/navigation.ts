export const crmNavigation = {
  admin: [
    { label: 'Übersicht', description: 'KPIs, Freigaben, Zahlungen und operative Status.' },
    { label: 'Partner', description: 'Partnerprofile, Verifizierung, Pakete und Sperrungen.' },
    { label: 'Leads', description: 'Lead-Verarbeitung, Matching und manuelle Zuweisung.' },
    { label: 'Einstellungen', description: 'Preise, Pakete, Bankdaten und zentrale Regeln.' },
  ],
  partner: [
    { label: 'Übersicht', description: 'Status, Limits, Paket und offene Aufgaben.' },
    { label: 'Leads', description: 'Freigegebene Leads und Bearbeitungsstände.' },
    { label: 'Profil', description: 'Leistungsarten, Regionen und Firmendaten.' },
    { label: 'Abrechnung', description: 'Paket, Zahlungsstatus und Buchungshistorie.' },
  ],
  employee: [
    { label: 'Arbeitsbereich', description: 'Platzhalter für spätere operative Module.' },
    { label: 'Leads', description: 'Später eingeschränkter Scope nach Aufgabenbereich.' },
  ],
} as const;
