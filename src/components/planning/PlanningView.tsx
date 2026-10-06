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
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../layout/NotificationToast';
import {
  formatRupiah,
  formatNumberOnly,
  parseNumberFromInput,
  INDO_MONTHS,
  QUARTER_LABELS,
  getMonthsInQuarter,
} from '../../lib/formatters';
import type { QuarterlyPlan, QuarterlyPlanItem } from '../../types';

export function PlanningView() {
  const {
    quarterlyPlans,
    quarterlyPlanItems,
    subCategories,
    categories,
    transactionTypes,
    privacyMode,
    getMonthlyLimitStatusList,
    saveQuarterlyPlan,
    savePlanItem,
    deletePlanItem,
    copyPlanFromPreviousQuarter,
  } = useData();

  const { showToast } = useToast();

  // Selected Year & Quarter
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedQuarter, setSelectedQuarter] = useState<number>(4);

  // Selected Monitoring Month (Default: First month of the quarter)
  const quarterMonths = useMemo(() => getMonthsInQuarter(selectedQuarter), [selectedQuarter]);
  const [monitoringMonth, setMonitoringMonth] = useState<number>(quarterMonths[0]);

  // Keep monitoring month inside selected quarter
  React.useEffect(() => {
    if (!quarterMonths.includes(monitoringMonth)) {
      setMonitoringMonth(quarterMonths[0]);
    }
  }, [quarterMonths, monitoringMonth]);

  // Filter "Hanya yang melebihi"
  const [filterOnlyExceeded, setFilterOnlyExceeded] = useState<boolean>(false);

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
  const handleOpenItemModal = (item?: QuarterlyPlanItem) => {
    if (item) {
      setEditingItemId(item.id);
      setModalSubCatId(item.sub_category_id);
      setModalLimitDisplay(formatNumberOnly(item.monthly_limit));
      setModalNote(item.note || '');
    } else {
      setEditingItemId(null);
      // Select first unused subcategory
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

    // Pastikan plan sudah ada
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
  const monitoringList = useMemo(() => {
    const list = getMonthlyLimitStatusList(selectedYear, monitoringMonth);
    if (filterOnlyExceeded) {
      return list.filter((i) => i.status === 'melebihi');
    }
    return list;
  }, [getMonthlyLimitStatusList, selectedYear, monitoringMonth, filterOnlyExceeded]);

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

  return (
    <div className="w-full max-w-[1680px] mx-auto px-2.5 sm:px-4 lg:px-6 py-4 space-y-4">
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarRange className="w-5 h-5 text-[#1E6B4F]" />
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Perencanaan Kuartal & Limit Anggaran
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Tetapkan batas wajar pengeluaran bulanan per sub kategori sebagai panduan keluarga.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>

            <button
              onClick={handleCopyPreviousQuarter}
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Salin dari Kuartal Sebelumnya</span>
            </button>
          </div>
        </div>

        {/* QUARTER TABS (Q1, Q2, Q3, Q4) */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          {[1, 2, 3, 4].map((q) => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all text-center ${
                selectedQuarter === q
                  ? 'border-[#1E6B4F] bg-[#1E6B4F] text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {QUARTER_LABELS[q]}
            </button>
          ))}
        </div>
      </div>

      {/* PLAN HEADER & SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Title and Notes */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Detail Rencana: {QUARTER_LABELS[selectedQuarter]} {selectedYear}
            </h2>
            <button
              onClick={() => setEditingPlanHeader(!editingPlanHeader)}
              className="text-xs font-semibold text-[#1E6B4F] hover:underline"
            >
              {editingPlanHeader ? 'Batal' : 'Ubah Judul & Catatan'}
            </button>
          </div>

          {editingPlanHeader ? (
            <form onSubmit={handleSavePlanHeader} className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Judul Rencana Kuartal
                </label>
                <input
                  type="text"
                  required
                  value={planTitle}
                  onChange={(e) => setPlanTitle(e.target.value)}
                  placeholder="Contoh: Q4 2026 - Persiapan Kelahiran"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
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
                  placeholder="Contoh: Fokus alokasi tabungan persalinan dan kendalikan pengeluaran makan di luar..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs"
                >
                  Simpan Detail Kuartal
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <h3 className="font-bold text-slate-800 text-sm">
                {activePlan?.title || `Q${selectedQuarter} ${selectedYear}`}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {activePlan?.notes || 'Belum ada catatan khusus untuk kuartal ini.'}
              </p>
            </div>
          )}
        </div>

        {/* Total Monthly Limit per Quarter */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500">
              Total Limit Bulanan ({QUARTER_LABELS[selectedQuarter]})
            </span>
            <div className="text-2xl font-extrabold text-[#1E6B4F] mt-2 tabular-nums">
              {formatRupiah(totalQuarterMonthlyLimit, privacyMode)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Akumulasi batas anggaran semua sub kategori per bulan dalam kuartal ini.
            </p>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Item Terkonfigurasi:</span>
            <span className="font-bold text-slate-900">{planItems.length} dari {expenseSubCategories.length}</span>
          </div>
        </div>
      </div>

      {/* ITEMS RENCANA PER SUB KATEGORI */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Item Rencana Limit Bulanan (Kuartal {selectedQuarter} {selectedYear})
            </h2>
            <p className="text-xs text-slate-500">
              Berlaku sama untuk 3 bulan dalam kuartal ini. Sub kategori tanpa item akan memakai limit default.
            </p>
          </div>

          <button
            onClick={() => handleOpenItemModal()}
            className="px-3.5 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Item Limit</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Sub Kategori</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4 text-right">Limit Bulanan</th>
                <th className="py-3 px-4">Sumber Limit</th>
                <th className="py-3 px-4">Catatan</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenseSubCategories.map((sub) => {
                const item = planItems.find((pi) => pi.sub_category_id === sub.id);
                const cat = categories.find((c) => c.id === sub.category_id);
                const effectiveLimit = item ? item.monthly_limit : sub.default_limit;
                const isCustom = !!item;

                return (
                  <tr key={sub.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {sub.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {cat?.name || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                      {effectiveLimit !== null && effectiveLimit !== undefined
                        ? formatRupiah(effectiveLimit, privacyMode)
                        : 'Tanpa Limit'}
                    </td>
                    <td className="py-3 px-4">
                      {isCustom ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Rencana Q{selectedQuarter}
                        </span>
                      ) : sub.default_limit ? (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Default Master
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          Bebas Limit
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {item?.note || '-'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenItemModal(item || { id: '', plan_id: '', sub_category_id: sub.id, monthly_limit: sub.default_limit || 0 })}
                          title="Ubah Limit"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {item && (
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            title="Hapus Rencana (Kembalikan ke Default)"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* TABEL MONITORING BULANAN */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Evaluasi & Monitoring Realisasi Bulanan
            </h2>
            <p className="text-xs text-slate-500">
              Perbandingan realisasi pengeluaran terhadap limit pada bulan yang dipilih.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Filter Bulan Dalam Kuartal */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {quarterMonths.map((m) => (
                <button
                  key={m}
                  onClick={() => setMonitoringMonth(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    monitoringMonth === m
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {INDO_MONTHS[m - 1]}
                </button>
              ))}
            </div>

            {/* Toggle Hanya Melebihi */}
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterOnlyExceeded}
                onChange={(e) => setFilterOnlyExceeded(e.target.checked)}
                className="rounded text-[#1E6B4F] focus:ring-[#1E6B4F]"
              />
              <span>Hanya yang Melebihi</span>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                <th className="py-3 px-4">Sub Kategori</th>
                <th className="py-3 px-4 text-right">Limit Bulanan</th>
                <th className="py-3 px-4 text-right">Realisasi Pengeluaran</th>
                <th className="py-3 px-4 text-right">Sisa / Selisih</th>
                <th className="py-3 px-4" style={{ width: '180px' }}>Progress Pemakaian</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monitoringList.length > 0 ? (
                monitoringList.map((item) => {
                  let statusBadge = (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      Tanpa Limit
                    </span>
                  );
                  let barColor = 'bg-slate-300';

                  if (item.status === 'melebihi') {
                    statusBadge = (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 justify-center">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        <span>Melebihi Limit</span>
                      </span>
                    );
                    barColor = 'bg-rose-500';
                  } else if (item.status === 'mendekati') {
                    statusBadge = (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        Mendekati (≥80%)
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

                  return (
                    <tr key={item.sub_category_id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.sub_category_name}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-700 tabular-nums">
                        {item.monthly_limit !== null ? formatRupiah(item.monthly_limit, privacyMode) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                        {formatRupiah(item.spent, privacyMode)}
                      </td>
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
                      <td className="py-3 px-4 text-center">
                        {statusBadge}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                    Tidak ada sub kategori yang melebihi limit.
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
                {editingItemId ? 'Ubah Item Limit Anggaran' : 'Tetapkan Limit Anggaran'}
              </h3>
              <button
                onClick={() => setItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="py-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sub Kategori Pengeluaran
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
                  Batas Limit Bulanan (Rp)
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
                  Berlaku selama 3 bulan di Q{selectedQuarter} {selectedYear}.
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
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs"
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
