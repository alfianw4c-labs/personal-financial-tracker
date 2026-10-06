import bcrypt from 'bcryptjs';
import type {
  AppUser,
  TransactionType,
  Category,
  SubCategory,
  Account,
  FlowParty,
  Transaction,
  QuarterlyPlan,
  QuarterlyPlanItem,
  AppSettings,
} from '../types';

export const DEFAULT_SUPERADMIN_PASSWORD_PLAIN = 'admin123';
// Pre-computed hash of 'admin123'
export const DEFAULT_SUPERADMIN_PASSWORD_HASH = bcrypt.hashSync(DEFAULT_SUPERADMIN_PASSWORD_PLAIN, 10);

export const INITIAL_USERS: AppUser[] = [
  {
    id: 'u0000000-0000-0000-0000-000000000001',
    full_name: 'Alfian Faiz (Superadmin)',
    email: 'admin@dailycashflow.local',
    password_hash: DEFAULT_SUPERADMIN_PASSWORD_HASH,
    role: 'superadmin',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'u0000000-0000-0000-0000-000000000002',
    full_name: 'Ofi (User Keluarga)',
    email: 'ofi@dailycashflow.local',
    password_hash: bcrypt.hashSync('user123', 10),
    role: 'user',
    is_active: true,
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_TRANSACTION_TYPES: TransactionType[] = [
  { id: 'a0000000-0000-0000-0000-000000000001', name: 'Pemasukan', kind: 'income', color: '#1E6B4F', is_active: true },
  { id: 'a0000000-0000-0000-0000-000000000002', name: 'Pengeluaran', kind: 'expense', color: '#E11D48', is_active: true },
  { id: 'a0000000-0000-0000-0000-000000000003', name: 'Transfer Antar Akun', kind: 'transfer', color: '#2563EB', is_active: true },
];

export const INITIAL_FLOW_PARTIES: FlowParty[] = [
  // Income sources
  { id: 'b0000000-0000-0000-0000-000000000001', scope: 'income_source', name: 'Pendapatan', is_active: true, sort_order: 1 },
  { id: 'b0000000-0000-0000-0000-000000000002', scope: 'income_source', name: 'Pemberian', is_active: true, sort_order: 2 },
  { id: 'b0000000-0000-0000-0000-000000000003', scope: 'income_source', name: 'Penjualan', is_active: true, sort_order: 3 },
  { id: 'b0000000-0000-0000-0000-000000000004', scope: 'income_source', name: 'Bunga', is_active: true, sort_order: 4 },
  // Expense destinations
  { id: 'b0000000-0000-0000-0000-000000000005', scope: 'expense_destination', name: 'Pembelian/Pembayaran', is_active: true, sort_order: 1 },
  { id: 'b0000000-0000-0000-0000-000000000006', scope: 'expense_destination', name: 'Pemberian', is_active: true, sort_order: 2 },
  { id: 'b0000000-0000-0000-0000-000000000007', scope: 'expense_destination', name: 'Admin/Pajak', is_active: true, sort_order: 3 },
];

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'c0000000-0000-0000-0000-000000000001', transaction_type_id: 'a0000000-0000-0000-0000-000000000001', name: 'Pendapatan Rutin', color: '#1E6B4F', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000002', transaction_type_id: 'a0000000-0000-0000-0000-000000000001', name: 'Bunga & Bagi Hasil', color: '#0D9488', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000003', transaction_type_id: 'a0000000-0000-0000-0000-000000000002', name: 'Tagihan Bulanan', color: '#E11D48', is_active: true },
  { id: 'c0000000-0000-0000-0000-000000000004', transaction_type_id: 'a0000000-0000-0000-0000-000000000002', name: 'Rutinan & Kebutuhan Harian', color: '#D97706', is_active: true },
];

export const INITIAL_SUB_CATEGORIES: SubCategory[] = [
  // Income subcategories
  { id: 'd0000000-0000-0000-0000-000000000001', category_id: 'c0000000-0000-0000-0000-000000000001', name: 'Gaji Pokok', default_limit: null, color: '#1E6B4F', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000002', category_id: 'c0000000-0000-0000-0000-000000000001', name: 'Bonus & Insentif', default_limit: null, color: '#16A34A', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000003', category_id: 'c0000000-0000-0000-0000-000000000002', name: 'Bunga Tabungan / Deposito', default_limit: null, color: '#0D9488', is_active: true },

  // Tagihan Bulanan (with limits)
  { id: 'd0000000-0000-0000-0000-000000000004', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Listrik', default_limit: 210000, color: '#E11D48', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000005', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Wifi', default_limit: 250000, color: '#BE123C', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000006', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Pulsa/Kuota', default_limit: 150000, color: '#F43F5E', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000007', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Air PDAM', default_limit: 80000, color: '#0284C7', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000008', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Air Galon', default_limit: 60000, color: '#0369A1', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000009', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Sampah', default_limit: 50000, color: '#64748B', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000010', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Gas', default_limit: 45000, color: '#F97316', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000011', category_id: 'c0000000-0000-0000-0000-000000000003', name: 'Biaya Admin Bank', default_limit: 30000, color: '#94A3B8', is_active: true },

  // Rutinan
  { id: 'd0000000-0000-0000-0000-000000000012', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Kebutuhan Bahan Makan', default_limit: 1500000, color: '#D97706', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000013', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Makan Harian', default_limit: 1200000, color: '#B45309', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000014', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Kebutuhan Rumah', default_limit: 500000, color: '#78350F', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000015', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Bensin', default_limit: 400000, color: '#EA580C', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000016', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Ojol', default_limit: 150000, color: '#C2410C', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000017', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Parkir', default_limit: 50000, color: '#9A3412', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000018', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Keinginan', default_limit: 500000, color: '#8B5CF6', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000019', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Jajan & Makan Istri', default_limit: 400000, color: '#EC4899', is_active: true },
  { id: 'd0000000-0000-0000-0000-000000000020', category_id: 'c0000000-0000-0000-0000-000000000004', name: 'Jajan Suami', default_limit: 400000, color: '#3B82F6', is_active: true },
];

export const INITIAL_ACCOUNTS: Account[] = [
  // Cash & Bank
  { id: 'e0000000-0000-0000-0000-000000000001', name: 'Seabank Ofi', group_type: 'bank', purpose: 'Rekening Operasional Istri', opening_balance: 2500000, owner_label: 'Ofi', sort_order: 1, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000002', name: 'Seabank Alfian', group_type: 'bank', purpose: 'Rekening Utama Suami', opening_balance: 4500000, owner_label: 'Alfian', sort_order: 2, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000003', name: 'Mandiri', group_type: 'bank', purpose: 'Payroll & Belanja', opening_balance: 1200000, owner_label: 'Alfian', sort_order: 3, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000004', name: 'BNI Alfian', group_type: 'bank', purpose: 'Cadangan Transaksi', opening_balance: 850000, owner_label: 'Alfian', sort_order: 4, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000005', name: 'Cash Dapur', group_type: 'cash', purpose: 'Uang Tunai Sayur & Pasar', opening_balance: 450000, owner_label: 'Bersama', sort_order: 5, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000006', name: 'Cash Alfian', group_type: 'cash', purpose: 'Dompet Alfian', opening_balance: 200000, owner_label: 'Alfian', sort_order: 6, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000007', name: 'Cash Ofi', group_type: 'cash', purpose: 'Dompet Ofi', opening_balance: 150000, owner_label: 'Ofi', sort_order: 7, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000008', name: 'Cash Tagihan', group_type: 'cash', purpose: 'Amplop Iuran & Tagihan Tunai', opening_balance: 300000, owner_label: 'Bersama', sort_order: 8, is_active: true },

  // Tabungan (Target)
  { id: 'e0000000-0000-0000-0000-000000000009', name: 'Tabungan Darurat', group_type: 'tabungan', purpose: 'Dana Darurat 6 Bulan', savings_goal_name: 'Darurat', target_amount: 30000000, opening_balance: 18500000, owner_label: 'Bersama', sort_order: 9, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000010', name: 'Tabungan Kesehatan', group_type: 'tabungan', purpose: 'Biaya Medis & Persalinan', savings_goal_name: 'Kesehatan', target_amount: 20000000, opening_balance: 12000000, owner_label: 'Bersama', sort_order: 10, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000011', name: 'Tabungan Rumah', group_type: 'tabungan', purpose: 'Renovasi & DP Rumah', savings_goal_name: 'Rumah', target_amount: 50000000, opening_balance: 24000000, owner_label: 'Bersama', sort_order: 11, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000012', name: 'Tabungan Kendaraan', group_type: 'tabungan', purpose: 'Upgrade Kendaraan', savings_goal_name: 'Kendaraan', target_amount: 15000000, opening_balance: 7500000, owner_label: 'Bersama', sort_order: 12, is_active: true },

  // Paylater & CC
  { id: 'e0000000-0000-0000-0000-000000000013', name: 'Spaylater Alfian', group_type: 'paylater', purpose: 'Tagihan Paylater Shopee', opening_balance: 0, owner_label: 'Alfian', sort_order: 13, is_active: true },
  { id: 'e0000000-0000-0000-0000-000000000014', name: 'BRI CC', group_type: 'paylater', purpose: 'Kartu Kredit BRI Alfian', opening_balance: 0, owner_label: 'Alfian', sort_order: 14, is_active: true },
];

export const INITIAL_SETTINGS: AppSettings = {
  id: 1,
  emergency_fund_account_id: 'e0000000-0000-0000-0000-000000000009', // Tabungan Darurat
  runway_months_basis: 3,
  show_gold_savings: false,
};

export const INITIAL_PLANS: QuarterlyPlan[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    year: 2026,
    quarter: 4,
    title: 'Q4 2026 - Persiapan Kelahiran & Akhir Tahun',
    notes: 'Prioritas dana persalinan dan batasi pengeluaran non-rutin.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    year: 2026,
    quarter: 3,
    title: 'Q3 2026 - Stabilisasi Cashflow',
    notes: 'Rencana kuartal 3 untuk belanja rumah dan perawatan.',
    created_at: new Date().toISOString(),
  },
];

export const INITIAL_PLAN_ITEMS: QuarterlyPlanItem[] = [
  { id: 'pi-1', plan_id: 'f0000000-0000-0000-0000-000000000001', sub_category_id: 'd0000000-0000-0000-0000-000000000004', monthly_limit: 210000, note: 'Listrik pascabayar' },
  { id: 'pi-2', plan_id: 'f0000000-0000-0000-0000-000000000001', sub_category_id: 'd0000000-0000-0000-0000-000000000005', monthly_limit: 250000, note: 'Wifi Indihome' },
  { id: 'pi-3', plan_id: 'f0000000-0000-0000-0000-000000000001', sub_category_id: 'd0000000-0000-0000-0000-000000000012', monthly_limit: 1500000, note: 'Bahan masak dapur' },
  { id: 'pi-4', plan_id: 'f0000000-0000-0000-0000-000000000001', sub_category_id: 'd0000000-0000-0000-0000-000000000015', monthly_limit: 400000, note: 'Bensin motor & mobil' },
  { id: 'pi-5', plan_id: 'f0000000-0000-0000-0000-000000000001', sub_category_id: 'd0000000-0000-0000-0000-000000000018', monthly_limit: 450000, note: 'Keinginan & hiburan' },
  { id: 'pi-6', plan_id: 'f0000000-0000-0000-0000-000000000001', sub_category_id: 'd0000000-0000-0000-0000-000000000019', monthly_limit: 400000, note: 'Jajan istri' },
];

// Rich sample transactions for realistic testing and immediate interactive preview
export const INITIAL_TRANSACTIONS: Transaction[] = [
  // Bulan Oktober 2026 (Bulan berjalan pada metadata prompt)
  {
    id: 'tx-001',
    tx_date: '2026-10-01',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000001', // Income
    category_id: 'c0000000-0000-0000-0000-000000000001',
    sub_category_id: 'd0000000-0000-0000-0000-000000000001',
    source_party_id: 'b0000000-0000-0000-0000-000000000001', // Pendapatan
    destination_account_id: 'e0000000-0000-0000-0000-000000000002', // Seabank Alfian
    amount: 14500000,
    description: 'Gaji Pokok & Tunjangan Bulanan',
  },
  {
    id: 'tx-002',
    tx_date: '2026-10-02',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000003', // Transfer
    source_account_id: 'e0000000-0000-0000-0000-000000000002', // Seabank Alfian
    destination_account_id: 'e0000000-0000-0000-0000-000000000001', // Seabank Ofi
    amount: 5000000,
    description: 'Alokasi belanja bulanan & operasional keluarga ke istri',
  },
  {
    id: 'tx-003',
    tx_date: '2026-10-02',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000003', // Transfer
    source_account_id: 'e0000000-0000-0000-0000-000000000002', // Seabank Alfian
    destination_account_id: 'e0000000-0000-0000-0000-000000000009', // Tabungan Darurat
    amount: 1500000,
    description: 'Alokasi rutin dana darurat awal bulan',
  },
  {
    id: 'tx-004',
    tx_date: '2026-10-03',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000002', // Expense
    category_id: 'c0000000-0000-0000-0000-000000000003',
    sub_category_id: 'd0000000-0000-0000-0000-000000000005', // Wifi (limit 250.000)
    source_account_id: 'e0000000-0000-0000-0000-000000000001', // Seabank Ofi
    destination_party_id: 'b0000000-0000-0000-0000-000000000005', // Pembelian/Pembayaran
    amount: 255000, // Sengaja melebihi limit 250.000 untuk trigger flag limit
    description: 'Tagihan Wifi Biznet Rumah (+ biaya admin)',
  },
  {
    id: 'tx-005',
    tx_date: '2026-10-04',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000002', // Expense
    category_id: 'c0000000-0000-0000-0000-000000000003',
    sub_category_id: 'd0000000-0000-0000-0000-000000000004', // Listrik (limit 210.000)
    source_account_id: 'e0000000-0000-0000-0000-000000000001',
    destination_party_id: 'b0000000-0000-0000-0000-000000000005',
    amount: 195000, // Status: Mendekati (>= 80%)
    description: 'Token listrik PLN 200rb',
  },
  {
    id: 'tx-006',
    tx_date: '2026-10-04',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000002', // Expense
    category_id: 'c0000000-0000-0000-0000-000000000004',
    sub_category_id: 'd0000000-0000-0000-0000-000000000012', // Kebutuhan Bahan Makan
    source_account_id: 'e0000000-0000-0000-0000-000000000005', // Cash Dapur
    destination_party_id: 'b0000000-0000-0000-0000-000000000005',
    amount: 420000,
    description: 'Belanja sayur, ayam, ikan dan buah mingguan di pasar',
  },
  {
    id: 'tx-007',
    tx_date: '2026-10-05',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000002', // Expense
    category_id: 'c0000000-0000-0000-0000-000000000004',
    sub_category_id: 'd0000000-0000-0000-0000-000000000015', // Bensin
    source_account_id: 'e0000000-0000-0000-0000-000000000002', // Seabank Alfian
    destination_party_id: 'b0000000-0000-0000-0000-000000000005',
    amount: 150000,
    description: 'Isi Pertamax mobil SPBU',
  },
  {
    id: 'tx-008',
    tx_date: '2026-10-05',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000001', // Income
    category_id: 'c0000000-0000-0000-0000-000000000002',
    sub_category_id: 'd0000000-0000-0000-0000-000000000003', // Bunga
    source_party_id: 'b0000000-0000-0000-0000-000000000004', // Bunga
    destination_account_id: 'e0000000-0000-0000-0000-000000000001', // Seabank Ofi
    amount: 12500,
    description: 'Bunga harian Seabank',
  },

  // Transaksi Bulan September 2026 (untuk perbandingan tren dan rata-rata pengeluaran)
  {
    id: 'tx-009',
    tx_date: '2026-09-01',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000001',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    sub_category_id: 'd0000000-0000-0000-0000-000000000001',
    source_party_id: 'b0000000-0000-0000-0000-000000000001',
    destination_account_id: 'e0000000-0000-0000-0000-000000000002',
    amount: 14500000,
    description: 'Gaji Pokok September',
  },
  {
    id: 'tx-010',
    tx_date: '2026-09-05',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000002',
    category_id: 'c0000000-0000-0000-0000-000000000003',
    sub_category_id: 'd0000000-0000-0000-0000-000000000005',
    source_account_id: 'e0000000-0000-0000-0000-000000000001',
    destination_party_id: 'b0000000-0000-0000-0000-000000000005',
    amount: 250000,
    description: 'Wifi Indihome September',
  },
  {
    id: 'tx-011',
    tx_date: '2026-09-12',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000002',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    sub_category_id: 'd0000000-0000-0000-0000-000000000012',
    source_account_id: 'e0000000-0000-0000-0000-000000000005',
    destination_party_id: 'b0000000-0000-0000-0000-000000000005',
    amount: 1450000,
    description: 'Belanja stok bahan masakan September',
  },
  {
    id: 'tx-012',
    tx_date: '2026-09-20',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000002',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    sub_category_id: 'd0000000-0000-0000-0000-000000000015',
    source_account_id: 'e0000000-0000-0000-0000-000000000002',
    destination_party_id: 'b0000000-0000-0000-0000-000000000005',
    amount: 380000,
    description: 'Bensin & tol September',
  },

  // Transaksi Bulan Agustus 2026
  {
    id: 'tx-013',
    tx_date: '2026-08-01',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000001',
    category_id: 'c0000000-0000-0000-0000-000000000001',
    sub_category_id: 'd0000000-0000-0000-0000-000000000001',
    source_party_id: 'b0000000-0000-0000-0000-000000000001',
    destination_account_id: 'e0000000-0000-0000-0000-000000000002',
    amount: 14500000,
    description: 'Gaji Pokok Agustus',
  },
  {
    id: 'tx-014',
    tx_date: '2026-08-10',
    transaction_type_id: 'a0000000-0000-0000-0000-000000000002',
    category_id: 'c0000000-0000-0000-0000-000000000004',
    sub_category_id: 'd0000000-0000-0000-0000-000000000012',
    source_account_id: 'e0000000-0000-0000-0000-000000000005',
    destination_party_id: 'b0000000-0000-0000-0000-000000000005',
    amount: 1350000,
    description: 'Belanja dapur Agustus',
  },
];
