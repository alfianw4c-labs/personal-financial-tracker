import React from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ReceiptText,
  ChevronRight,
} from 'lucide-react';
import { formatRupiah, formatDateID } from '../../lib/formatters';
import type { Category, SubCategory, Transaction, QuarterlyPlanItem } from '../../types';
import type { DashboardDateFilterMode } from './DashboardView';

export interface MonitoringItem {
  sub_category_id: string;
  sub_category_name: string;
  monthly_limit: number | null;
  spent: number;
  remaining: number | null;
  percentage: number;
  status: 'aman' | 'mendekati' | 'melebihi' | 'tanpa_limit';
  note?: string;
}

interface BudgetEvaluationSectionProps {
  periodLabel: string;
  filterMode: DashboardDateFilterMode;
  monitoringList: MonitoringItem[];
  expenseSubCategories: SubCategory[];
  activePlanItems: QuarterlyPlanItem[];
  categories: Category[];
  expandedSubCats: Set<string>;
  txMapBySubCategory: Map<string, Transaction[]>;
  filterOnlyExceeded: boolean;
  setFilterOnlyExceeded: (val: boolean) => void;
  toggleExpand: (subCatId: string) => void;
  handleToggleExpandAll: (itemCount: number, ids: string[]) => void;
  privacyMode: boolean;
  onNavigateToPlanning: () => void;
  effectiveQuarter: number;
}

export function BudgetEvaluationSection({
  periodLabel,
  filterMode,
  monitoringList,
  expenseSubCategories,
  activePlanItems,
  categories,
  expandedSubCats,
  txMapBySubCategory,
  filterOnlyExceeded,
  setFilterOnlyExceeded,
  toggleExpand,
  handleToggleExpandAll,
  privacyMode,
  onNavigateToPlanning,
  effectiveQuarter,
}: BudgetEvaluationSectionProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-2xs space-y-4">
      {/* Toolbar Tabel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Evaluasi & Realisasi Anggaran per Sub Kategori</span>
            <span className="text-xs px-2.5 py-0.5 font-semibold bg-emerald-50 text-[#1E6B4F] rounded-full border border-emerald-200">
              {periodLabel}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Klik pada baris mana saja untuk melihat rincian transaksi belanja yang tercatat pada periode ini.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
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

          {/* Tombol Buka / Tutup Semua Accordion */}
          <button
            onClick={() =>
              handleToggleExpandAll(
                monitoringList.length,
                monitoringList.map((m) => m.sub_category_id)
              )
            }
            className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            title="Buka atau tutup seluruh rincian transaksi"
          >
            {expandedSubCats.size > 0 ? 'Tutup Semua Transaksi' : 'Buka Semua Transaksi'}
          </button>

          {/* Navigasi Cepat ke Halaman Perencanaan */}
          <button
            onClick={onNavigateToPlanning}
            className="px-3 py-1.5 text-xs font-bold text-[#1E6B4F] hover:bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
            title="Kelola limit atau susun perencanaan kuartal"
          >
            <span>Atur di Perencanaan</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabel Terpadu Evaluasi & Realisasi */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
              <th className="py-3 px-4" style={{ width: '280px' }}>
                Sub Kategori & Kategori
              </th>
              <th className="py-3 px-4 text-right" style={{ width: '160px' }}>
                {filterMode === 'month' ? 'Limit Bulanan' : 'Limit Acuan'}
              </th>
              <th className="py-3 px-4 text-right" style={{ width: '160px' }}>
                Realisasi ({periodLabel})
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
              <th className="py-3 px-4 text-center" style={{ width: '80px' }}>
                Rincian
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {monitoringList.length > 0 ? (
              monitoringList.map((item) => {
                const sub = expenseSubCategories.find((s) => s.id === item.sub_category_id);
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
                const isCustomPlan = activePlanItems.some((pi) => pi.sub_category_id === item.sub_category_id);

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
                            {item.note && (
                              <p className="text-[11px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                                {item.note}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Kolom 2: Limit Bulanan / Acuan */}
                      <td className="py-3 px-4 text-right">
                        <div className="font-bold text-slate-900 tabular-nums">
                          {item.monthly_limit !== null
                            ? formatRupiah(item.monthly_limit, privacyMode)
                            : 'Tanpa Limit'}
                        </div>
                        <div className="mt-0.5">
                          {isCustomPlan ? (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Rencana Q{effectiveQuarter}
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

                      {/* Kolom 3: Realisasi */}
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

                      {/* Kolom 7: Rincian (Toggle Accordion saja, tanpa tombol pengelolaan) */}
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
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
                      </td>
                    </tr>

                    {/* Baris Accordion: Rincian Transaksi */}
                    {isExpanded && (
                      <tr className="bg-slate-50/70 border-b border-slate-200">
                        <td colSpan={7} className="p-3 sm:p-4">
                          <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-4 space-y-3">
                            {/* Header Accordion */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 rounded-lg bg-emerald-50 text-[#1E6B4F]">
                                  <ReceiptText className="w-4 h-4" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-xs text-slate-900">
                                    Mutasi Transaksi: {item.sub_category_name}
                                  </h4>
                                  <p className="text-[11px] text-slate-400">
                                    Periode {periodLabel}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs">
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold text-[11px]">
                                  {subTxs.length} Transaksi
                                </span>
                                <span className="font-extrabold text-slate-900 bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-0.5 rounded-full text-[11px]">
                                  Total: {formatRupiah(item.spent, privacyMode)}
                                </span>
                              </div>
                            </div>

                            {/* Tabel / List Transaksi */}
                            {subTxs.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                                      <th className="py-2 px-3" style={{ width: '120px' }}>
                                        Tanggal
                                      </th>
                                      <th className="py-2 px-3" style={{ width: '220px' }}>
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
                                        <td className="py-2.5 px-3">
                                          <div className="flex items-center gap-1.5 text-slate-800">
                                            <span className="font-semibold text-slate-900">
                                              {tx.source_name || 'Kas/Bank'}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                                            <span className="text-slate-600">
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
                              <div className="py-6 text-center text-slate-400 text-xs">
                                Tidak ada transaksi belanja untuk sub kategori ini pada periode {periodLabel}.
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
                <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                  {filterOnlyExceeded
                    ? 'Tidak ada sub kategori yang melebihi limit anggaran.'
                    : 'Belum ada data sub kategori belanja.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
