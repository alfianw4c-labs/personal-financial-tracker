import React, { useState, useMemo } from 'react';
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  TrendingDown,
  Shield,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Calendar,
  X,
  CreditCard,
  Building,
  Coins,
  Receipt,
  PieChart as PieChartIcon,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ReceiptText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import { useData } from '../../context/DataContext';
import { formatRupiah, formatDateID, INDO_MONTHS } from '../../lib/formatters';
import { BudgetEvaluationSection } from './BudgetEvaluationSection';

const PLANNING_YEARS = Array.from({ length: 2040 - 2024 + 1 }, (_, i) => 2024 + i);

export type DashboardDateFilterMode = 'all_time' | 'month' | 'range';

interface DashboardViewProps {
  onNavigateToTransactions: () => void;
  onNavigateToPlanning: () => void;
}

export function DashboardView({ onNavigateToTransactions, onNavigateToPlanning }: DashboardViewProps) {
  const {
    accounts,
    transactions,
    transactionTypes,
    categories,
    subCategories,
    quarterlyPlans,
    quarterlyPlanItems,
    flowParties,
    settings,
    privacyMode,
    getMonthlyLimitStatusList,
  } = useData();

  // Mode filter tanggal dashboard (all_time | month | range)
  const [filterMode, setFilterMode] = useState<DashboardDateFilterMode>('month');
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  });

  // Modal Flag Limit Detail
  const [showFlagModal, setShowFlagModal] = useState<boolean>(false);

  // State Evaluasi Anggaran di Dashboard
  const [filterOnlyExceeded, setFilterOnlyExceeded] = useState<boolean>(false);
  const [expandedSubCats, setExpandedSubCats] = useState<Set<string>>(new Set());

  // Toggle Accordion per Sub Kategori
  const toggleExpand = (subCatId: string) => {
    setExpandedSubCats((prev) => {
      const next = new Set(prev);
      if (next.has(subCatId)) {
        next.delete(subCatId);
      } else {
        next.add(subCatId);
      }
      return next;
    });
  };

  const handleToggleExpandAll = (itemCount: number, ids: string[]) => {
    if (expandedSubCats.size > 0) {
      setExpandedSubCats(new Set());
    } else {
      setExpandedSubCats(new Set(ids));
    }
  };

  // Label periode yang aktif
  const periodLabel = useMemo(() => {
    if (filterMode === 'all_time') return 'Semua Waktu';
    if (filterMode === 'month') return `${INDO_MONTHS[selectedMonth - 1]} ${selectedYear}`;
    if (filterMode === 'range') return `${formatDateID(startDate)} — ${formatDateID(endDate)}`;
    return '';
  }, [filterMode, selectedMonth, selectedYear, startDate, endDate]);

  // Transaksi terfilter sesuai mode tanggal yang aktif
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.tx_date) return false;
      if (filterMode === 'all_time') return true;
      if (filterMode === 'month') {
        const prefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
        return t.tx_date.startsWith(prefix);
      }
      if (filterMode === 'range') {
        if (startDate && t.tx_date < startDate) return false;
        if (endDate && t.tx_date > endDate) return false;
        return true;
      }
      return true;
    });
  }, [transactions, filterMode, selectedYear, selectedMonth, startDate, endDate]);

  // Available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<number>(PLANNING_YEARS);
    transactions.forEach((t) => {
      if (t.tx_date) {
        const y = new Date(t.tx_date).getFullYear();
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // 1. Group balances
  const balancesByGroup = useMemo(() => {
    let cash = 0;
    let bank = 0;
    let tabungan = 0;
    let paylater = 0;

    for (const a of accounts) {
      if (!a.is_active) continue;
      const bal = Number(a.current_balance) || 0;
      if (a.group_type === 'cash') cash += bal;
      if (a.group_type === 'bank') bank += bal;
      if (a.group_type === 'tabungan') tabungan += bal;
      if (a.group_type === 'paylater') paylater += bal;
    }

    const liquidCashAndBank = cash + bank;
    const netBalance = liquidCashAndBank - Math.abs(paylater);
    const totalWealth = tabungan + netBalance;

    return {
      cash,
      bank,
      tabungan,
      paylater,
      liquidCashAndBank,
      netBalance,
      totalWealth,
    };
  }, [accounts]);

  // 2. Tabungan breakdown per tujuan
  const savingsGoalsBreakdown = useMemo(() => {
    const savingsAccounts = accounts.filter((a) => a.group_type === 'tabungan' && a.is_active);
    const colors = ['#3B82F6', '#6366F1', '#8B5CF6', '#EC4899', '#06B6D4', '#10B981'];

    return savingsAccounts.map((a, idx) => ({
      name: a.savings_goal_name || a.name,
      balance: Math.max(0, Number(a.current_balance) || 0),
      target: Number(a.target_amount) || 0,
      color: colors[idx % colors.length],
    }));
  }, [accounts]);

  // 3. Ringkasan Periode Terpilih (Pemasukan, Pengeluaran, Cashflow)
  const monthSummary = useMemo(() => {
    let incomeCurrent = 0;
    let expenseCurrent = 0;
    let incomePrev = 0;
    let expensePrev = 0;

    const incomeTypeIds = new Set(transactionTypes.filter((t) => t.kind === 'income').map((t) => t.id));
    const expenseTypeIds = new Set(transactionTypes.filter((t) => t.kind === 'expense').map((t) => t.id));

    // Hitung periode aktif dari filteredTransactions
    for (const t of filteredTransactions) {
      const amt = Number(t.amount) || 0;
      if (incomeTypeIds.has(t.transaction_type_id)) incomeCurrent += amt;
      if (expenseTypeIds.has(t.transaction_type_id)) expenseCurrent += amt;
    }

    // Jika mode 'month', hitung perbandingan dengan bulan sebelumnya
    let prevMonthName = '';
    let expenseDiff = 0;
    let incomeDiff = 0;

    if (filterMode === 'month') {
      let prevMonth = selectedMonth - 1;
      let prevYear = selectedYear;
      if (prevMonth < 1) {
        prevMonth = 12;
        prevYear = selectedYear - 1;
      }
      const prevPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

      for (const t of transactions) {
        if (!t.tx_date?.startsWith(prevPrefix)) continue;
        const amt = Number(t.amount) || 0;
        if (incomeTypeIds.has(t.transaction_type_id)) incomePrev += amt;
        if (expenseTypeIds.has(t.transaction_type_id)) expensePrev += amt;
      }

      prevMonthName = INDO_MONTHS[prevMonth - 1];
      expenseDiff = expenseCurrent - expensePrev;
      incomeDiff = incomeCurrent - incomePrev;
    }

    const cashflowCurrent = incomeCurrent - expenseCurrent;
    const cashflowPrev = incomePrev - expensePrev;

    return {
      incomeCurrent,
      expenseCurrent,
      cashflowCurrent,
      incomePrev,
      expensePrev,
      cashflowPrev,
      expenseDiff,
      incomeDiff,
      prevMonthName,
    };
  }, [filteredTransactions, transactions, transactionTypes, filterMode, selectedYear, selectedMonth]);

  // 4. Perhitungan Hidup Tanpa Gaji (Emergency Fund Runway)
  const runwayMetric = useMemo(() => {
    const basisMonths = settings.runway_months_basis || 3;
    let totalPastExpense = 0;
    let countMonths = 0;

    const expenseTypeIds = new Set(transactionTypes.filter((t) => t.kind === 'expense').map((t) => t.id));

    for (let i = 1; i <= basisMonths; i++) {
      let m = selectedMonth - i;
      let y = selectedYear;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      const prefix = `${y}-${String(m).padStart(2, '0')}`;
      let mExpense = 0;

      for (const t of transactions) {
        if (t.tx_date?.startsWith(prefix) && expenseTypeIds.has(t.transaction_type_id)) {
          mExpense += Number(t.amount) || 0;
        }
      }

      if (mExpense > 0) {
        totalPastExpense += mExpense;
        countMonths++;
      }
    }

    // Jika riwayat bulan lalu sedikit, fallback ke pengeluaran bulan ini jika ada
    if (countMonths === 0 && monthSummary.expenseCurrent > 0) {
      totalPastExpense = monthSummary.expenseCurrent;
      countMonths = 1;
    }

    const avgExpense = countMonths > 0 ? totalPastExpense / countMonths : 3500000;

    // Saldo dana darurat
    const emergencyAcc =
      accounts.find((a) => a.id === settings.emergency_fund_account_id) ||
      accounts.find((a) => a.name.toLowerCase().includes('darurat'));
    const emergencyBalance = emergencyAcc ? Number(emergencyAcc.current_balance) || 0 : balancesByGroup.tabungan;

    const monthsRunway = avgExpense > 0 ? (emergencyBalance / avgExpense).toFixed(1) : '0';

    return {
      runwayMonths: monthsRunway,
      emergencyBalance,
      avgExpense,
      accountName: emergencyAcc?.name || 'Tabungan Darurat',
    };
  }, [settings, selectedMonth, selectedYear, transactions, transactionTypes, accounts, monthSummary, balancesByGroup]);

  // 5. Pemasukan per Sumber & Pengeluaran per Tujuan
  const flowPartiesBreakdown = useMemo(() => {
    const incomeSources: Record<string, number> = {};
    const expenseDestinations: Record<string, number> = {};

    const partyMap = new Map(flowParties.map((p) => [p.id, p]));

    for (const t of filteredTransactions) {
      const amt = Number(t.amount) || 0;

      if (t.source_party_id) {
        const p = partyMap.get(t.source_party_id);
        const name = p?.name || 'Pendapatan';
        incomeSources[name] = (incomeSources[name] || 0) + amt;
      }
      if (t.destination_party_id) {
        const p = partyMap.get(t.destination_party_id);
        const name = p?.name || 'Pembelian/Pembayaran';
        expenseDestinations[name] = (expenseDestinations[name] || 0) + amt;
      }
    }

    return {
      incomeSources: Object.entries(incomeSources).map(([name, value]) => ({ name, value })),
      expenseDestinations: Object.entries(expenseDestinations).map(([name, value]) => ({ name, value })),
    };
  }, [filteredTransactions, flowParties]);

  // 6. Sub Kategori Belanja & Rencana Anggaran (Untuk Evaluasi di Dashboard)
  const expenseTypeIds = useMemo(
    () => new Set(transactionTypes.filter((t) => t.kind === 'expense').map((t) => t.id)),
    [transactionTypes]
  );
  const expenseCatIds = useMemo(
    () => new Set(categories.filter((c) => expenseTypeIds.has(c.transaction_type_id)).map((c) => c.id)),
    [categories, expenseTypeIds]
  );
  const expenseSubCategories = useMemo(
    () => subCategories.filter((s) => expenseCatIds.has(s.category_id)),
    [subCategories, expenseCatIds]
  );

  const effectiveQuarter = useMemo(() => {
    const effectiveMonth = filterMode === 'month' ? selectedMonth : new Date().getMonth() + 1;
    return Math.ceil(effectiveMonth / 3);
  }, [filterMode, selectedMonth]);

  const activeQuarterlyPlan = useMemo(() => {
    const effectiveYear = filterMode === 'month' ? selectedYear : new Date().getFullYear();
    return quarterlyPlans.find((p) => Number(p.year) === effectiveYear && Number(p.quarter) === effectiveQuarter);
  }, [quarterlyPlans, filterMode, selectedYear, effectiveQuarter]);

  const activePlanItems = useMemo(() => {
    if (!activeQuarterlyPlan) return [];
    return quarterlyPlanItems.filter((i) => i.plan_id === activeQuarterlyPlan.id);
  }, [quarterlyPlanItems, activeQuarterlyPlan]);

  // Evaluasi & Monitoring Realisasi Anggaran per Sub Kategori
  const monitoringList = useMemo(() => {
    const spentBySubCat: Record<string, number> = {};
    for (const t of filteredTransactions) {
      if (expenseTypeIds.has(t.transaction_type_id) && t.sub_category_id) {
        spentBySubCat[t.sub_category_id] = (spentBySubCat[t.sub_category_id] || 0) + Number(t.amount);
      }
    }

    const list = expenseSubCategories.map((sub) => {
      const customItem = activePlanItems.find((pi) => pi.sub_category_id === sub.id);
      const limit = customItem
        ? Number(customItem.monthly_limit)
        : sub.default_limit !== null
        ? Number(sub.default_limit)
        : null;
      const spent = spentBySubCat[sub.id] || 0;
      const remaining = limit !== null ? limit - spent : null;
      const percentage = limit && limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status: 'aman' | 'mendekati' | 'melebihi' | 'tanpa_limit' = 'tanpa_limit';
      if (limit !== null) {
        if (spent > limit) {
          status = 'melebihi';
        } else if (percentage >= 80) {
          status = 'mendekati';
        } else {
          status = 'aman';
        }
      }

      return {
        sub_category_id: sub.id,
        sub_category_name: sub.name,
        monthly_limit: limit,
        spent,
        remaining,
        percentage,
        status,
        note: customItem?.note || '',
      };
    });

    return list.filter((item) => {
      if (filterOnlyExceeded) {
        return item.status === 'melebihi';
      }
      return true;
    });
  }, [
    filteredTransactions,
    expenseTypeIds,
    expenseSubCategories,
    activePlanItems,
    filterOnlyExceeded,
  ]);

  // Map transaksi belanja per sub kategori untuk akordion
  const txMapBySubCategory = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    for (const t of filteredTransactions) {
      if (expenseTypeIds.has(t.transaction_type_id) && t.sub_category_id) {
        const arr = map.get(t.sub_category_id) || [];
        arr.push(t);
        map.set(t.sub_category_id, arr);
      }
    }
    return map;
  }, [filteredTransactions, expenseTypeIds]);

  const exceededLimitItems = useMemo(() => {
    return monitoringList.filter((item) => item.status === 'melebihi');
  }, [monitoringList]);

  // 7. Tren Arus Kas 6 Bulan Terakhir
  const trendData = useMemo(() => {
    const data = [];
    const incomeTypeIds = new Set(transactionTypes.filter((t) => t.kind === 'income').map((t) => t.id));
    const expenseTypeIds = new Set(transactionTypes.filter((t) => t.kind === 'expense').map((t) => t.id));

    const baseYear = filterMode === 'month' ? selectedYear : new Date().getFullYear();
    const baseMonth = filterMode === 'month' ? selectedMonth : new Date().getMonth() + 1;

    for (let i = 5; i >= 0; i--) {
      let m = baseMonth - i;
      let y = baseYear;
      while (m < 1) {
        m += 12;
        y -= 1;
      }
      const prefix = `${y}-${String(m).padStart(2, '0')}`;
      let inc = 0;
      let exp = 0;

      for (const t of transactions) {
        if (!t.tx_date?.startsWith(prefix)) continue;
        const amt = Number(t.amount) || 0;
        if (incomeTypeIds.has(t.transaction_type_id)) inc += amt;
        if (expenseTypeIds.has(t.transaction_type_id)) exp += amt;
      }

      data.push({
        monthName: `${INDO_MONTHS[m - 1].slice(0, 3)} '${String(y).slice(2)}`,
        Pemasukan: inc,
        Pengeluaran: exp,
      });
    }

    return data;
  }, [filterMode, selectedYear, selectedMonth, transactions, transactionTypes]);

  // 8. 10 Transaksi Terakhir (Sesuai Filter)
  const recentTransactions = useMemo(() => {
    return [...filteredTransactions].slice(0, 10);
  }, [filteredTransactions]);

  // Donut data: Saldo Bersih vs Tabungan
  const wealthDonutData = useMemo(() => {
    return [
      { name: 'Saldo Bersih (Kas/Bank)', value: Math.max(0, balancesByGroup.netBalance), color: '#1E6B4F' },
      { name: 'Tabungan Keluarga', value: Math.max(0, balancesByGroup.tabungan), color: '#3B82F6' },
    ];
  }, [balancesByGroup]);

  return (
    <div className="w-full max-w-[1680px] mx-auto px-2.5 sm:px-4 lg:px-6 py-4 space-y-4">
      {/* FILTER HEADER (Semua Waktu, Pilih Bulan, atau Rentang Tanggal) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1E6B4F]" />
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Arus Kas
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Periode Laporan: <span className="font-semibold text-slate-800">{periodLabel}</span>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-wrap">
          {/* Mode Selector Tabs (All Time, Pilih Bulan, Rentang Tanggal) */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setFilterMode('all_time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'all_time'
                  ? 'bg-white text-[#1E6B4F] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Semua Waktu
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'month'
                  ? 'bg-white text-[#1E6B4F] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pilih Bulan
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('range')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'range'
                  ? 'bg-white text-[#1E6B4F] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rentang Tanggal
            </button>
          </div>

          {/* Sub Controls Berdasarkan Mode Filter */}
          {filterMode === 'month' && (
            <div className="flex items-center gap-2">
              {/* Pilih Bulan */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] cursor-pointer"
              >
                {INDO_MONTHS.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Pilih Tahun (Hingga 2040) */}
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] cursor-pointer"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    Tahun {yr}
                  </option>
                ))}
              </select>
            </div>
          )}

          {filterMode === 'range' && (
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <span className="text-[11px] font-semibold text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {filterMode === 'all_time' && (
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
              Total {filteredTransactions.length} Transaksi
            </span>
          )}
        </div>
      </div>

      {/* TOP METRICS: SELURUH KEKAYAAN, SALDO BERSIH, TABUNGAN, RUNWAY */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Seluruh Kekayaan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Seluruh Kekayaan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1E6B4F] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
              {formatRupiah(balancesByGroup.totalWealth, privacyMode)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Tabungan + Saldo Bersih (Kas/Bank - Hutang)
            </p>
          </div>
        </div>

        {/* Saldo Bersih */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Saldo Bersih Operasional</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1E6B4F] flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-[#1E6B4F] tabular-nums">
              {formatRupiah(balancesByGroup.netBalance, privacyMode)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span>Kas & Bank: {formatRupiah(balancesByGroup.liquidCashAndBank, privacyMode)}</span>
              {balancesByGroup.paylater < 0 && (
                <span className="text-amber-700">· Hutang: {formatRupiah(Math.abs(balancesByGroup.paylater), privacyMode)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Total Tabungan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Tabungan</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight text-blue-600 tabular-nums">
              {formatRupiah(balancesByGroup.tabungan, privacyMode)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {savingsGoalsBreakdown.length} Akun Simpanan Terpisah
            </p>
          </div>
        </div>

        {/* Hidup Tanpa Gaji */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Hidup Tanpa Gaji</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {runwayMetric.runwayMonths}
              </span>
              <span className="text-sm font-semibold text-slate-600">Bulan</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {runwayMetric.accountName} / Rata-rata Pengeluaran
            </p>
          </div>
        </div>
      </div>

      {/* KARTU FLAG LIMIT & RINGKASAN CASHFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ringkasan Periode Ini (Income, Expense, Cashflow) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              {filterMode === 'month'
                ? `Ringkasan Bulan Ini (${INDO_MONTHS[selectedMonth - 1]})`
                : filterMode === 'all_time'
                ? 'Ringkasan Semua Waktu'
                : 'Ringkasan Rentang Tanggal Terpilih'}
            </h2>
            <span className="text-xs text-slate-400">
              {filterMode === 'month'
                ? `Dibanding ${monthSummary.prevMonthName}`
                : filterMode === 'all_time'
                ? 'Seluruh data transaksi'
                : `${formatDateID(startDate)} s/d ${formatDateID(endDate)}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-xs text-emerald-800 font-medium">Pemasukan</span>
              <div className="text-xl font-bold text-emerald-900 tabular-nums mt-1">
                {formatRupiah(monthSummary.incomeCurrent, privacyMode)}
              </div>
              {filterMode === 'month' && (
                <div className="flex items-center gap-1 text-[11px] mt-1 text-emerald-700">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>
                    {monthSummary.incomeDiff >= 0 ? '+' : ''}
                    {formatRupiah(monthSummary.incomeDiff, privacyMode)}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-100">
              <span className="text-xs text-rose-800 font-medium">Pengeluaran</span>
              <div className="text-xl font-bold text-rose-900 tabular-nums mt-1">
                {formatRupiah(monthSummary.expenseCurrent, privacyMode)}
              </div>
              {filterMode === 'month' && (
                <div className="flex items-center gap-1 text-[11px] mt-1 text-rose-700">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>
                    {monthSummary.expenseDiff >= 0 ? '+' : ''}
                    {formatRupiah(monthSummary.expenseDiff, privacyMode)}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs text-slate-600 font-medium">Arus Kas Bersih</span>
              <div
                className={`text-xl font-bold tabular-nums mt-1 ${
                  monthSummary.cashflowCurrent >= 0 ? 'text-[#1E6B4F]' : 'text-rose-600'
                }`}
              >
                {formatRupiah(monthSummary.cashflowCurrent, privacyMode)}
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                {monthSummary.cashflowCurrent >= 0 ? 'Surplus Periode' : 'Defisit Periode'}
              </span>
            </div>
          </div>
        </div>

        {/* Kartu Flag Limit */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Status Anggaran</span>
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  exceededLimitItems.length > 0 ? 'bg-rose-500 animate-ping' : 'bg-emerald-500'
                }`}
              />
            </div>
            <div className="mt-3">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-3xl font-extrabold tabular-nums ${
                    exceededLimitItems.length > 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {exceededLimitItems.length}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  Sub Kategori Melebihi Limit
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                {exceededLimitItems.length > 0
                  ? `Ada pengeluaran ${exceededLimitItems.map((i) => i.sub_category_name).slice(0, 2).join(', ')}${
                      exceededLimitItems.length > 2 ? '...' : ''
                    } yang melampaui limit anggaran periode ini.`
                  : 'Seluruh pos pengeluaran berada dalam batas aman anggaran.'}
              </p>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setShowFlagModal(true)}
              disabled={exceededLimitItems.length === 0}
              className="text-xs font-semibold text-rose-600 hover:text-rose-800 disabled:opacity-40 disabled:hover:text-rose-600 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Detail Flag</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNavigateToPlanning}
              className="text-xs font-semibold text-[#1E6B4F] hover:underline cursor-pointer"
            >
              Atur Rencana
            </button>
          </div>
        </div>
      </div>

      {/* DONUT CHARTS: KEKAYAAN & TABUNGAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Donut Saldo Bersih vs Tabungan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Saldo Bersih vs Tabungan
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={wealthDonutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {wealthDonutData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: any) => formatRupiah(Number(value), privacyMode)}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 text-xs mt-2">
            {wealthDonutData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-600">{d.name}:</span>
                <span className="font-bold text-slate-900 tabular-nums">
                  {formatRupiah(d.value, privacyMode)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Tabungan per Tujuan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-4">
            Alokasi Tabungan per Tujuan
          </h2>
          {savingsGoalsBreakdown.length > 0 ? (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={savingsGoalsBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="balance"
                    >
                      {savingsGoalsBreakdown.map((entry, index) => (
                        <Cell key={`goal-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: any) => formatRupiah(Number(value), privacyMode)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                {savingsGoalsBreakdown.map((g, i) => (
                  <div key={i} className="flex items-center gap-1.5 truncate">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                    <span className="text-slate-600 truncate">{g.name}:</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatRupiah(g.balance, privacyMode)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">
              Belum ada akun tabungan
            </div>
          )}
        </div>
      </div>

      {/* PROGRESS TABUNGAN BERTARGET */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4">
          Progress Tabungan Bertarget
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {savingsGoalsBreakdown.map((goal, idx) => {
            const pct = goal.target > 0 ? Math.min(100, Math.round((goal.balance / goal.target) * 100)) : 100;
            return (
              <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 truncate">{goal.name}</span>
                  <span className="font-bold text-[#1E6B4F] tabular-nums">{pct}%</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-[#1E6B4F] rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 tabular-nums">
                  <span>{formatRupiah(goal.balance, privacyMode)}</span>
                  <span>Target: {formatRupiah(goal.target, privacyMode)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PEMASUKAN PER SUMBER & PENGELUARAN PER TUJUAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Pemasukan per Pihak Sumber
          </h2>
          <div className="space-y-2">
            {flowPartiesBreakdown.incomeSources.length > 0 ? (
              flowPartiesBreakdown.incomeSources.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span className="font-bold text-emerald-800 tabular-nums">
                    {formatRupiah(item.value, privacyMode)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">Belum ada transaksi pemasukan pada bulan ini</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
          <h2 className="text-sm font-bold text-slate-900">
            Pengeluaran per Pihak Tujuan
          </h2>
          <div className="space-y-2">
            {flowPartiesBreakdown.expenseDestinations.length > 0 ? (
              flowPartiesBreakdown.expenseDestinations.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                  <span className="font-medium text-slate-700">{item.name}</span>
                  <span className="font-bold text-rose-800 tabular-nums">
                    {formatRupiah(item.value, privacyMode)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">Belum ada transaksi pengeluaran pada bulan ini</p>
            )}
          </div>
        </div>
      </div>

      {/* TREN ARUS KAS 6 BULAN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-4">
          Tren Arus Kas (Pemasukan vs Pengeluaran 6 Bulan)
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="monthName" tick={{ fontSize: 12, fill: '#64748B' }} />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748B' }}
                tickFormatter={(val) => `Rp${(val / 1000000).toFixed(0)}jt`}
              />
              <Tooltip
                formatter={(val: any) => formatRupiah(Number(val), privacyMode)}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 10 }} />
              <Bar dataKey="Pemasukan" fill="#1E6B4F" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Pengeluaran" fill="#E11D48" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* EVALUASI & REALISASI ANGGARAN PER SUB KATEGORI (DI BAWAH TREN ARUS KAS) */}
      <BudgetEvaluationSection
        periodLabel={
          filterMode === 'month'
            ? `${INDO_MONTHS[selectedMonth - 1]} ${selectedYear}`
            : filterMode === 'all_time'
            ? 'Semua Waktu'
            : `${formatDateID(startDate)} - ${formatDateID(endDate)}`
        }
        filterMode={filterMode}
        monitoringList={monitoringList}
        expenseSubCategories={expenseSubCategories}
        activePlanItems={activePlanItems}
        categories={categories}
        expandedSubCats={expandedSubCats}
        txMapBySubCategory={txMapBySubCategory}
        filterOnlyExceeded={filterOnlyExceeded}
        setFilterOnlyExceeded={setFilterOnlyExceeded}
        toggleExpand={toggleExpand}
        handleToggleExpandAll={handleToggleExpandAll}
        privacyMode={privacyMode}
        onNavigateToPlanning={onNavigateToPlanning}
        effectiveQuarter={effectiveQuarter}
      />

      {/* SALDO AKUN BERWARNA PER GRUP */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Saldo Akun Keuangan (Cash, Bank, Tabungan, PayLater)
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {accounts
            .filter((a) => a.is_active)
            .map((acc) => {
              let groupBadge = 'Kas';
              let badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
              let Icon = Coins;

              if (acc.group_type === 'bank') {
                groupBadge = 'Bank';
                badgeColor = 'bg-teal-50 text-teal-800 border-teal-200';
                Icon = Building;
              } else if (acc.group_type === 'tabungan') {
                groupBadge = 'Tabungan';
                badgeColor = 'bg-blue-50 text-blue-800 border-blue-200';
                Icon = PiggyBank;
              } else if (acc.group_type === 'paylater') {
                groupBadge = 'PayLater/CC';
                badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                Icon = CreditCard;
              }

              return (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-900 text-xs block">{acc.name}</span>
                      <span className="text-[11px] text-slate-400">
                        {acc.owner_label ? `Milik: ${acc.owner_label}` : acc.purpose || '-'}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${badgeColor}`}>
                      {groupBadge}
                    </span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Saldo:</span>
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        acc.group_type === 'paylater'
                          ? 'text-amber-700'
                          : acc.group_type === 'tabungan'
                          ? 'text-blue-700'
                          : 'text-[#1E6B4F]'
                      }`}
                    >
                      {formatRupiah(acc.current_balance, privacyMode)}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* TRANSAKSI TERAKHIR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Transaksi Terakhir
          </h2>
          <button
            onClick={onNavigateToTransactions}
            className="text-xs font-semibold text-[#1E6B4F] hover:underline flex items-center gap-1"
          >
            <span>Buka Semua Transaksi</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentTransactions.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada mutasi transaksi yang tercatat.
            </div>
          ) : (
            recentTransactions.map((tx) => {
              const isIncome = tx.type_kind === 'income';
              const isExpense = tx.type_kind === 'expense';

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isIncome
                          ? 'bg-emerald-100 text-emerald-800'
                          : isExpense
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {isIncome ? '+' : isExpense ? '-' : '⇄'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {tx.sub_category_name || tx.category_name || tx.type_name}
                        </span>
                        <span className="text-[11px] text-slate-400">·</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {formatDateID(tx.tx_date)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                        {tx.source_name} → {tx.destination_name}
                        {tx.description ? ` (${tx.description})` : ''}
                      </p>
                    </div>
                  </div>

                  <div
                    className={`text-xs font-bold tabular-nums whitespace-nowrap ${
                      isIncome ? 'text-emerald-700' : isExpense ? 'text-rose-700' : 'text-blue-700'
                    }`}
                  >
                    {isIncome ? '+' : isExpense ? '-' : ''}
                    {formatRupiah(tx.amount, privacyMode)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* MODAL FLAG LIMIT DETAIL (Point 8a) */}
      {showFlagModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-100 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-slate-900 text-base">
                  Daftar Sub Kategori Melebihi Limit ({INDO_MONTHS[selectedMonth - 1]} {selectedYear})
                </h3>
              </div>
              <button
                onClick={() => setShowFlagModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              {exceededLimitItems.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-rose-200 bg-rose-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">
                      {item.sub_category_name}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-600 text-white font-bold">
                      Lebih {formatRupiah(item.spent - (item.monthly_limit || 0), privacyMode)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-600">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Limit Bulanan:</span>
                      <span className="font-semibold text-slate-800 tabular-nums">
                        {formatRupiah(item.monthly_limit, privacyMode)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[11px]">Realisasi Pengeluaran:</span>
                      <span className="font-semibold text-rose-800 tabular-nums">
                        {formatRupiah(item.spent, privacyMode)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setShowFlagModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Tutup
              </button>
              <button
                onClick={() => {
                  setShowFlagModal(false);
                  onNavigateToPlanning();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl"
              >
                Buka Halaman Perencanaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
