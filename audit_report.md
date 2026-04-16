# Audit-Bericht: Umzugapp (Produktionsreife)

Dieser Bericht fasst alle gefundenen Probleme, Mock-Daten und Sackgassen zusammen, die behoben werden müssen, um die App produktionsreif zu machen.

## 1. Landingpage & Widgets

### KostenrechnerWidget (`components/KostenrechnerWidget.tsx`)
- **Status:** Funktioniert größtenteils gut, schreibt bereits in `orders` und `notifications`.
- **Probleme:**
  - Fehlende Try/Catch-Fehlerbehandlung (aktuell nur `alert`).
  - Fehlendes Toast-Feedback (UI-Feedback) bei Erfolg/Fehler.
  - Die Preisberechnung (`livePrice`, `entruempelPrice`) ist fest im Frontend codiert. Idealerweise sollte dies mit der `system_settings`-Konfiguration des Admins synchronisiert werden (optional, aber für echte Produktionsreife wichtig).

### LiveChatWidget (`components/LiveChatWidget.tsx`)
- **Status:** Liest und schreibt in `chat_messages`.
- **Probleme:**
  - Keine Fehlerbehandlung bei Supabase-Aufrufen.
  - Verwendet ein nicht genutztes Import (`uuid`).
  - Fehlendes UI-Feedback bei Verbindungsabbruch.

## 2. Admin-Dashboard

### Übersicht (`app/admin/dashboard/page.tsx`)
- **Status:** Liest Daten korrekt aus Supabase.
- **Probleme:**
  - Der "Details anzeigen"-Button bei den neuesten Aufträgen hat keine Funktion (Sackgasse).
  - Fehlende Try/Catch-Blöcke.

### Aufträge (`app/admin/dashboard/auftraege/page.tsx`)
- **Status:** Liest und aktualisiert `orders`.
- **Probleme:**
  - Keine Try/Catch-Fehlerbehandlung, nur `alert`.
  - Die Detailansicht hat Platzhalter-Sektionen (z. B. "Matched Companies" oder E-Mail-Log), die keine echte Funktion haben.

### Partner (`app/admin/dashboard/partner/page.tsx`)
- **Status:** Liest, bearbeitet und aktualisiert `partners` und `partner_invite_codes`.
- **Probleme:**
  - Guthaben-Aufladung aktualisiert nur die `balance` in der Tabelle `partners`, schreibt aber keinen Eintrag in `transactions` oder `wallet_transactions` (Inkonsistenz der Finanzdaten).
  - Fehlerbehandlung nur über `alert`.

### Finanzen/Einnahmen (`app/admin/dashboard/einnahmen/page.tsx`)
- **Status:** Speichert Preis-Konfigurationen in `system_settings`.
- **Probleme:**
  - Die Partner- und Landingpage-Seiten nutzen diese Einstellungen aktuell nicht (harte Codierung in den jeweiligen Seiten).
  - Fehlerbehandlung nur über `alert`.

### Transaktionen (`app/admin/dashboard/transaktionen/page.tsx`)
- **Status:** Liest `transactions`.
- **Probleme:**
  - Suchfeld, Typ-Select, Datum-Button, CSV-Export und das `MoreVertical`-Menü pro Zeile sind allesamt ohne Funktion (Sackgassen).

### Chat (`app/admin/dashboard/chat/page.tsx`)
- **Status:** Liest und schreibt `chat_messages`.
- **Probleme:**
  - Suchfeld ist ohne Funktion.
  - Header-Buttons (Telefon, Video, More) sind ohne Funktion.
  - Keine Fehlerbehandlung.

## 3. Partner-Dashboard

### Übersicht (`app/partners/dashboard/page.tsx`)
- **Status:** Liest Partner-Daten.
- **Probleme:**
  - Banner "Noch 3 kostenlose Kundenanfragen" ist fest codiert.
  - Buchungen stehen fest auf "0".
  - Buttons "Jetzt aufladen" und "Alle anzeigen" haben keine Funktion (Sackgassen).

### Marktplatz/Anfragen (`app/partners/dashboard/anfragen/page.tsx`)
- **Status:** Liest `orders` und `partner_purchases`, nutzt RPC `purchase_lead`.
- **Probleme:**
  - Die Preise (25/35/45) sind fest codiert und abhängig vom String `partner.category`.
  - Der Tab "Gekauft (0)" hat eine fest codierte Zahl im Tab-Titel.
  - "Vor X Min. veröffentlicht" nutzt `Math.random()`.
  - Filter und Suche sind ohne Funktion.
  - Fehlerbehandlung via `alert`.

### Finanzen (`app/partners/dashboard/finanzen/page.tsx`)
- **Status:** Liest `wallet_transactions`.
- **Probleme:**
  - Die Auflade-Funktion (`handleTopup`) ist ein Mock (`setTimeout` + `alert`). Es gibt keine echte Zahlungsanbindung (Stripe) und keinen Datenbank-Eintrag.
  - Die Preistabelle und die Konditionen sind fest codiert.
  - Bankdaten (IBAN, BIC) sind fest codiert.
  - Ein Button "Sicher bezahlen mit Stripe" ist ohne Funktion.

### Tarife (`app/partners/dashboard/tarife/page.tsx`)
- **Status:** Zeigt Tarife an.
- **Probleme:**
  - Tarife (BASIC, PRO, VIP) und Preise sind komplett fest im Frontend codiert.
  - Die Buttons zur Tarifwahl haben keine Funktion (`onClick` fehlt).
  - Button "Zum Marktplatz" am Ende hat keine Funktion.

### Auto-Topup (`app/partners/dashboard/auto-topup/page.tsx`)
- **Status:** Speichert Einstellungen in `partners.settings.autoTopup`.
- **Probleme:**
  - Es wird suggeriert, dass Stripe automatisch abbucht, aber es gibt keine Backend-Logik dafür (nur UI-Präferenzen).

### Einstellungen (`app/partners/dashboard/settings/page.tsx`)
- **Status:** Aktualisiert `partners` und Auth.
- **Probleme:**
  - Fehlerbehandlung via `alert`.
  - Profil-E-Mail ist in der UI editierbar, wird aber beim Speichern nicht an Supabase Auth übergeben (oder nur unvollständig).

## 4. Datenbank & Schema (Supabase)

Um die Dashboard-übergreifende Konsistenz herzustellen, müssen folgende Anpassungen vorgenommen werden:
1. **Zentrale Preiskonfiguration:** Die hartcodierten Preise im Partner-Dashboard und im Kostenrechner müssen aus `system_settings` gelesen werden.
2. **Transaktions-Konsistenz:** Wenn ein Admin einem Partner Guthaben gutschreibt, muss zwingend ein Eintrag in `wallet_transactions` und ggf. `transactions` erfolgen.
3. **Fehlende Tabellen/RPCs prüfen:** Die RPC `purchase_lead` muss existieren und korrekt funktionieren.

## Nächste Schritte
1. Erstellen einer `schema.sql` zur Überprüfung und Sicherstellung aller benötigten Tabellen.
2. Implementierung eines globalen Toast-Systems für besseres UI-Feedback (Ersatz für `alert`).
3. Systematisches Abarbeiten der Sackgassen und Mock-Daten in den drei Bereichen (Landingpage, Admin, Partner).
