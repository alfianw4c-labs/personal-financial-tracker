import React, { useState, useMemo } from 'react';
import {
  CalendarRange,
  Copy,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle,
  TrendingDown,
  Filter,
  Save,
  X,
  Info,
  ChevronDown,
  ChevronUp,
  ReceiptText,
  ArrowRight,
  Wallet,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../layout/NotificationToast';
import {
  formatRupiah,
  formatNumberOnly,
  parseNumberFromInput,
  formatDateID,
  INDO_MONTHS,
  QUARTER_LABELS,
  getMonthsInQuarter,
} from '../../lib/formatters';
import type { QuarterlyPlan, QuarterlyPlanItem } from '../../types';

const PLANNING_YEARS = Array.from({ length: 2040 - 2024 + 1 }, (_, i) => 2024 + i);

export function PlanningView() {
  const {
    quarterlyPlans,
    quarterlyPlanItems,
    subCategories,
    categories,
    transactionTypes,
    transactions,
    privacyMode,
    getMonthlyLimitStatusList,
    saveQuarterlyPlan,
    savePlanItem,
    deletePlanItem,
    copyPlanFromPreviousQuarter,
  } = useData();

  const { showToast } = useToast();

  // Selected Year & Quarter
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedQuarter, setSelectedQuarter] = useState<number>(() => Math.ceil((new Date().getMonth() + 1) / 3));

  // Selected Monitoring Month (Default: current month if in quarter, else first month of quarter)
  const quarterMonths = useMemo(() => getMonthsInQuarter(selectedQuarter), [selectedQuarter]);
  const [monitoringMonth, setMonitoringMonth] = useState<number>(() => {
    const currentM = new Date().getMonth() + 1;
    const qMonths = getMonthsInQuarter(Math.ceil(currentM / 3));
    return qMonths.includes(currentM) ? currentM : qMonths[0];
  });

  // Keep monitoring month inside selected quarter
  React.useEffect(() => {
    if (!quarterMonths.includes(monitoringMonth)) {
      setMonitoringMonth(quarterMonths[0]);
    }
  }, [quarterMonths, monitoringMonth]);

  // Filter "Hanya yang melebihi"
  const [filterOnlyExceeded, setFilterOnlyExceeded] = useState<boolean>(false);

  // Accordion state: set of expanded sub_category_ids
  const [expandedSubCats, setExpandedSubCats] = useState<Set<string>>(new Set());

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

  const handleToggleExpandAll = () => {
    if (expandedSubCats.size > 0) {
      setExpandedSubCats(new Set());
    } else {
      const allIds = new Set(expenseSubCategories.map((s) => s.id));
      setExpandedSubCats(allIds);
    }
  };

  // Active Plan for this Quarter
  const activePlan = useMemo(() => {
    return quarterlyPlans.find(
      (p) => Number(p.year) === selectedYear && Number(p.quarter) === selectedQuarter
    );
  }, [quarterlyPlans, selectedYear, selectedQuarter]);

  // Plan Title & Notes Edit state
  const [editingPlanHeader, setEditingPlanHeader] = useState<boolean>(false);
  const [planTitle, setPlanTitle] = useState<string>('');
  const [planNotes, setPlanNotes] = useState<string>('');

  React.useEffect(() => {
    if (activePlan) {
      setPlanTitle(activePlan.title || '');
      setPlanNotes(activePlan.notes || '');
    } else {
      setPlanTitle(`Q${selectedQuarter} ${selectedYear}`);
      setPlanNotes('');
    }
  }, [activePlan, selectedYear, selectedQuarter]);

  // Items for this plan
  const planItems = useMemo(() => {
    if (!activePlan) return [];
    return quarterlyPlanItems.filter((i) => i.plan_id === activePlan.id);
  }, [activePlan, quarterlyPlanItems]);

  // Expense Sub-categories
  const expenseSubCategories = useMemo(() => {
    const expenseTypeIds = new Set(transactionTypes.filter((t) => t.kind === 'expense').map((t) => t.id));
    const expenseCatIds = new Set(categories.filter((c) => expenseTypeIds.has(c.transaction_type_id)).map((c) => c.id));
    return subCategories.filter((s) => expenseCatIds.has(s.category_id) && s.is_active);
  }, [transactionTypes, categories, subCategories]);

  // Modal Item State
  const [itemModalOpen, setItemModalOpen] = useState<boolean>(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [modalSubCatId, setModalSubCatId] = useState<string>('');
  const [modalLimitDisplay, setModalLimitDisplay] = useState<string>('');
  const [modalNote, setModalNote] = useState<string>('');

  // Save Plan Header (Title & Notes)
  const handleSavePlanHeader = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await saveQuarterlyPlan({
      id: activePlan?.id,
      year: selectedYear,
      quarter: selectedQuarter,
      title: planTitle,
      notes: planNotes,
    });

    if (res.success) {
      showToast('success', 'Rencana Kuartal Berhasil Disimpan');
      setEditingPlanHeader(false);
    } else {
      showToast('error', 'Gagal menyimpan rencana', res.error);
    }
  };

  // Open item modal for add/edit
  const handleOpenItemModal = (item?: QuarterlyPlanItem | { id?: string; plan_id?: string; sub_category_id: string; monthly_limit?: number | null; note?: string | null }) => {
    if (item && item.sub_category_id) {
      setEditingItemId(item.id || null);
      setModalSubCatId(item.sub_category_id);
      setModalLimitDisplay(item.monthly_limit ? formatNumberOnly(item.monthly_limit) : '');
      setModalNote(item.note || '');
    } else {
      setEditingItemId(null);
      const usedIds = new Set(planItems.map((pi) => pi.sub_category_id));
      const firstUnused = expenseSubCategories.find((s) => !usedIds.has(s.id));
      setModalSubCatId(firstUnused ? firstUnused.id : expenseSubCategories[0]?.id || '');
      setModalLimitDisplay(firstUnused?.default_limit ? formatNumberOnly(firstUnused.default_limit) : '');
      setModalNote('');
    }
    setItemModalOpen(true);
  };

  // Save plan item
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseNumberFromInput(modalLimitDisplay);
    if (!modalSubCatId) {
      showToast('error', 'Pilih sub kategori');
      return;
    }
    if (limit < 0) {
      showToast('error', 'Limit tidak boleh negatif');
      return;
    }

    let planId = activePlan?.id;
    if (!planId) {
      const pRes = await saveQuarterlyPlan({
        year: selectedYear,
        quarter: selectedQuarter,
        title: planTitle || `Q${selectedQuarter} ${selectedYear}`,
        notes: planNotes,
      });
      if (!pRes.success || !pRes.id) {
        showToast('error', 'Gagal membuat rencana kuartal', pRes.error);
        return;
      }
      planId = pRes.id;
    }

    const res = await savePlanItem({
      id: editingItemId || undefined,
      plan_id: planId,
      sub_category_id: modalSubCatId,
      monthly_limit: limit,
      note: modalNote.trim() || null,
    });

    if (res.success) {
      showToast('success', editingItemId ? 'Item Limit Diperbarui' : 'Item Limit Ditambahkan');
      setItemModalOpen(false);
    } else {
      showToast('error', 'Gagal menyimpan item limit', res.error);
    }
  };

  // Delete item
  const handleDeleteItem = async (id: string) => {
    if (confirm('Hapus item limit bulanan ini? (Sub kategori ini akan kembali menggunakan limit default)')) {
      const res = await deletePlanItem(id);
      if (res.success) {
        showToast('info', 'Item Limit Dihapus');
      }
    }
  };

  // Copy from previous quarter
  const handleCopyPreviousQuarter = async () => {
    const res = await copyPlanFromPreviousQuarter(selectedYear, selectedQuarter);
    if (res.success) {
      showToast('success', 'Berhasil Menyalin Rencana', `${res.count} item limit disalin dari kuartal sebelumnya.`);
    } else {
      showToast('error', 'Gagal Menyalin', res.error);
    }
  };

  // Monthly Limit Evaluation Status for Monitoring Table
  const rawMonitoringList = useMemo(() => {
    return getMonthlyLimitStatusList(selectedYear, monitoringMonth);
  }, [getMonthlyLimitStatusList, selectedYear, monitoringMonth]);

  // Combined List: Sub Category + Plan Item + Realisasi
  const monitoringList = useMemo(() => {
    let list = rawMonitoringList;
    if (filterOnlyExceeded) {
      list = list.filter((i) => i.status === 'melebihi');
    }
    return list;
  }, [rawMonitoringList, filterOnlyExceeded]);

  // Total limit bulanan per kuartal
  const totalQuarterMonthlyLimit = useMemo(() => {
    let total = 0;
    for (const sub of expenseSubCategories) {
      const item = planItems.find((pi) => pi.sub_category_id === sub.id);
      if (item) {
        total += Number(item.monthly_limit);
      } else if (sub.default_limit) {
        total += Number(sub.default_limit);
      }
    }
    return total;
  }, [expenseSubCategories, planItems]);

  // Summary Bulan Berjalan
  const totalMonthSpent = useMemo(() => {
    return rawMonitoringList.reduce((acc, curr) => acc + (curr.spent || 0), 0);
  }, [rawMonitoringList]);

  const totalMonthRemaining = useMemo(() => {
    return totalQuarterMonthlyLimit - totalMonthSpent;
  }, [totalQuarterMonthlyLimit, totalMonthSpent]);

  // Transaksi Terfilter berdasarkan bulan & tahun yang dipilih
  const monthPrefix = useMemo(() => {
    const mStr = String(monitoringMonth).padStart(2, '0');
    return `${selectedYear}-${mStr}`;
  }, [selectedYear, monitoringMonth]);

  // Pre-index transaksi pengeluaran per sub_category_id
  const txMapBySubCategory = useMemo(() => {
    const map = new Map<string, typeof transactions>();
    for (const tx of transactions) {
      if (tx.type_kind === 'expense' && tx.tx_date.startsWith(monthPrefix) && tx.sub_category_id) {
        const list = map.get(tx.sub_category_id) || [];
        list.push(tx);
        map.set(tx.sub_category_id, list);
      }
    }
    // Urutkan transaksi tanggal terbaru di atas
    for (const [, list] of map.entries()) {
      list.sort((a, b) => b.tx_date.localeCompare(a.tx_date));
    }
    return map;
  }, [transactions, monthPrefix]);

  return (
    <div className="w-full max-w-[1680px] mx-auto px-2.5 sm:px-4 lg:px-6 py-4 space-y-4">
      {/* TITLE SECTION (Plain Text, Tanpa Card) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-[#1E6B4F]" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Perencanaan Anggaran
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] shadow-2xs"
          >
            {PLANNING_YEARS.map((yr) => (
              <option key={yr} value={yr}>
                Tahun {yr}
              </option>
            ))}
          </select>

          {/* Tombol Salin dari Kuartal Sebelumnya (Icon Only + Tooltip) */}
          <div className="relative group">
            <button
              type="button"
              onClick={handleCopyPreviousQuarter}
              className="p-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="Salin dari Kuartal Sebelumnya"
              aria-label="Salin dari Kuartal Sebelumnya"
            >
              <Copy className="w-4 h-4 text-slate-500" />
            </button>
            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center z-30">
              <span className="whitespace-nowrap px-2.5 py-1 text-[11px] font-medium text-white bg-slate-900 rounded-lg shadow-md border border-slate-700">
                Salin dari Kuartal Sebelumnya
              </span>
              <span className="w-2 h-2 -mt-1 rotate-45 bg-slate-900 border-r border-b border-slate-700"></span>
            </div>
          </div>
        </div>
      </div>

      {/* CARD KUARTAL & RINGKASAN RENCANA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        {/* QUARTER TABS (Q1, Q2, Q3, Q4) */}
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((q) => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${
                selectedQuarter === q
                  ? 'border-[#1E6B4F] bg-[#1E6B4F] text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {`Q${q}`}
            </button>
          ))}
        </div>

        {/* INFORMASI DIBAWAH SECTION TAB Q1, Q2, Q3, Q4 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          {/* Title and Notes */}
          <div className="lg:col-span-2 bg-slate-50/70 rounded-xl border border-slate-200/80 p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Detail Rencana: {QUARTER_LABELS[selectedQuarter]} {selectedYear}
              </h2>
              <button
                onClick={() => setEditingPlanHeader(!editingPlanHeader)}
                className="text-xs font-semibold text-[#1E6B4F] hover:underline cursor-pointer"
              >
                {editingPlanHeader ? 'Batal' : 'Ubah Judul & Catatan'}
              </button>
            </div>

            {editingPlanHeader ? (
              <form onSubmit={handleSavePlanHeader} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Judul Rencana Kuartal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    placeholder="Contoh: Q4 2026 - Persiapan Kelahiran & Akhir Tahun"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Catatan & Prioritas Kuartal Ini
                  </label>
                  <textarea
                    rows={2}
                    value={planNotes}
                    onChange={(e) => setPlanNotes(e.target.value)}
                    placeholder="Contoh: Fokus alokasi tabungan dan kendalikan pengeluaran jajan..."
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs cursor-pointer"
                  >
                    Simpan Detail Kuartal
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-3.5 rounded-xl bg-white border border-slate-200/70 space-y-1">
                <h3 className="font-bold text-slate-800 text-sm">
                  {activePlan?.title || `Q${selectedQuarter} ${selectedYear}`}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {activePlan?.notes || 'Belum ada catatan khusus untuk kuartal ini.'}
                </p>
              </div>
            )}
          </div>

          {/* Quick Month Metrics Card */}
          <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-4 sm:p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Ringkasan Bulan Ini
                </span>
                <span className="text-xs font-bold text-[#1E6B4F] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  {INDO_MONTHS[monitoringMonth - 1]} {selectedYear}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Limit Bulanan:</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatRupiah(totalQuarterMonthlyLimit, privacyMode)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Realisasi Pengeluaran:</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRupiah(totalMonthSpent, privacyMode)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-200/70">
                  <span className="font-semibold text-slate-600">Sisa Anggaran:</span>
                  <span
                    className={`font-extrabold tabular-nums ${
                      totalMonthRemaining < 0 ? 'text-rose-600' : 'text-[#1E6B4F]'
                    }`}
                  >
                    {formatRupiah(totalMonthRemaining, privacyMode)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 mt-3 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-400">
              <span>Item Rencana Aktif:</span>
              <span className="font-bold text-slate-700">
                {planItems.length} dari {expenseSubCategories.length} sub kategori
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TABEL GABUNGAN: PERENCANAAN, EVALUASI & AKORDION TRANSAKSI */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
        {/* Toolbar Tabel */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Evaluasi & Realisasi Anggaran per Sub Kategori</span>
              <span className="text-xs px-2 py-0.5 font-semibold bg-emerald-50 text-[#1E6B4F] rounded-full border border-emerald-200">
                {INDO_MONTHS[monitoringMonth - 1]} {selectedYear}
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik pada baris mana saja untuk membuka rincian transaksi belanja yang tercatat pada bulan ini.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Filter Bulan Dalam Kuartal */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {quarterMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => setMonitoringMonth(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    monitoringMonth === m
                      ? 'bg-white text-[#1E6B4F] font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {INDO_MONTHS[m - 1]}
                </button>
              ))}
            </div>

            {/* Toggle Hanya Melebihi */}
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl hover:bg-slate-100/80">
              <input
                type="checkbox"
                checked={filterOnlyExceeded}
                onChange={(e) => setFilterOnlyExceeded(e.target.checked)}
                className="rounded text-[#1E6B4F] focus:ring-[#1E6B4F]"
              />
              <span>Hanya Melebihi</span>
            </label>

            {/* Tombol Tambah Limit */}
            <button
              onClick={() => handleOpenItemModal()}
              className="px-3 py-1.5 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Atur Limit</span>
            </button>

            {/* Tombol Buka / Tutup Semua Accordion */}
            <button
              onClick={handleToggleExpandAll}
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Buka atau tutup seluruh daftar transaksi"
            >
              {expandedSubCats.size > 0 ? 'Tutup Semua Transaksi' : 'Buka Semua Transaksi'}
            </button>
          </div>
        </div>

        {/* Tabel Terpadu */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4" style={{ width: '280px' }}>
                  Sub Kategori & Kategori
                </th>
                <th className="py-3 px-4 text-right" style={{ width: '160px' }}>
                  Limit Bulanan
                </th>
                <th className="py-3 px-4 text-right" style={{ width: '160px' }}>
                  Realisasi ({INDO_MONTHS[monitoringMonth - 1]})
                </th>
                <th className="py-3 px-4 text-right" style={{ width: '140px' }}>
                  Sisa / Selisih
                </th>
                <th className="py-3 px-4" style={{ width: '160px' }}>
                  Progress Pemakaian
                </th>
                <th className="py-3 px-4 text-center" style={{ width: '130px' }}>
                  Status
                </th>
                <th className="py-3 px-4 text-center" style={{ width: '110px' }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monitoringList.length > 0 ? (
                monitoringList.map((item) => {
                  const sub = expenseSubCategories.find((s) => s.id === item.sub_category_id);
                  const planItem = planItems.find((pi) => pi.sub_category_id === item.sub_category_id);
                  const cat = categories.find((c) => c.id === sub?.category_id);
                  const isExpanded = expandedSubCats.has(item.sub_category_id);
                  const subTxs = txMapBySubCategory.get(item.sub_category_id) || [];

                  let statusBadge = (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Tanpa Limit
                    </span>
                  );
                  let barColor = 'bg-slate-300';

                  if (item.status === 'melebihi') {
                    statusBadge = (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 justify-center">
                        <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                        <span>Melebihi Limit</span>
                      </span>
                    );
                    barColor = 'bg-rose-500';
                  } else if (item.status === 'mendekati') {
                    statusBadge = (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Mendekati (&ge;80%)
                      </span>
                    );
                    barColor = 'bg-amber-500';
                  } else if (item.status === 'aman') {
                    statusBadge = (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Aman (&lt;80%)
                      </span>
                    );
                    barColor = 'bg-[#1E6B4F]';
                  }

                  const pct = item.percentage ?? 0;
                  const isCustomPlan = !!planItem;

                  return (
                    <React.Fragment key={item.sub_category_id}>
                      {/* Baris Utama Item */}
                      <tr
                        className={`transition-colors cursor-pointer ${
                          isExpanded ? 'bg-emerald-50/40' : 'hover:bg-slate-50/70'
                        }`}
                        onClick={() => toggleExpand(item.sub_category_id)}
                      >
                        {/* Kolom 1: Sub Kategori + Accordion Toggle */}
                        <td className="py-3 px-4">
                          <div className="flex items-start gap-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(item.sub_category_id);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/50 mt-0.5 transition-colors cursor-pointer"
                              title={isExpanded ? 'Tutup rincian transaksi' : 'Buka rincian transaksi'}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4 text-[#1E6B4F]" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>{item.sub_category_name}</span>
                                {cat && (
                                  <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {cat.name}
                                  </span>
                                )}
                              </div>
                              {planItem?.note && (
                                <p className="text-[11px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                                  {planItem.note}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Kolom 2: Limit Bulanan + Sumber */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-bold text-slate-900 tabular-nums">
                            {item.monthly_limit !== null
                              ? formatRupiah(item.monthly_limit, privacyMode)
                              : 'Tanpa Limit'}
                          </div>
                          <div className="mt-0.5">
                            {isCustomPlan ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Rencana Q{selectedQuarter}
                              </span>
                            ) : sub?.default_limit ? (
                              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Default Master
                              </span>
                            ) : (
                              <span className="text-[9px] text-slate-400">Bebas</span>
                            )}
                          </div>
                        </td>

                        {/* Kolom 3: Realisasi Pengeluaran */}
                        <td className="py-3 px-4 text-right">
                          <div className="font-extrabold text-slate-900 tabular-nums">
                            {formatRupiah(item.spent, privacyMode)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5 flex items-center justify-end gap-1">
                            <ReceiptText className="w-3 h-3" />
                            <span>{subTxs.length} transaksi</span>
                          </div>
                        </td>

                        {/* Kolom 4: Sisa / Selisih */}
                        <td
                          className={`py-3 px-4 text-right font-bold tabular-nums ${
                            (item.remaining || 0) < 0 ? 'text-rose-600' : 'text-[#1E6B4F]'
                          }`}
                        >
                          {item.monthly_limit !== null
                            ? (item.remaining || 0) < 0
                              ? `-Rp${formatRupiah(Math.abs(item.remaining || 0), privacyMode).replace('Rp', '')}`
                              : formatRupiah(item.remaining, privacyMode)
                            : '-'}
                        </td>

                        {/* Kolom 5: Progress Pemakaian */}
                        <td className="py-3 px-4">
                          {item.monthly_limit !== null ? (
                            <div className="space-y-1">
                              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${barColor}`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                              <div className="text-[10px] text-slate-400 text-right tabular-nums">
                                {pct}%
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Kolom 6: Status */}
                        <td className="py-3 px-4 text-center">
                          {statusBadge}
                        </td>

                        {/* Kolom 7: Aksi */}
                        <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* Tombol Ubah Limit */}
                            <button
                              onClick={() =>
                                handleOpenItemModal(
                                  planItem || {
                                    id: '',
                                    plan_id: '',
                                    sub_category_id: item.sub_category_id,
                                    monthly_limit: item.monthly_limit || sub?.default_limit || 0,
                                    note: '',
                                  }
                                )
                              }
                              title="Ubah Limit Anggaran"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Tombol Hapus Custom Plan jika ada */}
                            {planItem && (
                              <button
                                onClick={() => handleDeleteItem(planItem.id)}
                                title="Kembalikan ke Limit Default Master"
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {/* Tombol Accordion */}
                            <button
                              onClick={() => toggleExpand(item.sub_category_id)}
                              title={isExpanded ? 'Tutup Transaksi' : 'Lihat Transaksi'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isExpanded
                                  ? 'bg-[#1E6B4F] text-white shadow-2xs'
                                  : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                              }`}
                            >
                              <ReceiptText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Baris Accordion: Rincian Transaksi */}
                      {isExpanded && (
                        <tr className="bg-slate-50/70 border-b border-slate-200">
                          <td colSpan={7} className="p-2.5 sm:p-3.5">
                            <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3 sm:p-4">
                              {/* Tabel / List Transaksi */}
                              {subTxs.length > 0 ? (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                                        <th className="py-2 px-3" style={{ width: '120px' }}>
                                          Tanggal
                                        </th>
                                        <th className="py-2 px-3" style={{ minWidth: '320px', width: '380px' }}>
                                          Sumber Saldo &rarr; Tujuan
                                        </th>
                                        <th className="py-2 px-3 text-right" style={{ width: '140px' }}>
                                          Nominal
                                        </th>
                                        <th className="py-2 px-3">
                                          Keterangan
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {subTxs.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50/80">
                                          <td className="py-2.5 px-3 font-medium text-slate-700 whitespace-nowrap">
                                            {formatDateID(tx.tx_date)}
                                          </td>
                                          <td className="py-2.5 px-3" style={{ minWidth: '320px' }}>
                                            <div className="flex items-center gap-2 text-slate-800">
                                              <span className="font-semibold text-slate-900 whitespace-nowrap">
                                                {tx.source_name || 'Kas/Bank'}
                                              </span>
                                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                              <span className="text-slate-600 whitespace-nowrap">
                                                {tx.destination_name || 'Merchant'}
                                              </span>
                                            </div>
                                          </td>
                                          <td className="py-2.5 px-3 text-right font-bold text-rose-600 tabular-nums whitespace-nowrap">
                                            -{formatRupiah(tx.amount, privacyMode)}
                                          </td>
                                          <td className="py-2.5 px-3 text-slate-600">
                                            {tx.description || '-'}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="py-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                  Belum ada transaksi pengeluaran untuk sub kategori ini pada bulan {INDO_MONTHS[monitoringMonth - 1]} {selectedYear}.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-1.5">
                      <CheckCircle className="w-6 h-6 text-emerald-500 mb-1" />
                      <span className="font-semibold text-slate-700">
                        Semua pengeluaran terkendali dengan baik!
                      </span>
                      <span>Tidak ada sub kategori yang melebihi batas limit bulanan.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH/EDIT ITEM LIMIT */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingItemId ? 'Ubah Limit Anggaran' : 'Atur Limit Anggaran'}
              </h3>
              <button
                onClick={() => setItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub Kategori Pengeluaran <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={modalSubCatId}
                  onChange={(e) => setModalSubCatId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                >
                  {expenseSubCategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Batas Limit Bulanan (Rp) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    value={modalLimitDisplay}
                    onChange={(e) => setModalLimitDisplay(formatNumberOnly(e.target.value))}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Batas ini berlaku untuk setiap bulan di Kuartal {selectedQuarter} {selectedYear}.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  value={modalNote}
                  onChange={(e) => setModalNote(e.target.value)}
                  placeholder="Misal: Termasuk voucher diskon bulanan..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
