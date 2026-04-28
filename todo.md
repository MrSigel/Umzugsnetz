# Manuelle Aufgaben

Diese Schritte muss du selbst (oder dein DevOps/Buchhaltung) durchführen, weil sie externe Konten oder Secrets betreffen.

## 1. Supabase – Schema-Migration ausführen
- [ ] In Supabase → **SQL Editor** den vollständigen Inhalt von [`schema.sql`](schema.sql) ausführen.
  - Das Skript ist idempotent (`IF NOT EXISTS`, `DROP POLICY IF EXISTS`, `CREATE OR REPLACE FUNCTION`), kann also auch auf einer bestehenden Datenbank laufen.
  - Wichtigste neue Bestandteile dieses Updates:
    - `notifications.audience` und `notifications.partner_id`
    - überarbeitete `claim_partner_bonus`-Funktion (1–5 Token statt 1–3)
    - getrennte RLS-Policies für Staff- und Partner-Notifications
- [ ] Optional: Bestehende Notifications, die noch das alte Format haben, prüfen
  ```sql
  UPDATE notifications SET audience = 'STAFF' WHERE audience IS NULL;
  ```

## 2. Stripe – Konto und Produkte einrichten
- [ ] Stripe-Account anlegen (oder bestehenden nutzen) und Verifizierung abschließen.
- [ ] Im Stripe-Dashboard zwei **wiederkehrende** Produkte anlegen:
  - **Premium** – 99 € / Monat
  - **Business** – 249 € / Monat
- [ ] Die jeweilige `price_…`-ID notieren – sie kommt gleich in die Env-Vars.
- [ ] Unter **Developers → Webhooks** einen neuen Endpoint hinzufügen:
  - URL: `https://<deine-domain>/api/stripe/webhook`
  - Events:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `payment_intent.succeeded`
  - Den dort generierten `whsec_…` Webhook-Secret kopieren.

## 3. Environment Variablen setzen
Trag die folgenden Variablen in dein Hosting (Vercel → Project Settings → Environment Variables, oder lokal in `.env.local`) ein:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Stripe
STRIPE_SECRET_KEY=sk_live_... # bzw. sk_test_... in Test-Umgebungen
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PREMIUM=price_...     # 99 €/Monat
STRIPE_PRICE_BUSINESS=price_...    # 249 €/Monat

# App
APP_BASE_URL=https://umzugsnetz.de   # bzw. https://staging-… für Test-Umgebung

# Optional: SMTP für Partner-/Kunden-Mails
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="Umzugsnetz <kontakt@umzugsnetz.de>"
EMAIL_WEBHOOK_URL=...   # nur falls als Fallback gewünscht
SMS_WEBHOOK_URL=...     # für SMS-Benachrichtigungen
```

> Nach jeder Änderung in Vercel: ein Redeploy auslösen, sonst werden die Variablen nicht aktiv.

## 4. Stripe-Produkte testen
- [ ] Mit einer Test-Karte (z. B. `4242 4242 4242 4242`) im Test-Modus von Stripe einen Checkout-Flow durchspielen
  - Pakete-Buchung im Partner-Dashboard
  - Manuelle Aufladung im Partner-Dashboard
- [ ] In Supabase die Tabellen `subscriptions`, `wallet_topup_requests`, `wallet_transactions` und `partners.balance` prüfen, ob die Webhook-Verarbeitung funktioniert hat.

## 5. Auth-Settings in Supabase
- [ ] Unter **Authentication → URL Configuration** Site URL auf die echte Domain setzen, sonst klappen die `redirectTo`-Links für Mitarbeiter-Einladungen nicht.
- [ ] Unter **Authentication → Email Templates** prüfen, dass die "Invite User"-Mail (für Mitarbeiter via `/api/team/invite`) und die "Reset Password"-Mail einen sinnvollen Wortlaut haben.
- [ ] Unter **Authentication → Providers** sicherstellen, dass E-Mail/Password aktiv ist.

## 6. Stripe Customer-Portal aktivieren
- [ ] Stripe-Dashboard → **Settings → Billing → Customer Portal** öffnen und das Portal aktivieren (Buttons "Save"). Sonst schlägt der "Abo verwalten"-Button im Partner-Dashboard fehl.

## 7. DSGVO & Rechtliches
- [ ] AVV (Auftragsverarbeitungsvertrag) mit Stripe abschließen (Stripe-Dashboard → Settings → DPA).
- [ ] AVV mit Supabase abschließen (Dashboard → Settings → Compliance).
- [ ] In den AGB / Datenschutzbestimmungen erwähnen: Zahlungsabwickler Stripe, Datenbank Supabase.
- [ ] In `app/datenschutz/page.tsx` die tatsächlichen Verarbeiter eintragen (falls noch Platzhalter).

## 8. Optional: Deployment-Check
- [ ] `npm run build` lokal lauffähig (sollte aktuell grün sein – ist bereits Teil der CI-Verifikation).
- [ ] Vercel-Deployment einmal frisch laufen lassen, danach
  - `/` aufrufen (öffentliche Landingpage)
  - `/login` → Tab "Registrieren" → Test-Firma anlegen
  - in Supabase Auth den User auf "email_confirmed_at" setzen, weiter ins Onboarding, zum `/crm/partner` Dashboard
  - eine Stripe-Aufladung im Test-Modus durchführen
- [ ] Falls ein Hosting-spezifischer Cron benötigt wird (z. B. zum Schließen alter Topups), das später eintragen.

## 9. Daten-Cleanup (einmalig)
- [ ] Bestehende `partner_invite_codes` archivieren oder leeren – seit der Self-Service-Registrierung werden sie nicht mehr genutzt.
  ```sql
  UPDATE partner_invite_codes SET is_used = TRUE WHERE is_used IS DISTINCT FROM TRUE;
  ```
- [ ] Bestehende Test-Notifications mit altem Format prüfen (sind nun automatisch `audience = 'STAFF'`).

## 10. Smoke-Test der drei Dashboards
- [ ] **Admin-Dashboard** (`/admin`) → "Hinweise" enthält nur Staff-Notifications (NEW_ORDER, ORDER_MATCHING, CHAT_*, PARTNER_LEAD_PURCHASE, PARTNER_TOPUP_COMPLETED, …).
- [ ] **Mitarbeiter-Dashboard** (`/admin` mit Rolle EMPLOYEE) → sieht reduzierte Sidebar (Übersicht, Arbeiten, Kunden, Support).
- [ ] **Partner-Dashboard** (`/crm/partner`) → "Hinweise" enthält ausschließlich `PARTNER_NEW_LEAD` für die eigene Firma.

> Wenn ein Notification-Typ doch im falschen Dashboard auftaucht, das `audience`-Feld in der entsprechenden API-Stelle korrigieren – Default ist `STAFF`, Partner-Hinweise brauchen explizit `audience: 'PARTNER'` + `partner_id`.
