-- ====================================================================
-- MIGRATION: 002_recurring_transactions.sql
-- Skema Otomasi Transaksi Berulang & Generator Transaksi Otomatis
-- ====================================================================

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'recurring_frequency') THEN
        CREATE TYPE recurring_frequency AS ENUM ('daily', 'monthly_date');
    END IF;
END $$;

-- Dukungan nominal opsional (0 / NULL untuk susulan)
ALTER TABLE IF EXISTS transactions DROP CONSTRAINT IF EXISTS transactions_amount_check;
ALTER TABLE IF EXISTS transactions ALTER COLUMN amount DROP NOT NULL;
ALTER TABLE IF EXISTS transactions ADD CONSTRAINT transactions_amount_check CHECK (amount IS NULL OR amount >= 0);

CREATE TABLE IF NOT EXISTS recurring_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  frequency recurring_frequency NOT NULL DEFAULT 'monthly_date',
  day_of_month int CHECK (day_of_month BETWEEN 1 AND 31),
  execution_time text NOT NULL DEFAULT '07:00',
  
  transaction_type_id uuid NOT NULL REFERENCES transaction_types(id) ON DELETE RESTRICT,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  sub_category_id uuid REFERENCES sub_categories(id) ON DELETE SET NULL,
  source_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  source_party_id uuid REFERENCES flow_parties(id) ON DELETE SET NULL,
  destination_account_id uuid REFERENCES accounts(id) ON DELETE SET NULL,
  destination_party_id uuid REFERENCES flow_parties(id) ON DELETE SET NULL,
  amount numeric(14,0) CHECK (amount IS NULL OR amount >= 0),
  description text,
  
  is_active boolean DEFAULT true,
  last_executed_at timestamptz,
  last_executed_tx_id uuid REFERENCES transactions(id) ON DELETE SET NULL,
  created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CHECK (source_account_id IS DISTINCT FROM destination_account_id)
);

CREATE INDEX IF NOT EXISTS idx_rec_tx_active ON recurring_transactions (is_active);
CREATE INDEX IF NOT EXISTS idx_rec_tx_freq ON recurring_transactions (frequency, day_of_month);

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON TABLE recurring_transactions TO anon, authenticated, service_role;
ALTER TABLE recurring_transactions DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION process_due_recurring_transactions(current_check_time timestamptz DEFAULT now())
RETURNS TABLE (
  created_count int,
  processed_ids uuid[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec RECORD;
  current_day int;
  current_time_str text;
  today_date date;
  v_created int := 0;
  v_ids uuid[] := '{}';
  new_tx_id uuid;
BEGIN
  today_date := (current_check_time AT TIME ZONE 'Asia/Jakarta')::date;
  current_day := EXTRACT(DAY FROM (current_check_time AT TIME ZONE 'Asia/Jakarta'))::int;
  current_time_str := to_char(current_check_time AT TIME ZONE 'Asia/Jakarta', 'HH24:MI');

  FOR rec IN
    SELECT *
    FROM recurring_transactions
    WHERE is_active = true
      AND (
        (frequency = 'daily' AND (last_executed_at IS NULL OR (last_executed_at AT TIME ZONE 'Asia/Jakarta')::date < today_date) AND current_time_str >= execution_time)
        OR
        (frequency = 'monthly_date' AND day_of_month = current_day AND (last_executed_at IS NULL OR (last_executed_at AT TIME ZONE 'Asia/Jakarta')::date < today_date) AND current_time_str >= execution_time)
      )
  LOOP
    INSERT INTO transactions (
      tx_date,
      transaction_type_id,
      category_id,
      sub_category_id,
      source_account_id,
      source_party_id,
      destination_account_id,
      destination_party_id,
      amount,
      description,
      created_by
    )
    VALUES (
      today_date,
      rec.transaction_type_id,
      rec.category_id,
      rec.sub_category_id,
      rec.source_account_id,
      rec.source_party_id,
      rec.destination_account_id,
      rec.destination_party_id,
      COALESCE(rec.amount, 0),
      COALESCE(rec.description, rec.name || ' (Otomatis)'),
      rec.created_by
    )
    RETURNING id INTO new_tx_id;

    UPDATE recurring_transactions
    SET last_executed_at = now(),
        last_executed_tx_id = new_tx_id,
        updated_at = now()
    WHERE id = rec.id;

    v_created := v_created + 1;
    v_ids := array_append(v_ids, rec.id);
  END LOOP;

  RETURN QUERY SELECT v_created, v_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION process_due_recurring_transactions(timestamptz) TO anon, authenticated, service_role;
