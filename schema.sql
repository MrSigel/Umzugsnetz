-- ============================================================
-- UMZUGAPP - VOLLSTÄNDIGES DATENBANKSCHEMA
-- Stand: April 2026
-- Führe dieses Skript in deiner Supabase SQL-Konsole aus.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ORDERS (Kundenanfragen von der Landingpage)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        TEXT UNIQUE DEFAULT 'ORD-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  service_category    TEXT NOT NULL CHECK (service_category IN ('PRIVATUMZUG', 'FIRMENUMZUG', 'ENTRÜMPELUNG')),
  customer_name       TEXT NOT NULL,
  customer_email      TEXT NOT NULL,
  customer_phone      TEXT NOT NULL,
  move_date           DATE,
  von_city            TEXT,
  von_address         TEXT,
  von_plz             TEXT,
  von_floor           TEXT,
  von_lift            BOOLEAN DEFAULT FALSE,
  nach_city           TEXT,
  nach_address        TEXT,
  nach_plz            TEXT,
  nach_floor          TEXT,
  nach_lift           BOOLEAN DEFAULT FALSE,
  size_info           TEXT,
  rooms_info          TEXT,
  sqm                 TEXT,
  additional_services TEXT[],
  notes               TEXT,
  erreichbarkeit      TEXT,
  estimated_price     NUMERIC(10, 2),
  status              TEXT DEFAULT 'Neu' CHECK (status IN ('Neu', 'In Bearbeitung', 'Abgeschlossen', 'Storniert')),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 2. PARTNERS (Partnerfirmen)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  regions     TEXT,
  service     TEXT DEFAULT 'BEIDES' CHECK (service IN ('UMZUG', 'ENTRÜMPELUNG', 'BEIDES')),
  status      TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'SUSPENDED')),
  category    TEXT DEFAULT 'Standard Anfragen' CHECK (category IN ('Standard Anfragen', 'Priorisierte Anfragen', 'Exklusive Anfragen')),
  balance     NUMERIC(10, 2) DEFAULT 0,
  settings    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS regions TEXT,
  ADD COLUMN IF NOT EXISTS service TEXT DEFAULT 'BEIDES',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ACTIVE',
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Standard Anfragen',
  ADD COLUMN IF NOT EXISTS balance NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────
-- 3. PARTNER_INVITE_CODES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_invite_codes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code        TEXT UNIQUE NOT NULL,
  is_used     BOOLEAN DEFAULT FALSE,
  used_by     UUID REFERENCES partners(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 4. PARTNER_PURCHASES (Welcher Partner hat welchen Lead gekauft)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_purchases (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  price       NUMERIC(10, 2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(partner_id, order_id)
);

-- ─────────────────────────────────────────────────────────────
-- 5. WALLET_TRANSACTIONS (Guthaben-Bewegungen pro Partner)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id  UUID REFERENCES partners(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('TOPUP', 'LEAD_PURCHASE', 'ADMIN_CREDIT', 'REFUND')),
  amount      NUMERIC(10, 2) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ─────────────────────────────────────────────────────────────
-- 6. TRANSACTIONS (Admin-Finanztransaktionen)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID REFERENCES partners(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,
  amount      NUMERIC(10, 2) NOT NULL,
  description TEXT,
  trx_id      TEXT UNIQUE DEFAULT 'TRX-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8)),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 7. NOTIFICATIONS (Admin-Benachrichtigungen)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  link        TEXT,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 8. CHAT_MESSAGES (Live-Chat zwischen Kunden und Admin)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT NOT NULL,
  sender      TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
  user_name   TEXT,
  text        TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 9. SYSTEM_SETTINGS (Admin-Konfigurationen)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Standard-Preiskonfiguration einfügen (falls nicht vorhanden)
INSERT INTO system_settings (key, value) VALUES (
  'pricing_config',
  '{
    "umzug": [
      {"id": "standard", "name": "Standard Anfragen", "label": "Standard", "price": 25},
      {"id": "priorisiert", "name": "Priorisierte Anfragen", "label": "Priorisiert", "price": 35},
      {"id": "exklusiv", "name": "Exklusive Anfragen", "label": "Exklusiv", "price": 45}
    ],
    "entruempelung": [
      {"id": "standard", "name": "Standard Anfragen", "label": "Standard", "price": 25},
      {"id": "priorisiert", "name": "Priorisierte Anfragen", "label": "Priorisiert", "price": 30},
      {"id": "exklusiv", "name": "Exklusive Anfragen", "label": "Exklusiv", "price": 35}
    ]
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- Maintenance Mode
INSERT INTO system_settings (key, value) VALUES (
  'maintenance_mode', '"false"'::jsonb
) ON CONFLICT (key) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 10. TEAM (Admin-Teammitglieder)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'Mitarbeiter',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- 11. RPC: purchase_lead (Atomare Lead-Kauf-Transaktion)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION purchase_lead(
  order_id_param   UUID,
  partner_id_param UUID,
  price_param      NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance NUMERIC;
  partner_user_id UUID;
BEGIN
  -- Aktuelles Guthaben und user_id des Partners abrufen
  SELECT balance, user_id INTO current_balance, partner_user_id
  FROM partners
  WHERE id = partner_id_param
  FOR UPDATE;

  -- Guthaben prüfen
  IF current_balance < price_param THEN
    RAISE EXCEPTION 'Nicht genügend Guthaben. Aktuelles Guthaben: %, Preis: %', current_balance, price_param;
  END IF;

  -- Guthaben abziehen
  UPDATE partners
  SET balance = balance - price_param,
      updated_at = NOW()
  WHERE id = partner_id_param;

  -- Kauf-Eintrag erstellen
  INSERT INTO partner_purchases (partner_id, order_id, price)
  VALUES (partner_id_param, order_id_param, price_param);

  -- Wallet-Transaktion erstellen (negativ = Ausgabe)
  INSERT INTO wallet_transactions (user_id, partner_id, type, amount, description)
  VALUES (
    partner_user_id,
    partner_id_param,
    'LEAD_PURCHASE',
    -price_param,
    'Lead-Kauf: Auftrag ' || order_id_param::TEXT
  );

  -- Admin-Transaktion erstellen (positiv = Einnahme)
  INSERT INTO transactions (partner_id, type, amount, description)
  VALUES (
    partner_id_param,
    'LEAD_PURCHASE',
    price_param,
    'Lead-Verkauf an Partner ' || partner_id_param::TEXT
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 12. RPC: admin_credit_partner (Admin-Gutschrift an Partner)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION admin_credit_partner(
  partner_id_param UUID,
  amount_param     NUMERIC,
  reason_param     TEXT DEFAULT 'Admin-Gutschrift'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  partner_user_id UUID;
BEGIN
  -- user_id des Partners abrufen
  SELECT user_id INTO partner_user_id
  FROM partners
  WHERE id = partner_id_param;

  -- Guthaben erhöhen
  UPDATE partners
  SET balance = balance + amount_param,
      updated_at = NOW()
  WHERE id = partner_id_param;

  -- Wallet-Transaktion erstellen (positiv = Einnahme)
  INSERT INTO wallet_transactions (user_id, partner_id, type, amount, description)
  VALUES (
    partner_user_id,
    partner_id_param,
    'ADMIN_CREDIT',
    amount_param,
    reason_param
  );

  -- Admin-Transaktion erstellen (negativ = Ausgabe/Gutschrift)
  INSERT INTO transactions (partner_id, type, amount, description)
  VALUES (
    partner_id_param,
    'ADMIN_CREDIT',
    -amount_param,
    'Admin-Gutschrift: ' || reason_param
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 13. ROW LEVEL SECURITY (RLS) POLICIES
-- ─────────────────────────────────────────────────────────────

-- RLS aktivieren
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE team ENABLE ROW LEVEL SECURITY;

-- ORDERS: Jeder kann lesen (Landingpage INSERT), nur Auth-User können schreiben
DROP POLICY IF EXISTS "orders_insert_anon" ON orders;
CREATE POLICY "orders_insert_anon" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "orders_select_authenticated" ON orders;
CREATE POLICY "orders_select_authenticated" ON orders FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "orders_update_authenticated" ON orders;
CREATE POLICY "orders_update_authenticated" ON orders FOR UPDATE USING (auth.role() = 'authenticated');

-- PARTNERS: Jeder Partner sieht nur seine eigenen Daten
DROP POLICY IF EXISTS "partners_select_own" ON partners;
CREATE POLICY "partners_select_own" ON partners FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "partners_update_own" ON partners;
CREATE POLICY "partners_update_own" ON partners FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "partners_insert_own" ON partners;
CREATE POLICY "partners_insert_own" ON partners FOR INSERT WITH CHECK (auth.uid() = user_id);

-- PARTNER_PURCHASES: Partner sehen nur ihre eigenen Käufe
DROP POLICY IF EXISTS "purchases_select_own" ON partner_purchases;
CREATE POLICY "purchases_select_own" ON partner_purchases FOR SELECT USING (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "purchases_insert_own" ON partner_purchases;
CREATE POLICY "purchases_insert_own" ON partner_purchases FOR INSERT WITH CHECK (
  partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

-- WALLET_TRANSACTIONS: Partner sehen nur ihre eigenen Transaktionen
DROP POLICY IF EXISTS "wallet_select_own" ON wallet_transactions;
CREATE POLICY "wallet_select_own" ON wallet_transactions FOR SELECT USING (user_id = auth.uid());

-- NOTIFICATIONS: Nur authentifizierte Benutzer können lesen/schreiben
DROP POLICY IF EXISTS "notifications_all_authenticated" ON notifications;
CREATE POLICY "notifications_all_authenticated" ON notifications FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "notifications_insert_anon" ON notifications;
CREATE POLICY "notifications_insert_anon" ON notifications FOR INSERT WITH CHECK (true);

-- CHAT_MESSAGES: Jeder kann lesen und schreiben (für Live-Chat)
DROP POLICY IF EXISTS "chat_messages_all" ON chat_messages;
CREATE POLICY "chat_messages_all" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- SYSTEM_SETTINGS: Nur authentifizierte Benutzer können lesen
DROP POLICY IF EXISTS "settings_select_authenticated" ON system_settings;
CREATE POLICY "settings_select_authenticated" ON system_settings FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "settings_write_authenticated" ON system_settings;
CREATE POLICY "settings_write_authenticated" ON system_settings FOR ALL USING (auth.role() = 'authenticated');

-- PARTNER_INVITE_CODES: Jeder kann lesen (für Registrierung), nur Auth kann schreiben
DROP POLICY IF EXISTS "invite_codes_select_all" ON partner_invite_codes;
CREATE POLICY "invite_codes_select_all" ON partner_invite_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "invite_codes_update_anon" ON partner_invite_codes;
CREATE POLICY "invite_codes_update_anon" ON partner_invite_codes FOR UPDATE USING (true);

DROP POLICY IF EXISTS "invite_codes_insert_authenticated" ON partner_invite_codes;
CREATE POLICY "invite_codes_insert_authenticated" ON partner_invite_codes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "invite_codes_delete_authenticated" ON partner_invite_codes;
CREATE POLICY "invite_codes_delete_authenticated" ON partner_invite_codes FOR DELETE USING (auth.role() = 'authenticated');

-- TEAM: Nur authentifizierte Benutzer
CREATE OR REPLACE FUNCTION app_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND role = 'ADMIN'
  ) OR coalesce(lower(auth.jwt() -> 'user_metadata' ->> 'role'), '') = 'admin'
     OR coalesce(lower(auth.jwt() -> 'app_metadata' ->> 'role'), '') = 'admin';
$$;

CREATE OR REPLACE FUNCTION app_is_employee()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM team
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      AND role = 'EMPLOYEE'
  );
$$;

DROP POLICY IF EXISTS "team_all_authenticated" ON team;
DROP POLICY IF EXISTS "team_select_authenticated" ON team;
DROP POLICY IF EXISTS "team_write_admin_only" ON team;
CREATE POLICY "team_select_authenticated" ON team FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "team_write_admin_only" ON team FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

-- TRANSACTIONS: Nur authentifizierte Benutzer
DROP POLICY IF EXISTS "transactions_all_authenticated" ON transactions;
CREATE POLICY "transactions_all_authenticated" ON transactions FOR ALL USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────
-- 14. REALTIME aktivieren für relevante Tabellen
-- ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'chat_messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'partners') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE partners;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wallet_transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wallet_transactions;
  END IF;
END
$$;

-- ============================================================
-- 15. ZUSÄTZLICHE FORMULARTABELLEN
-- ============================================================

CREATE TABLE IF NOT EXISTS partner_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name  TEXT NOT NULL,
  contact_name  TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT NOT NULL,
  location      TEXT NOT NULL,
  radius        TEXT,
  service       TEXT NOT NULL,
  source_page   TEXT,
  status        TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'IN_PROGRESS', 'FOLLOW_UP', 'COMPLETED', 'ARCHIVED')),
  assigned_to_email TEXT,
  callback_at   TIMESTAMPTZ,
  internal_note TEXT,
  invite_code_id UUID REFERENCES partner_invite_codes(id) ON DELETE SET NULL,
  invite_sent_at TIMESTAMPTZ,
  invite_sent_to TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE partner_applications
  ADD COLUMN IF NOT EXISTS assigned_to_email TEXT,
  ADD COLUMN IF NOT EXISTS callback_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS internal_note TEXT,
  ADD COLUMN IF NOT EXISTS invite_code_id UUID REFERENCES partner_invite_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invite_sent_to TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE partner_applications
  DROP CONSTRAINT IF EXISTS partner_applications_status_check;

ALTER TABLE partner_applications
  ADD CONSTRAINT partner_applications_status_check
  CHECK (status IN ('NEW', 'CONTACTED', 'IN_PROGRESS', 'FOLLOW_UP', 'COMPLETED', 'ARCHIVED'));

CREATE TABLE IF NOT EXISTS contact_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  message     TEXT NOT NULL,
  source_page TEXT,
  status      TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'DONE')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_topup_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference      TEXT UNIQUE NOT NULL,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  partner_id     UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  amount         NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'MANUAL_REVIEW',
  note           TEXT,
  status         TEXT NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'IN_REVIEW', 'COMPLETED', 'CANCELLED')),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  processed_at   TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wallet_topup_requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_topup_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "partner_applications_insert_all" ON partner_applications;
CREATE POLICY "partner_applications_insert_all" ON partner_applications FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "partner_applications_select_authenticated" ON partner_applications;
DROP POLICY IF EXISTS "partner_applications_update_authenticated" ON partner_applications;
DROP POLICY IF EXISTS "partner_applications_select_scoped" ON partner_applications;
DROP POLICY IF EXISTS "partner_applications_update_scoped" ON partner_applications;
CREATE POLICY "partner_applications_select_scoped" ON partner_applications FOR SELECT USING (
  app_is_admin()
  OR (
    auth.role() = 'authenticated'
    AND (
      assigned_to_email IS NULL
      OR lower(assigned_to_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
);
CREATE POLICY "partner_applications_update_scoped" ON partner_applications FOR UPDATE USING (
  app_is_admin()
  OR (
    auth.role() = 'authenticated'
    AND (
      assigned_to_email IS NULL
      OR lower(assigned_to_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
) WITH CHECK (
  app_is_admin()
  OR (
    auth.role() = 'authenticated'
    AND (
      assigned_to_email IS NULL
      OR lower(assigned_to_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
);

DROP POLICY IF EXISTS "contact_requests_insert_all" ON contact_requests;
CREATE POLICY "contact_requests_insert_all" ON contact_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "contact_requests_select_authenticated" ON contact_requests;
CREATE POLICY "contact_requests_select_authenticated" ON contact_requests FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "contact_requests_update_authenticated" ON contact_requests;
CREATE POLICY "contact_requests_update_authenticated" ON contact_requests FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "wallet_topup_requests_select_own" ON wallet_topup_requests;
CREATE POLICY "wallet_topup_requests_select_own" ON wallet_topup_requests FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wallet_topup_requests_insert_own" ON wallet_topup_requests;
CREATE POLICY "wallet_topup_requests_insert_own" ON wallet_topup_requests FOR INSERT WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 16. WEITERE SYSTEMEINSTELLUNGEN
-- ============================================================

INSERT INTO system_settings (key, value) VALUES (
  'min_topup_amount', '10'::jsonb
) ON CONFLICT (key) DO NOTHING;

INSERT INTO system_settings (key, value) VALUES (
  'billing_settings',
  '{
    "beneficiary": "Umzugsnetz GmbH",
    "iban": "DE62 1234 5678 9012 3456 78",
    "bic": "GENO DEF1 ABC",
    "note": "Manuelle Überweisungen werden innerhalb von 1–3 Werktagen geprüft."
  }'::jsonb
) ON CONFLICT (key) DO NOTHING;
