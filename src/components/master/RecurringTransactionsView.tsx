import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  Play,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  X,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  DollarSign,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../layout/NotificationToast';
import { formatRupiah, formatNumberOnly, parseNumberFromInput, formatDateID } from '../../lib/formatters';
import { RECURRING_TRANSACTIONS_MIGRATION_SQL } from '../../lib/recurringSql';
import type { RecurringTransaction, RecurringFrequency, TxKind } from '../../types';

export interface RecurringTransactionsViewProps {
  showSqlGuide?: boolean;
  setShowSqlGuide?: React.Dispatch<React.SetStateAction<boolean>>;
  addTrigger?: number;
}

export function RecurringTransactionsView({
  showSqlGuide: externalShowSqlGuide,
  setShowSqlGuide: externalSetShowSqlGuide,
  addTrigger,
}: RecurringTransactionsViewProps = {}) {
  const { isSuperAdmin } = useAuth();
  const {
    recurringTransactions,
    transactionTypes,
    categories,
    subCategories,
    accounts,
    flowParties,
    privacyMode,
    saveRecurringTransaction,
    deleteRecurringTransaction,
    toggleRecurringStatus,
    triggerRecurringExecution,
  } = useData();

  const { showToast } = useToast();

  // State modal create / edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly_date');
  const [dayOfMonth, setDayOfMonth] = useState<number>(20);
  const [executionTime, setExecutionTime] = useState<string>('07:00');

  // Inputan Transaksi
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>('');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [sourcePartyId, setSourcePartyId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [destinationPartyId, setDestinationPartyId] = useState<string>('');
  const [nominalDisplay, setNominalDisplay] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Trigger manual execution loading & SQL guide state
  const [isExecuting, setIsExecuting] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [internalShowSqlGuide, setInternalShowSqlGuide] = useState(false);

  const showSqlGuide = externalShowSqlGuide !== undefined ? externalShowSqlGuide : internalShowSqlGuide;
  const setShowSqlGuide = externalSetShowSqlGuide || setInternalShowSqlGuide;

  // Dengarkan trigger buka modal dari parent CTA header
  useEffect(() => {
    if (addTrigger && addTrigger > 0) {
      handleOpenAdd();
    }
  }, [addTrigger]);

  // Helper active type
  const activeType = transactionTypes.find((t) => t.id === selectedTypeId) || transactionTypes.find((t) => t.kind === 'expense') || transactionTypes[0];

  // Helper categories filtered by type
  const availableCategories = categories.filter(
    (c) => c.transaction_type_id === (activeType?.id || selectedTypeId) && c.is_active
  );

  // Helper subcategories filtered by category
  const availableSubCategories = subCategories.filter(
    (s) => s.category_id === selectedCatId && s.is_active
  );

  // Buka modal tambah baru
  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setFrequency('monthly_date');
    setDayOfMonth(20);
    setExecutionTime('07:00');

    // Default expense jika ada
    const exp = transactionTypes.find((t) => t.kind === 'expense') || transactionTypes[0];
    setSelectedTypeId(exp?.id || '');
    setSelectedCatId('');
    setSelectedSubCatId('');
    setSourceAccountId(accounts[0]?.id || '');
    setSourcePartyId(flowParties.find((p) => p.scope === 'income_source')?.id || '');
    setDestinationAccountId(accounts[1]?.id || accounts[0]?.id || '');
    setDestinationPartyId(flowParties.find((p) => p.scope === 'expense_destination')?.id || '');
    setNominalDisplay('');
    setDescription('');
    setIsActive(true);
    setModalOpen(true);
  };

  // Buka modal edit
  const handleOpenEdit = (rec: RecurringTransaction) => {
    setEditingId(rec.id);
    setName(rec.name);
    setFrequency(rec.frequency);
    setDayOfMonth(rec.day_of_month ?? 20);
    setExecutionTime(rec.execution_time || '07:00');

    setSelectedTypeId(rec.transaction_type_id);
    setSelectedCatId(rec.category_id || '');
    setSelectedSubCatId(rec.sub_category_id || '');
    setSourceAccountId(rec.source_account_id || '');
    setSourcePartyId(rec.source_party_id || '');
    setDestinationAccountId(rec.destination_account_id || '');
    setDestinationPartyId(rec.destination_party_id || '');
    setNominalDisplay(rec.amount !== null && rec.amount !== undefined ? formatNumberOnly(rec.amount) : '');
    setDescription(rec.description || '');
    setIsActive(rec.is_active);
    setModalOpen(true);
  };

  // Submit form simpan jadwal
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showToast('error', 'Nama jadwal otomatis wajib diisi');
      return;
    }

    if (!selectedTypeId) {
      showToast('error', 'Pilih tipe transaksi');
      return;
    }

    const amt = nominalDisplay ? parseNumberFromInput(nominalDisplay) : null;

    // Validasi akun / pihak berdasarkan kind
    const kind = activeType?.kind;
    if (kind === 'income') {
      if (!sourcePartyId) {
        showToast('error', 'Pilih Pihak Sumber Pendapatan');
        return;
      }
      if (!destinationAccountId) {
        showToast('error', 'Pilih Rekening Tujuan Saldo');
        return;
      }
    } else if (kind === 'expense') {
      if (!sourceAccountId) {
        showToast('error', 'Pilih Rekening Sumber Pengeluaran');
        return;
      }
      if (!destinationPartyId) {
        showToast('error', 'Pilih Pihak Tujuan Pengeluaran');
        return;
      }
    } else if (kind === 'transfer') {
      if (!sourceAccountId) {
        showToast('error', 'Pilih Rekening Sumber');
        return;
      }
      if (!destinationAccountId) {
        showToast('error', 'Pilih Rekening Tujuan');
        return;
      }
      if (sourceAccountId === destinationAccountId) {
        showToast('error', 'Rekening sumber dan tujuan tidak boleh sama');
        return;
      }
    }

    const payload: Partial<RecurringTransaction> = {
      id: editingId || undefined,
      name: name.trim(),
      frequency,
      day_of_month: frequency === 'monthly_date' ? Number(dayOfMonth) : null,
      execution_time: executionTime || '07:00',
      transaction_type_id: selectedTypeId,
      category_id: selectedCatId || null,
      sub_category_id: selectedSubCatId || null,
      source_account_id: sourceAccountId || null,
      source_party_id: sourcePartyId || null,
      destination_account_id: destinationAccountId || null,
      destination_party_id: destinationPartyId || null,
      amount: amt,
      description: description.trim() || null,
      is_active: isActive,
    };

    const res = await saveRecurringTransaction(payload);
    if (res.success) {
      showToast('success', editingId ? 'Jadwal otomatis diperbarui' : 'Jadwal otomatis berhasil ditambahkan');
      setModalOpen(false);
    } else {
      showToast('error', 'Gagal menyimpan jadwal otomatis', res.error);
    }
  };

  // Jalankan eksekusi instan
  const handleExecuteNow = async (id?: string) => {
    setIsExecuting(true);
    const res = await triggerRecurringExecution(id);
    setIsExecuting(false);

    if (res.success) {
      if (res.count > 0) {
        showToast('success', 'Eksekusi Berhasil', `${res.count} transaksi baru otomatis berhasil dibuat!`);
      } else {
        showToast('info', 'Pemeriksaan Selesai', 'Tidak ada jadwal transaksi yang jatuh tempo pada jam sekarang.');
      }
    } else {
      showToast('error', 'Gagal eksekusi jadwal', res.error);
    }
  };

  // Salin query migrasi SQL
  const handleCopySql = () => {
    navigator.clipboard.writeText(RECURRING_TRANSACTIONS_MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
    showToast('info', 'Query Disalin!', 'Tempel dan jalankan di Supabase SQL Editor.');
  };

  return (
    <div className="space-y-4">
      {/* SQL QUERY BANNER / MODAL DROPDOWN */}
      {showSqlGuide && (
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h3 className="text-xs sm:text-sm font-bold text-white">
                Query SQL untuk Supabase Dashboard (1-Klik Copy)
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopySql}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all self-start sm:self-auto cursor-pointer shadow-xs"
              >
                {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSql ? 'Tersalin ke Clipboard!' : 'Salin Query SQL Lengkap'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSqlGuide(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Tutup Panduan SQL"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-[11px] sm:text-xs text-slate-300 leading-relaxed">
            Jalankan query ini di menu <strong>Supabase Dashboard &rarr; SQL Editor &rarr; New Query &rarr; Run</strong>.
            Skema ini membuat tabel <code>recurring_transactions</code>, stored procedure <code>process_due_recurring_transactions()</code>, dan memperbolehkan transaksi nominal 0/susulan.
          </p>

          <div className="relative">
            <pre className="p-3 bg-black/50 rounded-xl text-[11px] font-mono text-emerald-300 max-h-48 overflow-y-auto leading-relaxed border border-slate-800 selection:bg-emerald-900">
              {RECURRING_TRANSACTIONS_MIGRATION_SQL}
            </pre>
          </div>
        </div>
      )}

      {/* DAFTAR JADWAL OTOMASI TRANSAKSI */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {recurringTransactions.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
              <CalendarClock className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Belum Ada Jadwal Transaksi Otomatis</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tambahkan otomasi transaksi untuk pengeluaran berulang seperti biaya admin bank bulanan tiap tanggal 20 atau iuran rutin.
            </p>
            {isSuperAdmin && (
              <button
                onClick={handleOpenAdd}
                className="mt-2 px-4 py-2 bg-[#1E6B4F] text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 hover:bg-[#16523c] transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Jadwal Pertama</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Nama & Deskripsi</th>
                  <th className="py-3 px-4">Jadwal & Jam</th>
                  <th className="py-3 px-4">Tipe & Kategori</th>
                  <th className="py-3 px-4 text-right">Nominal</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Terakhir Dibuat</th>
                  {isSuperAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recurringTransactions.map((rec) => {
                  const isExpense = rec.type_kind === 'expense';
                  const isIncome = rec.type_kind === 'income';
                  const isTransfer = rec.type_kind === 'transfer';

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nama & Deskripsi */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{rec.name}</div>
                        {rec.description && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {rec.description}
                          </div>
                        )}
                      </td>

                      {/* Jadwal & Jam */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {rec.frequency === 'daily'
                              ? 'Setiap Hari'
                              : `Tiap Tanggal ${rec.day_of_month}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>Pukul {rec.execution_time || '07:00'} WIB</span>
                        </div>
                      </td>

                      {/* Tipe & Kategori */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              isExpense
                                ? 'bg-rose-50 text-rose-700'
                                : isIncome
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {rec.type_name || (isExpense ? 'Pengeluaran' : isIncome ? 'Pemasukan' : 'Transfer')}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 font-medium mt-1">
                          {rec.sub_category_name !== '-'
                            ? rec.sub_category_name
                            : rec.category_name !== '-'
                            ? rec.category_name
                            : '-'}
                        </div>
                      </td>

                      {/* Nominal */}
                      <td className="py-3 px-4 text-right">
                        {rec.amount !== null && rec.amount !== undefined && rec.amount > 0 ? (
                          <span className="font-bold font-mono text-slate-800 tabular-nums">
                            {formatRupiah(rec.amount, privacyMode)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                            Nominal Susulan
                          </span>
                        )}
                      </td>

                      {/* Status Aktif */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={!isSuperAdmin}
                          onClick={() => toggleRecurringStatus(rec.id, !rec.is_active)}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-colors cursor-pointer ${
                            rec.is_active
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          {rec.is_active ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>

                      {/* Terakhir Dibuat */}
                      <td className="py-3 px-4 text-center text-slate-500 font-mono text-[11px]">
                        {rec.last_executed_at ? (
                          <span title={rec.last_executed_at}>
                            {formatDateID(rec.last_executed_at)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum pernah</span>
                        )}
                      </td>

                      {/* Aksi Superadmin */}
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleExecuteNow(rec.id)}
                              title="Jalankan jadwal ini sekarang"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(rec)}
                              title="Edit jadwal"
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                if (window.confirm(`Hapus jadwal otomatis "${rec.name}"?`)) {
                                  const delRes = await deleteRecurringTransaction(rec.id);
                                  if (delRes.success) {
                                    showToast('success', 'Jadwal otomatis dihapus');
                                  } else {
                                    showToast('error', 'Gagal menghapus jadwal', delRes.error);
                                  }
                                }
                              }}
                              title="Hapus jadwal"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL FORM TAMBAH / EDIT JADWAL OTOMASI */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-[#1E6B4F]/10 rounded-lg text-[#1E6B4F]">
                  <CalendarClock className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-sm">
                  {editingId ? 'Edit Jadwal Otomasi Transaksi' : 'Tambah Jadwal Otomasi Transaksi'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. Nama Jadwal */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Jadwal Otomasi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Biaya Admin Bank Mandiri, Iuran Wifi, dll"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                />
              </div>

              {/* 2. Pilihan Frekuensi & Jam Create */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#1E6B4F]" />
                  <span>Pengaturan Waktu & Jadwal Otomasi</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Frekuensi Otomasi <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    >
                      <option value="monthly_date">Tiap Tanggal Tertentu (Bulanan)</option>
                      <option value="daily">Setiap Hari (Harian)</option>
                    </select>
                  </div>

                  {frequency === 'monthly_date' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pilihan Tanggal (1 - 31) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          value={dayOfMonth}
                          onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                        >
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              Tanggal {d} {d === 20 ? '(Contoh: Admin Bank)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Keterangan Hari
                      </label>
                      <div className="px-3 py-2 text-xs bg-slate-100 rounded-xl text-slate-600 font-medium">
                        Setiap Hari Pagi/Sore
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jam Pembuatan (WIB) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={executionTime}
                    onClick={(e) => {
                      try {
                        (e.currentTarget as any).showPicker?.();
                      } catch {}
                    }}
                    onChange={(e) => setExecutionTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Waktu pembuatan transaksi otomatis pada hari yang dijadwalkan (Format 24 jam).
                  </p>
                </div>
              </div>

              {/* 3. Tipe Transaksi & Kategori (Inputan Persis Sama) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe Transaksi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={selectedTypeId}
                    onChange={(e) => {
                      setSelectedTypeId(e.target.value);
                      setSelectedCatId('');
                      setSelectedSubCatId('');
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  >
                    {transactionTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.kind})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={selectedCatId}
                    onChange={(e) => {
                      setSelectedCatId(e.target.value);
                      setSelectedSubCatId('');
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  >
                    <option value="">-- Tanpa Kategori --</option>
                    {availableCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sub Kategori
                  </label>
                  <select
                    value={selectedSubCatId}
                    onChange={(e) => setSelectedSubCatId(e.target.value)}
                    disabled={!selectedCatId}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] disabled:bg-slate-50"
                  >
                    <option value="">-- Tanpa Sub Kategori --</option>
                    {availableSubCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 4. Rekening Sumber & Tujuan / Pihak Aliran */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeType?.kind === 'income' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pihak Sumber Pendapatan <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={sourcePartyId}
                        onChange={(e) => setSourcePartyId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      >
                        <option value="">-- Pilih Pihak Sumber --</option>
                        {flowParties
                          .filter((p) => p.scope === 'income_source' && p.is_active)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rekening Tujuan Saldo <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={destinationAccountId}
                        onChange={(e) => setDestinationAccountId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      >
                        <option value="">-- Pilih Rekening Tujuan --</option>
                        {accounts
                          .filter((a) => a.is_active)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.group_type})
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                ) : activeType?.kind === 'expense' ? (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rekening Sumber Saldo <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={sourceAccountId}
                        onChange={(e) => setSourceAccountId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      >
                        <option value="">-- Pilih Rekening Sumber --</option>
                        {accounts
                          .filter((a) => a.is_active)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.group_type})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Pihak Tujuan Pengeluaran <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={destinationPartyId}
                        onChange={(e) => setDestinationPartyId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      >
                        <option value="">-- Pilih Pihak Tujuan --</option>
                        {flowParties
                          .filter((p) => p.scope === 'expense_destination' && p.is_active)
                          .map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rekening Sumber Transfer <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={sourceAccountId}
                        onChange={(e) => setSourceAccountId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      >
                        <option value="">-- Pilih Rekening Sumber --</option>
                        {accounts
                          .filter((a) => a.is_active)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.group_type})
                            </option>
                          ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Rekening Tujuan Transfer <span className="text-rose-500">*</span>
                      </label>
                      <select
                        required
                        value={destinationAccountId}
                        onChange={(e) => setDestinationAccountId(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      >
                        <option value="">-- Pilih Rekening Tujuan --</option>
                        {accounts
                          .filter((a) => a.is_active)
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.group_type})
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* 5. Nominal (Opsional / Susulan) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nominal Transaksi (Rp)
                  </label>
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold">
                    Opsional (Bisa dikosongkan untuk susulan)
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    value={nominalDisplay}
                    onChange={(e) => setNominalDisplay(formatNumberOnly(e.target.value))}
                    placeholder="Kosongkan jika nominal menyusul (misal: tagihan fleksibel)"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Jika dikosongkan atau diisi 0, transaksi akan terbuat dengan nominal Rp0 sehingga Anda tinggal mengedit nominalnya saat bukti atau tagihan tiba.
                </p>
              </div>

              {/* 6. Deskripsi / Catatan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan transaksi otomatis..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                />
              </div>

              {/* 7. Status Aktif */}
              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded text-[#1E6B4F] focus:ring-[#1E6B4F]"
                  />
                  <span>Aktifkan jadwal otomatis ini sekarang</span>
                </label>
              </div>

              {/* Footer Buttons */}
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs transition-colors"
                >
                  {editingId ? 'Simpan Perubahan' : 'Buat Jadwal Otomatis'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
