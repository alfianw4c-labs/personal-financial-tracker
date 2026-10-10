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
  Filter,
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

  // Modal / Popup Filter Waktu Mobile
  const [showMobileFilterModal, setShowMobileFilterModal] = useState<boolean>(false);

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

  // Donut data: Saldo Bersih vs Tabungan
  const wealthDonutData = useMemo(() => {
    return [
      { name: 'Saldo Bersih (Kas/Bank)', value: Math.max(0, balancesByGroup.netBalance), color: '#1E6B4F' },
      { name: 'Tabungan Keluarga', value: Math.max(0, balancesByGroup.tabungan), color: '#3B82F6' },
    ];
  }, [balancesByGroup]);

  return (
    <div className="w-full max-w-[1680px] mx-auto px-2.5 sm:px-4 lg:px-6 py-4 space-y-4">
      {/* TITLE SECTION (Plain Text, Tanpa Card) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-[#1E6B4F]" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Dashboard Arus Kas
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Periode Laporan: <span className="font-semibold text-slate-800">{periodLabel}</span>
          </p>
        </div>

        {/* Filter Controls Desktop (Hidden on Mobile & Tablet) */}
        <div className="hidden md:flex items-center gap-2.5 flex-wrap">
          {/* Mode Selector Tabs (All Time, Pilih Bulan, Rentang Tanggal) */}
          <div className="flex items-center bg-white border border-slate-200 shadow-2xs p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setFilterMode('all_time')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filterMode === 'all_time'
                  ? 'bg-slate-100 text-[#1E6B4F] font-bold shadow-xs'
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
                  ? 'bg-slate-100 text-[#1E6B4F] font-bold shadow-xs'
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
                  ? 'bg-slate-100 text-[#1E6B4F] font-bold shadow-xs'
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
                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] shadow-2xs cursor-pointer"
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
                className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] shadow-2xs cursor-pointer"
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
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs cursor-pointer">
                <span className="text-[11px] font-semibold text-slate-500">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onClick={(e) => {
                    try {
                      (e.currentTarget as any).showPicker?.();
                    } catch {}
                  }}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-2xs cursor-pointer">
                <span className="text-[11px] font-semibold text-slate-500">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onClick={(e) => {
                    try {
                      (e.currentTarget as any).showPicker?.();
                    } catch {}
                  }}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          )}

          {filterMode === 'all_time' && (
            <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 shadow-2xs">
              Total {filteredTransactions.length} Transaksi
            </span>
          )}
        </div>
      </div>

      {/* TOP METRICS: 2 KOLOM DI MOBILE & TABLET, 4 KOLOM DI DESKTOP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Seluruh Kekayaan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">Seluruh Kekayaan</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-[#1E6B4F] flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 tabular-nums truncate">
              {formatRupiah(balancesByGroup.totalWealth, privacyMode)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">
              Tabungan + Saldo Bersih
            </p>
          </div>
        </div>

        {/* Saldo Bersih */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">Saldo Bersih</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-[#1E6B4F] flex items-center justify-center shrink-0">
              <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-[#1E6B4F] tabular-nums truncate">
              {formatRupiah(balancesByGroup.netBalance, privacyMode)}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">
              <span>Kas/Bank: {formatRupiah(balancesByGroup.liquidCashAndBank, privacyMode)}</span>
            </div>
          </div>
        </div>

        {/* Total Tabungan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">Total Tabungan</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <PiggyBank className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-blue-600 tabular-nums truncate">
              {formatRupiah(balancesByGroup.tabungan, privacyMode)}
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">
              {savingsGoalsBreakdown.length} Akun Simpanan
            </p>
          </div>
        </div>

        {/* Hidup Tanpa Gaji */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-semibold text-slate-500 truncate">Hidup Tanpa Gaji</span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="flex items-baseline gap-1">
              <span className="text-base sm:text-xl md:text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
                {runwayMetric.runwayMonths}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-slate-600">Bulan</span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate">
              {runwayMetric.accountName}
            </p>
          </div>
        </div>
      </div>

      {/* KARTU FLAG LIMIT & RINGKASAN CASHFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ringkasan Periode Ini (Income, Expense, Cashflow) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-3.5 sm:p-5 md:p-6 shadow-2xs space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
              {filterMode === 'month'
                ? `Ringkasan Bulan Ini (${INDO_MONTHS[selectedMonth - 1]})`
                : filterMode === 'all_time'
                ? 'Ringkasan Semua Waktu'
                : 'Ringkasan Rentang Tanggal Terpilih'}
            </h2>
            <span className="text-[10px] sm:text-xs text-slate-400 shrink-0 ml-2">
              {filterMode === 'month'
                ? `Dibanding ${monthSummary.prevMonthName}`
                : filterMode === 'all_time'
                ? 'Seluruh data transaksi'
                : `${formatDateID(startDate)} s/d ${formatDateID(endDate)}`}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 sm:gap-3 md:gap-4 pt-1">
            {/* 1. Pemasukan */}
            <div className="p-2 sm:p-3.5 md:p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 flex flex-col justify-between overflow-hidden">
              <span className="text-[10px] sm:text-xs text-emerald-800 font-semibold truncate block">Pemasukan</span>
              <div className="text-xs sm:text-base md:text-xl font-bold text-emerald-900 tabular-nums mt-0.5 sm:mt-1 truncate">
                {formatRupiah(monthSummary.incomeCurrent, privacyMode)}
              </div>
              {filterMode === 'month' ? (
                <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] mt-0.5 sm:mt-1 text-emerald-700 truncate">
                  <ArrowUpRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="truncate">
                    {monthSummary.incomeDiff >= 0 ? '+' : ''}
                    {formatRupiah(monthSummary.incomeDiff, privacyMode)}
                  </span>
                </div>
              ) : (
                <span className="text-[9px] sm:text-[11px] text-emerald-700/80 mt-0.5 sm:mt-1 truncate block">Total Masuk</span>
              )}
            </div>

            {/* 2. Pengeluaran */}
            <div className="p-2 sm:p-3.5 md:p-4 rounded-xl bg-rose-50/60 border border-rose-100 flex flex-col justify-between overflow-hidden">
              <span className="text-[10px] sm:text-xs text-rose-800 font-semibold truncate block">Pengeluaran</span>
              <div className="text-xs sm:text-base md:text-xl font-bold text-rose-900 tabular-nums mt-0.5 sm:mt-1 truncate">
                {formatRupiah(monthSummary.expenseCurrent, privacyMode)}
              </div>
              {filterMode === 'month' ? (
                <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[11px] mt-0.5 sm:mt-1 text-rose-700 truncate">
                  <ArrowDownRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                  <span className="truncate">
                    {monthSummary.expenseDiff >= 0 ? '+' : ''}
                    {formatRupiah(monthSummary.expenseDiff, privacyMode)}
                  </span>
                </div>
              ) : (
                <span className="text-[9px] sm:text-[11px] text-rose-700/80 mt-0.5 sm:mt-1 truncate block">Total Keluar</span>
              )}
            </div>

            {/* 3. Arus Kas Bersih */}
            <div className="p-2 sm:p-3.5 md:p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between overflow-hidden">
              <span className="text-[10px] sm:text-xs text-slate-600 font-semibold truncate block">Arus Kas</span>
              <div
                className={`text-xs sm:text-base md:text-xl font-bold tabular-nums mt-0.5 sm:mt-1 truncate ${
                  monthSummary.cashflowCurrent >= 0 ? 'text-[#1E6B4F]' : 'text-rose-600'
                }`}
              >
                {formatRupiah(monthSummary.cashflowCurrent, privacyMode)}
              </div>
              <span className="text-[9px] sm:text-[11px] text-slate-500 mt-0.5 sm:mt-1 truncate block">
                {monthSummary.cashflowCurrent >= 0 ? 'Surplus' : 'Defisit'}
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
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs">
        <h2 className="text-sm font-bold text-slate-900 mb-3.5 sm:mb-4">
          Progress Tabungan Bertarget
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {savingsGoalsBreakdown.map((goal, idx) => {
            const pct = goal.target > 0 ? Math.min(100, Math.round((goal.balance / goal.target) * 100)) : 100;
            return (
              <div key={idx} className="p-3 sm:p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 truncate" title={goal.name}>{goal.name}</span>
                  <span className="font-extrabold text-[#1E6B4F] text-xs tabular-nums ml-2 shrink-0">{pct}%</span>
                </div>
                {/* Progress bar dengan nominal saat ini / target langsung berada di dalamnya */}
                <div className="relative w-full h-6 rounded-lg bg-slate-200/70 border border-slate-200 overflow-hidden flex items-center">
                  <div
                    className="absolute left-0 top-0 bottom-0 bg-[#1E6B4F]/25 border-r border-[#1E6B4F] transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative z-10 w-full flex items-center justify-between px-2 text-[10px] sm:text-[11px] tabular-nums font-semibold leading-none">
                    <span className="text-[#1E6B4F] font-bold truncate">
                      {formatRupiah(goal.balance, privacyMode)}
                    </span>
                    <span className="text-slate-500 font-medium truncate ml-1">
                      / {formatRupiah(goal.target, privacyMode)}
                    </span>
                  </div>
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

      {/* SALDO AKUN BERWARNA PER GRUP (2 KOLOM DI MOBILE & TABLET, SIMPLIFIED SEPERTI DI TRANSAKSI) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-2xs space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            Saldo Akun Keuangan (Cash, Bank, Tabungan, PayLater)
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
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
                groupBadge = 'PayLater';
                badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                Icon = CreditCard;
              }

              return (
                <div
                  key={acc.id}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors flex flex-col justify-between shadow-2xs"
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Icon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-bold text-slate-900 text-xs truncate" title={acc.name}>
                        {acc.name}
                      </span>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold border shrink-0 ${badgeColor}`}>
                      {groupBadge}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between w-full">
                    <span
                      className={`text-xs sm:text-sm font-extrabold tabular-nums truncate ${
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

      {/* FLOATING ACTION BUTTON (FAB) FILTER UNTUK MOBILE & TABLET (ICON ONLY) */}
      <button
        type="button"
        onClick={() => setShowMobileFilterModal(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-[#1E6B4F] hover:bg-[#16523c] text-white shadow-xl shadow-emerald-950/30 flex items-center justify-center cursor-pointer active:scale-90 transition-all border border-emerald-600/30 backdrop-blur-xs"
        title="Buka Filter Periode Waktu"
        aria-label="Filter Waktu"
      >
        <Filter className="w-5 h-5 text-white" />
      </button>

      {/* POPUP / MODAL FILTER WAKTU UNTUK MOBILE */}
      {showMobileFilterModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#1E6B4F]">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Filter Periode Waktu</h3>
                  <p className="text-[11px] text-slate-500">Sesuaikan rentang data transaksi dashboard</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowMobileFilterModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-4 space-y-4">
              {/* Pilihan Mode Filter */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Pilih Mode Waktu
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFilterMode('month')}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                      filterMode === 'month'
                        ? 'bg-white text-[#1E6B4F] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pilih Bulan
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('range')}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                      filterMode === 'range'
                        ? 'bg-white text-[#1E6B4F] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Rentang
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('all_time')}
                    className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                      filterMode === 'all_time'
                        ? 'bg-white text-[#1E6B4F] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua
                  </button>
                </div>
              </div>

              {/* Detail Kontrol: Mode Bulan */}
              {filterMode === 'month' && (
                <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">Pilih Bulan & Tahun</span>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setSelectedMonth(now.getMonth() + 1);
                        setSelectedYear(now.getFullYear());
                      }}
                      className="text-[11px] font-semibold text-[#1E6B4F] hover:underline cursor-pointer"
                    >
                      Bulan Ini
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Bulan
                      </label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      >
                        {INDO_MONTHS.map((name, idx) => (
                          <option key={idx + 1} value={idx + 1}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Tahun
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      >
                        {availableYears.map((yr) => (
                          <option key={yr} value={yr}>
                            Tahun {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-1 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Target Kuartal:</span>
                    <span className="font-semibold text-slate-800">
                      Q{Math.ceil(selectedMonth / 3)} {selectedYear}
                    </span>
                  </div>
                </div>
              )}

              {/* Detail Kontrol: Mode Rentang Tanggal */}
              {filterMode === 'range' && (
                <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/70">
                  <span className="text-xs font-semibold text-slate-700 block">
                    Pilih Rentang Tanggal
                  </span>

                  <div className="space-y-2.5">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Dari Tanggal
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onClick={(e) => {
                          try {
                            (e.currentTarget as any).showPicker?.();
                          } catch {}
                        }}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Sampai Tanggal
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        onClick={(e) => {
                          try {
                            (e.currentTarget as any).showPicker?.();
                          } catch {}
                        }}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Detail Kontrol: Mode Semua Waktu */}
              {filterMode === 'all_time' && (
                <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-center space-y-1">
                  <span className="text-xs font-bold text-emerald-900 block">
                    Mode Semua Waktu Aktif
                  </span>
                  <p className="text-[11px] text-emerald-700">
                    Menampilkan total keseluruhan {filteredTransactions.length} transaksi yang tercatat di akun Anda.
                  </p>
                </div>
              )}

              {/* Badge Periode Aktif */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Periode Terpilih:</span>
                <span className="font-bold text-[#1E6B4F]">{periodLabel}</span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowMobileFilterModal(false)}
                className="w-full py-2.5 px-4 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs transition-colors cursor-pointer text-center active:scale-98"
              >
                Terapkan & Lihat Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
