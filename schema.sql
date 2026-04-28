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
  bonus_tokens INTEGER NOT NULL DEFAULT 0,
  bonus_tokens_claimed_at TIMESTAMPTZ,
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
  ADD COLUMN IF NOT EXISTS bonus_tokens INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_tokens_claimed_at TIMESTAMPTZ,
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
  type        TEXT NOT NULL CHECK (type IN ('TOPUP', 'LEAD_PURCHASE', 'ADMIN_CREDIT', 'REFUND', 'BONUS_CREDIT', 'TOKEN_REDEMPTION')),
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
  audience    TEXT NOT NULL DEFAULT 'STAFF',
  partner_id  UUID REFERENCES partners(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'STAFF',
  ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES partners(id) ON DELETE CASCADE;

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_audience_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_audience_check
  CHECK (audience IN ('STAFF', 'PARTNER'));

CREATE INDEX IF NOT EXISTS notifications_partner_idx ON notifications (partner_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_audience_idx ON notifications (audience, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 8. CHAT_MESSAGES (Live-Chat zwischen Kunden und Admin)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT NOT NULL,
  sender      TEXT NOT NULL CHECK (sender IN ('user', 'admin')),
  support_category TEXT NOT NULL DEFAULT 'KUNDE' CHECK (support_category IN ('KUNDE', 'PARTNER')),
  user_name   TEXT,
  text        TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS support_category TEXT NOT NULL DEFAULT 'KUNDE';

ALTER TABLE chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_support_category_check;

ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_support_category_check
  CHECK (support_category IN ('KUNDE', 'PARTNER'));

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
  status      TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'DISABLED')),
  invited_by_email TEXT,
  invitation_sent_at TIMESTAMPTZ,
  onboarding_seen_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE team
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS invited_by_email TEXT,
  ADD COLUMN IF NOT EXISTS invitation_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_seen_at TIMESTAMPTZ;

ALTER TABLE team
  DROP CONSTRAINT IF EXISTS team_status_check;

ALTER TABLE team
  ADD CONSTRAINT team_status_check
  CHECK (status IN ('PENDING', 'ACTIVE', 'DISABLED'));

CREATE UNIQUE INDEX IF NOT EXISTS team_email_unique_idx ON team (email);

CREATE TABLE IF NOT EXISTS work_call_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  staff_email   TEXT,
  order_id      UUID REFERENCES orders(id) ON DELETE SET NULL,
  order_number  TEXT,
  customer_name TEXT,
  result        TEXT NOT NULL CHECK (result IN ('Gewonnen', 'Verloren', 'Neu Kontaktieren', 'Löschen')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS work_call_logs_staff_created_idx ON work_call_logs (staff_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS work_call_logs_result_idx ON work_call_logs (result);

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
  current_tokens INTEGER;
  partner_user_id UUID;
BEGIN
  -- Aktuelles Guthaben und user_id des Partners abrufen
  SELECT balance, bonus_tokens, user_id INTO current_balance, current_tokens, partner_user_id
  FROM partners
  WHERE id = partner_id_param
  FOR UPDATE;

  -- Startbonus-Token zuerst einlösen
  IF coalesce(current_tokens, 0) > 0 THEN
    UPDATE partners
    SET bonus_tokens = GREATEST(coalesce(bonus_tokens, 0) - 1, 0),
        updated_at = NOW()
    WHERE id = partner_id_param;

    INSERT INTO partner_purchases (partner_id, order_id, price)
    VALUES (partner_id_param, order_id_param, 0);

    INSERT INTO wallet_transactions (user_id, partner_id, type, amount, description)
    VALUES (
      partner_user_id,
      partner_id_param,
      'TOKEN_REDEMPTION',
      0,
      'Startbonus-Token für Auftrag ' || order_id_param::TEXT || ' eingelöst'
    );

    INSERT INTO transactions (partner_id, type, amount, description)
    VALUES (
      partner_id_param,
      'TOKEN_REDEMPTION',
      0,
      'Startbonus-Token für Auftrag ' || order_id_param::TEXT || ' eingelöst'
    );

    RETURN;
  END IF;

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
-- 12b. RPC: claim_partner_bonus (einmaliger Startbonus)
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION claim_partner_bonus(
  partner_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_count INTEGER;
  partner_user_id UUID;
BEGIN
  SELECT user_id
  INTO partner_user_id
  FROM partners
  WHERE id = partner_id_param
    AND user_id = auth.uid()
  FOR UPDATE;

  IF partner_user_id IS NULL THEN
    RAISE EXCEPTION 'Partnerkonto nicht gefunden oder kein Zugriff.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM partners
    WHERE id = partner_id_param
      AND bonus_tokens_claimed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Der Startbonus wurde bereits aktiviert.';
  END IF;

  token_count := 1 + floor(random() * 5)::INTEGER;

  UPDATE partners
  SET bonus_tokens = token_count,
      bonus_tokens_claimed_at = NOW(),
      updated_at = NOW()
  WHERE id = partner_id_param;

  INSERT INTO wallet_transactions (user_id, partner_id, type, amount, description)
  VALUES (
    partner_user_id,
    partner_id_param,
    'BONUS_CREDIT',
    0,
    'Einmaliger Startbonus aktiviert: ' || token_count::TEXT || ' kostenlose Kundenanfragen'
  );

  INSERT INTO notifications (type, title, message, link, is_read)
  VALUES (
    'PARTNER_BONUS_ACTIVATED',
    'Startbonus aktiviert',
    'Für eine Partnerfirma wurden ' || token_count::TEXT || ' Startbonus-Token aktiviert.',
    '/',
    FALSE
  );

  RETURN token_count;
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
ALTER TABLE work_call_logs ENABLE ROW LEVEL SECURITY;

-- Hilfsfunktionen für Admin-/Mitarbeiterrechte
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

-- ORDERS: Jeder kann lesen (Landingpage INSERT), nur Auth-User können schreiben
DROP POLICY IF EXISTS "orders_insert_anon" ON orders;
CREATE POLICY "orders_insert_anon" ON orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "orders_select_authenticated" ON orders;
CREATE POLICY "orders_select_authenticated" ON orders FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "orders_select_admin" ON orders;
CREATE POLICY "orders_select_admin" ON orders FOR SELECT USING (app_is_admin());

DROP POLICY IF EXISTS "orders_update_authenticated" ON orders;
CREATE POLICY "orders_update_authenticated" ON orders FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

-- PARTNERS: Jeder Partner sieht nur seine eigenen Daten
DROP POLICY IF EXISTS "partners_select_own" ON partners;
CREATE POLICY "partners_select_own" ON partners FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "partners_select_admin" ON partners;
CREATE POLICY "partners_select_admin" ON partners FOR SELECT USING (app_is_admin());

DROP POLICY IF EXISTS "partners_update_own" ON partners;
CREATE POLICY "partners_update_own" ON partners FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "partners_update_admin" ON partners;
CREATE POLICY "partners_update_admin" ON partners FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

DROP POLICY IF EXISTS "partners_insert_own" ON partners;
CREATE POLICY "partners_insert_own" ON partners FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "partners_insert_admin" ON partners;
CREATE POLICY "partners_insert_admin" ON partners FOR INSERT WITH CHECK (app_is_admin());

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
DROP POLICY IF EXISTS "wallet_select_admin" ON wallet_transactions;
CREATE POLICY "wallet_select_admin" ON wallet_transactions FOR SELECT USING (app_is_admin());
DROP POLICY IF EXISTS "wallet_insert_admin" ON wallet_transactions;
CREATE POLICY "wallet_insert_admin" ON wallet_transactions FOR INSERT WITH CHECK (app_is_admin());

-- NOTIFICATIONS: Staff und Partner haben getrennte Sichtbereiche
DROP POLICY IF EXISTS "notifications_all_authenticated" ON notifications;
DROP POLICY IF EXISTS "notifications_select_admin" ON notifications;
DROP POLICY IF EXISTS "notifications_update_admin" ON notifications;
DROP POLICY IF EXISTS "notifications_select_partner" ON notifications;
DROP POLICY IF EXISTS "notifications_update_partner" ON notifications;
CREATE POLICY "notifications_select_admin" ON notifications FOR SELECT USING (
  (audience = 'STAFF' OR audience IS NULL) AND app_is_admin()
);
CREATE POLICY "notifications_update_admin" ON notifications FOR UPDATE USING (
  (audience = 'STAFF' OR audience IS NULL) AND app_is_admin()
) WITH CHECK (
  (audience = 'STAFF' OR audience IS NULL) AND app_is_admin()
);
CREATE POLICY "notifications_select_partner" ON notifications FOR SELECT USING (
  audience = 'PARTNER' AND partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
CREATE POLICY "notifications_update_partner" ON notifications FOR UPDATE USING (
  audience = 'PARTNER' AND partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
) WITH CHECK (
  audience = 'PARTNER' AND partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "notifications_insert_anon" ON notifications;
CREATE POLICY "notifications_insert_anon" ON notifications FOR INSERT WITH CHECK (true);

-- CHAT_MESSAGES: Jeder kann lesen und schreiben (für Live-Chat)
DROP POLICY IF EXISTS "chat_messages_all" ON chat_messages;
CREATE POLICY "chat_messages_all" ON chat_messages FOR ALL USING (true) WITH CHECK (true);

-- SYSTEM_SETTINGS: Nur authentifizierte Benutzer können lesen
DROP POLICY IF EXISTS "settings_select_authenticated" ON system_settings;
CREATE POLICY "settings_select_authenticated" ON system_settings FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "settings_write_authenticated" ON system_settings;
DROP POLICY IF EXISTS "settings_write_admin_only" ON system_settings;
CREATE POLICY "settings_write_admin_only" ON system_settings FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

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
DROP POLICY IF EXISTS "team_all_authenticated" ON team;
DROP POLICY IF EXISTS "team_select_authenticated" ON team;
DROP POLICY IF EXISTS "team_write_admin_only" ON team;
DROP POLICY IF EXISTS "team_update_own_onboarding" ON team;
CREATE POLICY "team_select_authenticated" ON team FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "team_write_admin_only" ON team FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());
CREATE POLICY "team_update_own_onboarding" ON team FOR UPDATE USING (
  auth.role() = 'authenticated'
  AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
) WITH CHECK (
  auth.role() = 'authenticated'
  AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS "work_call_logs_select_staff" ON work_call_logs;
DROP POLICY IF EXISTS "work_call_logs_insert_staff" ON work_call_logs;
DROP POLICY IF EXISTS "work_call_logs_admin_all" ON work_call_logs;
CREATE POLICY "work_call_logs_select_staff" ON work_call_logs FOR SELECT USING (
  auth.uid() = staff_user_id OR app_is_admin()
);
CREATE POLICY "work_call_logs_insert_staff" ON work_call_logs FOR INSERT WITH CHECK (
  auth.uid() = staff_user_id OR app_is_admin()
);
CREATE POLICY "work_call_logs_admin_all" ON work_call_logs FOR ALL USING (app_is_admin()) WITH CHECK (app_is_admin());

-- TRANSACTIONS: Nur authentifizierte Benutzer
DROP POLICY IF EXISTS "transactions_all_authenticated" ON transactions;
DROP POLICY IF EXISTS "transactions_select_admin" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_admin" ON transactions;
CREATE POLICY "transactions_select_admin" ON transactions FOR SELECT USING (app_is_admin());
CREATE POLICY "transactions_insert_admin" ON transactions FOR INSERT WITH CHECK (app_is_admin());

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
  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REVIEW')),
  verification_score INTEGER NOT NULL DEFAULT 0,
  verification_summary TEXT,
  website_url   TEXT,
  website_checked_at TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
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
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS verification_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_summary TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS website_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
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

ALTER TABLE partner_applications
  DROP CONSTRAINT IF EXISTS partner_applications_verification_status_check;

ALTER TABLE partner_applications
  ADD CONSTRAINT partner_applications_verification_status_check
  CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REVIEW'));

CREATE TABLE IF NOT EXISTS contact_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  email       TEXT NOT NULL,
  message     TEXT NOT NULL,
  source_page TEXT,
  support_category TEXT NOT NULL DEFAULT 'KUNDE' CHECK (support_category IN ('KUNDE', 'PARTNER')),
  status      TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'DONE')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_requests
  ADD COLUMN IF NOT EXISTS support_category TEXT NOT NULL DEFAULT 'KUNDE';

ALTER TABLE contact_requests
  DROP CONSTRAINT IF EXISTS contact_requests_support_category_check;

ALTER TABLE contact_requests
  ADD CONSTRAINT contact_requests_support_category_check
  CHECK (support_category IN ('KUNDE', 'PARTNER'));

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
CREATE POLICY "contact_requests_select_authenticated" ON contact_requests FOR SELECT USING (app_is_admin() OR app_is_employee());

DROP POLICY IF EXISTS "contact_requests_update_authenticated" ON contact_requests;
CREATE POLICY "contact_requests_update_authenticated" ON contact_requests FOR UPDATE USING (app_is_admin() OR app_is_employee()) WITH CHECK (app_is_admin() OR app_is_employee());

DROP POLICY IF EXISTS "wallet_topup_requests_select_own" ON wallet_topup_requests;
CREATE POLICY "wallet_topup_requests_select_own" ON wallet_topup_requests FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "wallet_topup_requests_insert_own" ON wallet_topup_requests;
CREATE POLICY "wallet_topup_requests_insert_own" ON wallet_topup_requests FOR INSERT WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "wallet_topup_requests_select_admin" ON wallet_topup_requests;
DROP POLICY IF EXISTS "wallet_topup_requests_update_admin" ON wallet_topup_requests;
CREATE POLICY "wallet_topup_requests_select_admin" ON wallet_topup_requests FOR SELECT USING (app_is_admin());
CREATE POLICY "wallet_topup_requests_update_admin" ON wallet_topup_requests FOR UPDATE USING (app_is_admin()) WITH CHECK (app_is_admin());

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

-- ============================================================
-- 17. CRM FOUNDATION
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE app_role AS ENUM ('ADMIN', 'DEVELOPER', 'PARTNER', 'EMPLOYEE');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'partner_verification_status') THEN
    CREATE TYPE partner_verification_status AS ENUM ('PENDING', 'VERIFIED', 'MANUAL_REVIEW', 'REJECTED', 'SUSPENDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'package_code') THEN
    CREATE TYPE package_code AS ENUM ('FREE', 'PREMIUM', 'BUSINESS');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'PAUSED', 'EXPIRED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('PENDING', 'REQUIRES_ACTION', 'PAID', 'FAILED', 'REFUNDED', 'CANCELED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method_type') THEN
    CREATE TYPE payment_method_type AS ENUM ('STRIPE', 'BANK_TRANSFER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE lead_status AS ENUM ('NEW', 'QUEUED', 'RELEASED', 'VIEWED', 'WON', 'LOST', 'EXPIRED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'assignment_status') THEN
    CREATE TYPE assignment_status AS ENUM ('QUEUED', 'RELEASED', 'VIEWED', 'DECLINED', 'EXPIRED', 'WON', 'LOST');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  primary_role app_role,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  code app_role PRIMARY KEY,
  label TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (code, label, is_internal) VALUES
  ('ADMIN', 'Administrator', true),
  ('DEVELOPER', 'Developer', true),
  ('PARTNER', 'Partner', false),
  ('EMPLOYEE', 'Mitarbeiter', true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_code app_role NOT NULL REFERENCES roles(code),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role_code)
);

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verification_status partner_verification_status DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS package_code package_code DEFAULT 'FREE',
  ADD COLUMN IF NOT EXISTS lead_limit_monthly INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lead_limit_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  scope JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_verification_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  application_id UUID REFERENCES partner_applications(id) ON DELETE SET NULL,
  company_name_score INTEGER NOT NULL DEFAULT 0,
  location_score INTEGER NOT NULL DEFAULT 0,
  email_domain_score INTEGER NOT NULL DEFAULT 0,
  phone_score INTEGER NOT NULL DEFAULT 0,
  website_score INTEGER NOT NULL DEFAULT 0,
  total_score INTEGER NOT NULL DEFAULT 0,
  calculated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_verification_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  reviewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status partner_verification_status NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packages (
  code package_code PRIMARY KEY,
  name TEXT NOT NULL,
  monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  lead_limit_monthly INTEGER NOT NULL DEFAULT 0,
  priority INTEGER NOT NULL,
  release_delay_seconds INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO packages (code, name, monthly_price, lead_limit_monthly, priority, release_delay_seconds, is_active) VALUES
  ('FREE', 'Free', 0, 25, 3, 1800, true),
  ('PREMIUM', 'Premium', 99, 150, 2, 300, true),
  ('BUSINESS', 'Business', 249, 500, 1, 0, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  package_code package_code NOT NULL REFERENCES packages(code),
  provider TEXT NOT NULL DEFAULT 'STRIPE',
  external_reference TEXT,
  status subscription_status NOT NULL DEFAULT 'INCOMPLETE',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  type payment_method_type NOT NULL,
  provider_reference TEXT,
  label TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  payment_method_id UUID REFERENCES payment_methods(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'STRIPE',
  external_reference TEXT,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  status payment_status NOT NULL DEFAULT 'PENDING',
  paid_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transfer_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  iban TEXT,
  bic TEXT,
  account_holder TEXT,
  transfer_reference TEXT,
  received_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  country_code TEXT NOT NULL DEFAULT 'DE',
  postal_code TEXT,
  city TEXT,
  radius_km INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS partner_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  service_code TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (partner_id, service_code)
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL DEFAULT 'kostenrechner',
  external_reference TEXT,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  service_code TEXT NOT NULL,
  postal_code TEXT,
  city TEXT,
  region_label TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  status lead_status NOT NULL DEFAULT 'NEW',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  package_code package_code NOT NULL,
  priority INTEGER NOT NULL,
  release_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  status assignment_status NOT NULL DEFAULT 'QUEUED',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lead_id, partner_id)
);

CREATE TABLE IF NOT EXISTS lead_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES lead_assignments(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_session_id TEXT UNIQUE,
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  source TEXT NOT NULL DEFAULT 'website_chat',
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED', 'ARCHIVED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION app_has_role(role_name app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
      AND role_code = role_name
  );
$$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_verification_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_verification_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transfer_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_self_or_admin" ON profiles;
CREATE POLICY "profiles_select_self_or_admin" ON profiles FOR SELECT USING (id = auth.uid() OR app_is_admin() OR app_has_role('DEVELOPER'));
DROP POLICY IF EXISTS "profiles_update_self_or_admin" ON profiles;
CREATE POLICY "profiles_update_self_or_admin" ON profiles FOR UPDATE USING (id = auth.uid() OR app_is_admin() OR app_has_role('DEVELOPER')) WITH CHECK (id = auth.uid() OR app_is_admin() OR app_has_role('DEVELOPER'));

DROP POLICY IF EXISTS "roles_select_internal" ON roles;
CREATE POLICY "roles_select_internal" ON roles FOR SELECT USING (app_is_admin() OR app_has_role('DEVELOPER'));

DROP POLICY IF EXISTS "user_roles_select_self_or_admin" ON user_roles;
CREATE POLICY "user_roles_select_self_or_admin" ON user_roles FOR SELECT USING (user_id = auth.uid() OR app_is_admin() OR app_has_role('DEVELOPER'));
DROP POLICY IF EXISTS "user_roles_write_admin" ON user_roles;
CREATE POLICY "user_roles_write_admin" ON user_roles FOR ALL USING (app_is_admin() OR app_has_role('DEVELOPER')) WITH CHECK (app_is_admin() OR app_has_role('DEVELOPER'));

DROP POLICY IF EXISTS "employees_select_scoped" ON employees;
CREATE POLICY "employees_select_scoped" ON employees FOR SELECT USING (user_id = auth.uid() OR app_is_admin() OR app_has_role('DEVELOPER'));

DROP POLICY IF EXISTS "packages_select_authenticated" ON packages;
CREATE POLICY "packages_select_authenticated" ON packages FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "packages_write_admin" ON packages;
CREATE POLICY "packages_write_admin" ON packages FOR ALL USING (app_is_admin() OR app_has_role('DEVELOPER')) WITH CHECK (app_is_admin() OR app_has_role('DEVELOPER'));

DROP POLICY IF EXISTS "subscriptions_select_scope" ON subscriptions;
CREATE POLICY "subscriptions_select_scope" ON subscriptions FOR SELECT USING (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "payment_methods_select_scope" ON payment_methods;
CREATE POLICY "payment_methods_select_scope" ON payment_methods FOR SELECT USING (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "payments_select_scope" ON payments;
CREATE POLICY "payments_select_scope" ON payments FOR SELECT USING (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "bank_transfer_records_select_admin" ON bank_transfer_records;
CREATE POLICY "bank_transfer_records_select_admin" ON bank_transfer_records FOR SELECT USING (app_is_admin() OR app_has_role('DEVELOPER'));

DROP POLICY IF EXISTS "service_regions_select_scope" ON service_regions;
CREATE POLICY "service_regions_select_scope" ON service_regions FOR SELECT USING (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "service_regions_write_scope" ON service_regions;
CREATE POLICY "service_regions_write_scope" ON service_regions FOR ALL USING (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
) WITH CHECK (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "partner_services_select_scope" ON partner_services;
CREATE POLICY "partner_services_select_scope" ON partner_services FOR SELECT USING (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "partner_services_write_scope" ON partner_services;
CREATE POLICY "partner_services_write_scope" ON partner_services FOR ALL USING (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
) WITH CHECK (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "leads_select_admin_only" ON leads;
CREATE POLICY "leads_select_admin_only" ON leads FOR SELECT USING (app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee());
DROP POLICY IF EXISTS "leads_insert_public" ON leads;
CREATE POLICY "leads_insert_public" ON leads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "leads_update_admin_only" ON leads;
CREATE POLICY "leads_update_admin_only" ON leads FOR UPDATE USING (app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee()) WITH CHECK (app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee());

DROP POLICY IF EXISTS "lead_assignments_select_scope" ON lead_assignments;
CREATE POLICY "lead_assignments_select_scope" ON lead_assignments FOR SELECT USING (
  app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee()
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "lead_assignments_write_admin" ON lead_assignments;
CREATE POLICY "lead_assignments_write_admin" ON lead_assignments FOR ALL USING (app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee()) WITH CHECK (app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee());

DROP POLICY IF EXISTS "lead_status_history_select_scope" ON lead_status_history;
CREATE POLICY "lead_status_history_select_scope" ON lead_status_history FOR SELECT USING (
  app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee()
  OR assignment_id IN (
    SELECT id FROM lead_assignments
    WHERE partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "partner_verification_scores_select_scope" ON partner_verification_scores;
CREATE POLICY "partner_verification_scores_select_scope" ON partner_verification_scores FOR SELECT USING (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "partner_verification_reviews_select_scope" ON partner_verification_reviews;
CREATE POLICY "partner_verification_reviews_select_scope" ON partner_verification_reviews FOR SELECT USING (
  app_is_admin() OR app_has_role('DEVELOPER')
  OR partner_id IN (SELECT id FROM partners WHERE user_id = auth.uid())
);
DROP POLICY IF EXISTS "partner_verification_reviews_write_admin" ON partner_verification_reviews;
CREATE POLICY "partner_verification_reviews_write_admin" ON partner_verification_reviews FOR ALL USING (app_is_admin() OR app_has_role('DEVELOPER')) WITH CHECK (app_is_admin() OR app_has_role('DEVELOPER'));

DROP POLICY IF EXISTS "chat_conversations_select_internal" ON chat_conversations;
CREATE POLICY "chat_conversations_select_internal" ON chat_conversations FOR SELECT USING (app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee());
DROP POLICY IF EXISTS "chat_conversations_write_internal" ON chat_conversations;
CREATE POLICY "chat_conversations_write_internal" ON chat_conversations FOR ALL USING (app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee()) WITH CHECK (app_is_admin() OR app_has_role('DEVELOPER') OR app_is_employee());

DROP POLICY IF EXISTS "audit_logs_select_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING (app_is_admin() OR app_has_role('DEVELOPER'));
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON audit_logs;
CREATE POLICY "audit_logs_insert_admin" ON audit_logs FOR INSERT WITH CHECK (app_is_admin() OR app_has_role('DEVELOPER'));
