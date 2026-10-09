export type UserRole = 'superadmin' | 'user';
export type TxKind = 'income' | 'expense' | 'transfer';
export type AccountGroup = 'cash' | 'bank' | 'tabungan' | 'paylater';
export type PartyScope = 'income_source' | 'expense_destination';

export interface AppUser {
  id: string;
  full_name: string;
  email: string;
  password_hash?: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface TransactionType {
  id: string;
  name: string;
  kind: TxKind;
  color: string;
  is_active: boolean;
}

export interface Category {
  id: string;
  transaction_type_id: string;
  name: string;
  color: string;
  is_active: boolean;
}

export interface SubCategory {
  id: string;
  category_id: string;
  name: string;
  default_limit: number | null;
  color: string;
  is_active: boolean;
}

export interface Account {
  id: string;
  name: string;
  group_type: AccountGroup;
  purpose?: string | null;
  savings_goal_name?: string | null;
  target_amount?: number | null;
  opening_balance: number;
  owner_label?: string | null;
  sort_order: number;
  is_active: boolean;
  current_balance?: number;
}

export interface FlowParty {
  id: string;
  scope: PartyScope;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export interface Transaction {
  id: string;
  tx_date: string; // YYYY-MM-DD
  transaction_type_id: string;
  category_id?: string | null;
  sub_category_id?: string | null;
  source_account_id?: string | null;
  source_party_id?: string | null;
  destination_account_id?: string | null;
  destination_party_id?: string | null;
  amount: number;
  description?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined fields for display
  type_name?: string;
  type_kind?: TxKind;
  category_name?: string;
  sub_category_name?: string;
  sub_category_color?: string;
  source_name?: string;
  destination_name?: string;
}

export interface QuarterlyPlan {
  id: string;
  year: number;
  quarter: number; // 1 - 4
  title?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  items?: QuarterlyPlanItem[];
}

export interface QuarterlyPlanItem {
  id: string;
  plan_id: string;
  sub_category_id: string;
  monthly_limit: number;
  note?: string | null;
  sub_category_name?: string;
  category_name?: string;
}

export type LimitEvaluationStatus = 'aman' | 'mendekati' | 'melebihi' | 'tanpa_limit';

export interface MonthlyLimitStatus {
  month: string; // YYYY-MM-01
  sub_category_id: string;
  sub_category_name?: string;
  category_name?: string;
  monthly_limit: number | null;
  spent: number;
  remaining?: number;
  percentage?: number;
  status: LimitEvaluationStatus;
}

export interface AppSettings {
  id: number;
  emergency_fund_account_id?: string | null;
  runway_months_basis: number;
  show_gold_savings: boolean;
}

export type RecurringFrequency = 'daily' | 'monthly_date';

export interface RecurringTransaction {
  id: string;
  name: string; // Misal: "Biaya Admin Bank Tahunan / Bulanan"
  frequency: RecurringFrequency; // 'daily' | 'monthly_date'
  day_of_month?: number | null; // 1 - 31 (wajib jika monthly_date)
  execution_time: string; // "HH:mm" misal "07:00", "20:00"
  
  // Data inputan transaksi persis sama
  transaction_type_id: string;
  category_id?: string | null;
  sub_category_id?: string | null;
  source_account_id?: string | null;
  source_party_id?: string | null;
  destination_account_id?: string | null;
  destination_party_id?: string | null;
  amount?: number | null; // Opsional! Bisa 0 atau null bila susulan
  description?: string | null;
  
  is_active: boolean;
  last_executed_at?: string | null;
  last_executed_tx_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined display helpers
  type_name?: string;
  type_kind?: TxKind;
  category_name?: string;
  sub_category_name?: string;
  source_name?: string;
  destination_name?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  source: 'env' | 'local';
}
