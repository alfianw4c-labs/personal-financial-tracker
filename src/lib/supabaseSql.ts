// Skema SQL lengkap dan query migrasi untuk Supabase PostgreSQL
export const SUPABASE_SETUP_SQL = `-- ====================================================================
-- DAILY CASHFLOW - SKEMA LENGKAP & USER SEED (POSTGRESQL / SUPABASE)
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ====================================================================

-- 1. ENUM TYPES
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('superadmin','user');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tx_kind') THEN
        CREATE TYPE tx_kind AS ENUM ('income','expense','transfer');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'account_group') THEN
        CREATE TYPE account_group AS ENUM ('cash','bank','tabungan','paylater');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'party_scope') THEN
        CREATE TYPE party_scope AS ENUM ('income_source','expense_destination');
    END IF;
END $$;

-- 2. TABEL: app_users
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 3. TABEL: transaction_types
CREATE TABLE IF NOT EXISTS transaction_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  kind tx_kind NOT NULL,
  color text DEFAULT '#1E6B4F',
  is_active boolean DEFAULT true
);

-- 4. TABEL: categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type_id uuid NOT NULL REFERENCES transaction_types(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text DEFAULT '#999999',
  is_active boolean DEFAULT true,
  UNIQUE (transaction_type_id, name)
);

-- 5. TABEL: sub_categories
CREATE TABLE IF NOT EXISTS sub_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  default_limit numeric(14,0),
  color text DEFAULT '#999999',
  is_active boolean DEFAULT true,
  UNIQUE (category_id, name)
);

-- 6. TABEL: accounts
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  group_type account_group NOT NULL,
  purpose text,
  savings_goal_name text,
  target_amount numeric(14,0),
  opening_balance numeric(14,0) DEFAULT 0,
  owner_label text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true
);

-- 7. TABEL: flow_parties
CREATE TABLE IF NOT EXISTS flow_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope party_scope NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order int DEFAULT 0,
  UNIQUE (scope, name)
);

-- 8. TABEL: transactions
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_date date NOT NULL,
  transaction_type_id uuid NOT NULL REFERENCES transaction_types(id),
  category_id uuid REFERENCES categories(id),
  sub_category_id uuid REFERENCES sub_categories(id),
  source_account_id uuid REFERENCES accounts(id),
  source_party_id uuid REFERENCES flow_parties(id),
  destination_account_id uuid REFERENCES accounts(id),
  destination_party_id uuid REFERENCES flow_parties(id),
  amount numeric(14,0) NOT NULL CHECK (amount > 0),
  description text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (source_account_id IS DISTINCT FROM destination_account_id)
);

CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions (tx_date DESC);
CREATE INDEX IF NOT EXISTS idx_tx_subcategory ON transactions (sub_category_id);
CREATE INDEX IF NOT EXISTS idx_tx_src_acc ON transactions (source_account_id);
CREATE INDEX IF NOT EXISTS idx_tx_dst_acc ON transactions (destination_account_id);

-- 9. TABEL: quarterly_plans
CREATE TABLE IF NOT EXISTS quarterly_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  quarter int NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  title text,
  notes text,
  created_by uuid REFERENCES app_users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (year, quarter)
);

-- 10. TABEL: quarterly_plan_items
CREATE TABLE IF NOT EXISTS quarterly_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES quarterly_plans(id) ON DELETE CASCADE,
  sub_category_id uuid NOT NULL REFERENCES sub_categories(id) ON DELETE CASCADE,
  monthly_limit numeric(14,0) NOT NULL CHECK (monthly_limit >= 0),
  note text,
  UNIQUE (plan_id, sub_category_id)
);

-- 11. TABEL: app_meta & settings
CREATE TABLE IF NOT EXISTS app_meta (
  key text PRIMARY KEY,
  value text NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  emergency_fund_account_id uuid REFERENCES accounts(id),
  runway_months_basis int DEFAULT 3,
  show_gold_savings boolean DEFAULT false
);

-- 12. VIEW: account_balances
CREATE OR REPLACE VIEW account_balances AS
SELECT
  a.id,
  a.name,
  a.group_type,
  a.purpose,
  a.savings_goal_name,
  a.target_amount,
  a.opening_balance,
  a.owner_label,
  a.sort_order,
  a.is_active,
  (
    coalesce(a.opening_balance, 0)
    + coalesce((SELECT sum(t.amount) FROM transactions t WHERE t.destination_account_id = a.id), 0)
    - coalesce((SELECT sum(t.amount) FROM transactions t WHERE t.source_account_id = a.id), 0)
  ) AS current_balance
FROM accounts a;

-- 13. VIEW: monthly_limit_status
CREATE OR REPLACE VIEW monthly_limit_status AS
WITH spent AS (
  SELECT date_trunc('month', t.tx_date)::date AS month,
         t.sub_category_id,
         sum(t.amount) AS spent
  FROM transactions t
  JOIN transaction_types tt ON tt.id = t.transaction_type_id
  WHERE tt.kind = 'expense' AND t.sub_category_id IS NOT NULL
  GROUP BY 1, 2
)
SELECT s.month,
       s.sub_category_id,
       coalesce(i.monthly_limit, sc.default_limit) AS monthly_limit,
       s.spent,
       CASE WHEN coalesce(i.monthly_limit, sc.default_limit) IS NULL THEN 'tanpa_limit'
            WHEN s.spent > coalesce(i.monthly_limit, sc.default_limit) THEN 'melebihi'
            WHEN s.spent >= 0.8 * coalesce(i.monthly_limit, sc.default_limit) THEN 'mendekati'
            ELSE 'aman' END AS status
FROM spent s
JOIN sub_categories sc ON sc.id = s.sub_category_id
LEFT JOIN quarterly_plans p
  ON p.year = extract(year FROM s.month)::int
 AND p.quarter = extract(quarter FROM s.month)::int
LEFT JOIN quarterly_plan_items i
  ON i.plan_id = p.id AND i.sub_category_id = s.sub_category_id;

-- 14. HAK AKSES API & NONAKTIFKAN RLS AGAR TIDAK MEMBLOKIR AKUN
-- Supabase REST API membutuhkan hak akses tabel ke role anon & authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON account_balances TO anon, authenticated, service_role;
GRANT SELECT ON monthly_limit_status TO anon, authenticated, service_role;

-- Nonaktifkan RLS agar semua baris akun dan data transaksi dapat dibaca oleh sistem
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE sub_categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;
ALTER TABLE flow_parties DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE quarterly_plan_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_meta DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 15. SEED DATA AWAL & 3 AKUN PENGGUNA (SUPERADMIN & USER)
INSERT INTO app_meta (key, value)
VALUES ('schema_version', '1')
ON CONFLICT (key) DO UPDATE SET value = '1';

-- Kredensial default: admin123
INSERT INTO app_users (id, full_name, email, password_hash, role, is_active)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alfian Faiz (Superadmin)', 'admin@dailycashflow.local', '$2b$10$aWvqMAMsSCJR5id.2LHOq.3oLx.8UWxBgi3cOrTGgRh/H7xY0uEIe', 'superadmin', true),
  ('00000000-0000-0000-0000-000000000002', 'Alfian Faiz', 'alfianfaiz.w4c@gmail.com', '$2b$10$aWvqMAMsSCJR5id.2LHOq.3oLx.8UWxBgi3cOrTGgRh/H7xY0uEIe', 'superadmin', true),
  ('00000000-0000-0000-0000-000000000003', 'Ofi (User Keluarga)', 'ofi@dailycashflow.local', '$2b$10$aWvqMAMsSCJR5id.2LHOq.3oLx.8UWxBgi3cOrTGgRh/H7xY0uEIe', 'user', true)
ON CONFLICT (email) DO UPDATE
SET password_hash = EXCLUDED.password_hash,
    is_active = true,
    role = EXCLUDED.role;

-- Sinkronisasi akun jika dibuat via menu Authentication Supabase (auth.users)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    INSERT INTO public.app_users (id, full_name, email, password_hash, role, is_active)
    SELECT
      id,
      coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
      email,
      '$2b$10$aWvqMAMsSCJR5id.2LHOq.3oLx.8UWxBgi3cOrTGgRh/H7xY0uEIe',
      'superadmin',
      true
    FROM auth.users
    ON CONFLICT (email) DO UPDATE
    SET is_active = true;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- abaikan jika akses schema auth dibatasi
END $$;

-- Tipe Transaksi
INSERT INTO transaction_types (id, name, kind, color, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Pemasukan', 'income', '#1E6B4F', true),
  ('a0000000-0000-0000-0000-000000000002', 'Pengeluaran', 'expense', '#E11D48', true),
  ('a0000000-0000-0000-0000-000000000003', 'Transfer Antar Akun', 'transfer', '#2563EB', true)
ON CONFLICT (name) DO NOTHING;

-- Flow Parties: Income Sources
INSERT INTO flow_parties (id, scope, name, is_active, sort_order)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'income_source', 'Pendapatan', true, 1),
  ('b0000000-0000-0000-0000-000000000002', 'income_source', 'Pemberian', true, 2),
  ('b0000000-0000-0000-0000-000000000003', 'income_source', 'Penjualan', true, 3),
  ('b0000000-0000-0000-0000-000000000004', 'income_source', 'Bunga', true, 4)
ON CONFLICT (scope, name) DO NOTHING;

-- Flow Parties: Expense Destinations
INSERT INTO flow_parties (id, scope, name, is_active, sort_order)
VALUES
  ('b0000000-0000-0000-0000-000000000005', 'expense_destination', 'Pembelian/Pembayaran', true, 1),
  ('b0000000-0000-0000-0000-000000000006', 'expense_destination', 'Pemberian', true, 2),
  ('b0000000-0000-0000-0000-000000000007', 'expense_destination', 'Admin/Pajak', true, 3)
ON CONFLICT (scope, name) DO NOTHING;

-- Kategori
INSERT INTO categories (id, transaction_type_id, name, color, is_active)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Pendapatan Rutin', '#1E6B4F', true),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Bunga & Bagi Hasil', '#0D9488', true),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Tagihan Bulanan', '#E11D48', true),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Rutinan & Kebutuhan Harian', '#D97706', true)
ON CONFLICT (transaction_type_id, name) DO NOTHING;

-- Sub Kategori
INSERT INTO sub_categories (id, category_id, name, default_limit, color, is_active)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Gaji Pokok', NULL, '#1E6B4F', true),
  ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'Bonus & Insentif', NULL, '#16A34A', true),
  ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'Bunga Tabungan / Deposito', NULL, '#0D9488', true),
  ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000003', 'Listrik', 210000, '#E11D48', true),
  ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'Wifi', 250000, '#BE123C', true),
  ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'Pulsa/Kuota', 150000, '#F43F5E', true),
  ('d0000000-0000-0000-0000-000000000007', 'c0000000-0000-0000-0000-000000000003', 'Air PDAM', 80000, '#0284C7', true),
  ('d0000000-0000-0000-0000-000000000008', 'c0000000-0000-0000-0000-000000000003', 'Air Galon', 60000, '#0369A1', true),
  ('d0000000-0000-0000-0000-000000000009', 'c0000000-0000-0000-0000-000000000003', 'Sampah & Iuran Warga', 50000, '#64748B', true),
  ('d0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000003', 'Gas', 45000, '#F97316', true),
  ('d0000000-0000-0000-0000-000000000011', 'c0000000-0000-0000-0000-000000000003', 'Biaya Admin Bank', 30000, '#94A3B8', true),
  ('d0000000-0000-0000-0000-000000000012', 'c0000000-0000-0000-0000-000000000004', 'Kebutuhan Bahan Makan', 1500000, '#D97706', true),
  ('d0000000-0000-0000-0000-000000000013', 'c0000000-0000-0000-0000-000000000004', 'Makan Harian & Lauk', 1200000, '#B45309', true),
  ('d0000000-0000-0000-0000-000000000014', 'c0000000-0000-0000-0000-000000000004', 'Kebutuhan Rumah', 500000, '#78350F', true),
  ('d0000000-0000-0000-0000-000000000015', 'c0000000-0000-0000-0000-000000000004', 'Bensin', 400000, '#EA580C', true),
  ('d0000000-0000-0000-0000-000000000016', 'c0000000-0000-0000-0000-000000000004', 'Ojol & Transportasi', 150000, '#C2410C', true),
  ('d0000000-0000-0000-0000-000000000017', 'c0000000-0000-0000-0000-000000000004', 'Parkir', 50000, '#9A3412', true),
  ('d0000000-0000-0000-0000-000000000018', 'c0000000-0000-0000-0000-000000000004', 'Keinginan & Hiburan', 500000, '#8B5CF6', true),
  ('d0000000-0000-0000-0000-000000000019', 'c0000000-0000-0000-0000-000000000004', 'Jajan & Makan Istri', 400000, '#EC4899', true),
  ('d0000000-0000-0000-0000-000000000020', 'c0000000-0000-0000-0000-000000000004', 'Jajan Suami', 400000, '#3B82F6', true)
ON CONFLICT (category_id, name) DO NOTHING;

-- Akun Bank & Dompet
INSERT INTO accounts (id, name, group_type, purpose, opening_balance, owner_label, sort_order, is_active)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'Seabank Ofi', 'bank', 'Rekening Operasional Istri', 2500000, 'Ofi', 1, true),
  ('e0000000-0000-0000-0000-000000000002', 'Seabank Alfian', 'bank', 'Rekening Utama Suami', 4500000, 'Alfian', 2, true),
  ('e0000000-0000-0000-0000-000000000003', 'Mandiri', 'bank', 'Payroll & Belanja', 1200000, 'Alfian', 3, true),
  ('e0000000-0000-0000-0000-000000000004', 'BNI Alfian', 'bank', 'Cadangan Transaksi', 850000, 'Alfian', 4, true),
  ('e0000000-0000-0000-0000-000000000005', 'Cash Dapur', 'cash', 'Uang Tunai Belanja Sayur & Pasar', 450000, 'Bersama', 5, true),
  ('e0000000-0000-0000-0000-000000000006', 'Cash Alfian', 'cash', 'Dompet Alfian', 200000, 'Alfian', 6, true),
  ('e0000000-0000-0000-0000-000000000007', 'Cash Ofi', 'cash', 'Dompet Ofi', 150000, 'Ofi', 7, true),
  ('e0000000-0000-0000-0000-000000000008', 'Cash Tagihan', 'cash', 'Amplop Iuran & Tagihan Tunai', 300000, 'Bersama', 8, true),
  ('e0000000-0000-0000-0000-000000000009', 'Tabungan Darurat', 'tabungan', 'Dana Darurat 6 Bulan Pengeluaran', 18500000, 'Bersama', 9, true),
  ('e0000000-0000-0000-0000-000000000010', 'Tabungan Kesehatan', 'tabungan', 'Biaya Medis & Persalinan', 12000000, 'Bersama', 10, true),
  ('e0000000-0000-0000-0000-000000000011', 'Tabungan Rumah', 'tabungan', 'Renovasi & DP Rumah', 24000000, 'Bersama', 11, true),
  ('e0000000-0000-0000-0000-000000000012', 'Tabungan Kendaraan', 'tabungan', 'Servis Besar & Upgrade Kendaraan', 7500000, 'Bersama', 12, true),
  ('e0000000-0000-0000-0000-000000000013', 'Spaylater Alfian', 'paylater', 'Tagihan Paylater Shopee', 0, 'Alfian', 13, true),
  ('e0000000-0000-0000-0000-000000000014', 'BRI CC', 'paylater', 'Kartu Kredit BRI Alfian', 0, 'Alfian', 14, true)
ON CONFLICT (name) DO NOTHING;

-- Pengaturan
INSERT INTO settings (id, emergency_fund_account_id, runway_months_basis, show_gold_savings)
VALUES (1, 'e0000000-0000-0000-0000-000000000009', 3, false)
ON CONFLICT (id) DO UPDATE
SET emergency_fund_account_id = 'e0000000-0000-0000-0000-000000000009',
    runway_months_basis = 3;
`;
