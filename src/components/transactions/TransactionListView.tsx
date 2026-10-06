import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Copy,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  X,
  Calendar,
  CheckCircle2,
  Building,
  Coins,
  PiggyBank,
  CreditCard,
  RotateCcw,
  Wallet,
  SlidersHorizontal,
  ReceiptText,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useToast } from '../layout/NotificationToast';
import {
  formatRupiah,
  formatDateID,
  toISODate,
  formatNumberOnly,
  parseNumberFromInput,
} from '../../lib/formatters';
import type { Transaction, TxKind } from '../../types';

export function TransactionListView() {
  const {
    transactions,
    transactionTypes,
    categories,
    subCategories,
    accounts,
    flowParties,
    privacyMode,
    getAccountBalance,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getMonthlyLimitStatusList,
  } = useData();

  const { showToast, showLimitWarning } = useToast();

  // Modal form transaksi terbuka (untuk edit atau tambah)
  const [formModalOpen, setFormModalOpen] = useState<boolean>(false);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);

  // Form State
  const [txDate, setTxDate] = useState<string>(toISODate());
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedSubCatId, setSelectedSubCatId] = useState<string>('');
  const [sourceAccountId, setSourceAccountId] = useState<string>('');
  const [sourcePartyId, setSourcePartyId] = useState<string>('');
  const [destinationAccountId, setDestinationAccountId] = useState<string>('');
  const [destinationPartyId, setDestinationPartyId] = useState<string>('');
  const [nominalDisplay, setNominalDisplay] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Konfirmasi Expense Melebihi Saldo Akun
  const [overbalanceWarning, setOverbalanceWarning] = useState<{
    show: boolean;
    accountName: string;
    currentBalance: number;
    amount: number;
  } | null>(null);

  // Konfirmasi Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // In-column filters per spesifikasi user
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubCategory, setFilterSubCategory] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('');
  const [filterDestination, setFilterDestination] = useState<string>('');
  const [filterMinAmount, setFilterMinAmount] = useState<string>('');
  const [filterMaxAmount, setFilterMaxAmount] = useState<string>('');
  const [filterDescription, setFilterDescription] = useState<string>('');

  // 1 Inputan Popover State untuk Filter Tanggal (Start & End Date)
  const [showDatePopover, setShowDatePopover] = useState<boolean>(false);
  const [tempStartDate, setTempStartDate] = useState<string>('');
  const [tempEndDate, setTempEndDate] = useState<string>('');

  // 1 Inputan Popover State untuk Filter Nominal (Min & Max)
  const [showNominalPopover, setShowNominalPopover] = useState<boolean>(false);
  const [tempMinAmount, setTempMinAmount] = useState<string>('');
  const [tempMaxAmount, setTempMaxAmount] = useState<string>('');

  // Handler Popover Tanggal
  const handleOpenDatePopover = () => {
    setTempStartDate(filterStartDate);
    setTempEndDate(filterEndDate);
    setShowDatePopover(!showDatePopover);
    setShowNominalPopover(false);
  };

  const handleApplyDate = () => {
    setFilterStartDate(tempStartDate);
    setFilterEndDate(tempEndDate);
    setShowDatePopover(false);
    setCurrentPage(1);
  };

  const handleResetDate = () => {
    setTempStartDate('');
    setTempEndDate('');
    setFilterStartDate('');
    setFilterEndDate('');
    setShowDatePopover(false);
    setCurrentPage(1);
  };

  // Handler Popover Nominal
  const handleOpenNominalPopover = () => {
    setTempMinAmount(filterMinAmount);
    setTempMaxAmount(filterMaxAmount);
    setShowNominalPopover(!showNominalPopover);
    setShowDatePopover(false);
  };

  const handleApplyNominal = () => {
    setFilterMinAmount(tempMinAmount);
    setFilterMaxAmount(tempMaxAmount);
    setShowNominalPopover(false);
    setCurrentPage(1);
  };

  const handleResetNominal = () => {
    setTempMinAmount('');
    setTempMaxAmount('');
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setShowNominalPopover(false);
    setCurrentPage(1);
  };

  // Helper label display untuk 1 inputan tanggal
  const dateFilterLabel = useMemo(() => {
    if (!filterStartDate && !filterEndDate) return 'Semua Tanggal';
    if (filterStartDate && filterEndDate) {
      if (filterStartDate === filterEndDate) return formatDateID(filterStartDate);
      return `${formatDateID(filterStartDate)} - ${formatDateID(filterEndDate)}`;
    }
    if (filterStartDate) return `Dari ${formatDateID(filterStartDate)}`;
    if (filterEndDate) return `S/d ${formatDateID(filterEndDate)}`;
    return 'Semua Tanggal';
  }, [filterStartDate, filterEndDate]);

  // Helper label display untuk 1 inputan nominal
  const nominalFilterLabel = useMemo(() => {
    if (!filterMinAmount && !filterMaxAmount) return 'Semua Nominal';
    if (filterMinAmount && filterMaxAmount) {
      return `Rp${filterMinAmount} - Rp${filterMaxAmount}`;
    }
    if (filterMinAmount) return `≥ Rp${filterMinAmount}`;
    if (filterMaxAmount) return `≤ Rp${filterMaxAmount}`;
    return 'Semua Nominal';
  }, [filterMinAmount, filterMaxAmount]);

  // Tutup popover dengan tombol Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowDatePopover(false);
        setShowNominalPopover(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dashboard Info Saldo Rekening state
  const [selectedDashboardAccount, setSelectedDashboardAccount] = useState<string | null>(null);
  const [accountGroupTab, setAccountGroupTab] = useState<'all' | 'cash' | 'bank' | 'tabungan' | 'paylater'>('all');

  // Sorting & Pagination
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 15;

  // Selected Type Details
  const activeType = useMemo(() => {
    return transactionTypes.find((t) => t.id === selectedTypeId) || transactionTypes[0];
  }, [transactionTypes, selectedTypeId]);

  // Set default type on load if empty
  React.useEffect(() => {
    if (!selectedTypeId && transactionTypes.length > 0) {
      // Default to Expense jika ada
      const exp = transactionTypes.find((t) => t.kind === 'expense') || transactionTypes[0];
      setSelectedTypeId(exp.id);
    }
  }, [transactionTypes, selectedTypeId]);

  // Categories filtered by active type
  const availableCategories = useMemo(() => {
    if (!activeType) return [];
    return categories.filter((c) => c.transaction_type_id === activeType.id && c.is_active);
  }, [categories, activeType]);

  // Sub-categories filtered by selected category
  const availableSubCategories = useMemo(() => {
    if (!selectedCatId) return [];
    return subCategories.filter((s) => s.category_id === selectedCatId && s.is_active);
  }, [subCategories, selectedCatId]);

  // Reset category & sub-category when type changes
  const handleTypeChange = (typeId: string) => {
    setSelectedTypeId(typeId);
    setSelectedCatId('');
    setSelectedSubCatId('');
  };

  // Reset sub-category when category changes
  const handleCategoryChange = (catId: string) => {
    setSelectedCatId(catId);
    setSelectedSubCatId('');
  };

  // Reset form
  const resetForm = () => {
    setEditingTxId(null);
    setTxDate(toISODate());
    const exp = transactionTypes.find((t) => t.kind === 'expense') || transactionTypes[0];
    if (exp) setSelectedTypeId(exp.id);
    setSelectedCatId('');
    setSelectedSubCatId('');
    setSourceAccountId('');
    setSourcePartyId('');
    setDestinationAccountId('');
    setDestinationPartyId('');
    setNominalDisplay('');
    setDescription('');
  };

  // Pre-fill form for edit
  const handleEdit = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setTxDate(tx.tx_date);
    setSelectedTypeId(tx.transaction_type_id);
    setSelectedCatId(tx.category_id || '');
    setSelectedSubCatId(tx.sub_category_id || '');
    setSourceAccountId(tx.source_account_id || '');
    setSourcePartyId(tx.source_party_id || '');
    setDestinationAccountId(tx.destination_account_id || '');
    setDestinationPartyId(tx.destination_party_id || '');
    setNominalDisplay(formatNumberOnly(tx.amount));
    setDescription(tx.description || '');
    setFormModalOpen(true);
  };

  // Duplicate transaction
  const handleDuplicate = (tx: Transaction) => {
    setEditingTxId(null);
    setTxDate(toISODate());
    setSelectedTypeId(tx.transaction_type_id);
    setSelectedCatId(tx.category_id || '');
    setSelectedSubCatId(tx.sub_category_id || '');
    setSourceAccountId(tx.source_account_id || '');
    setSourcePartyId(tx.source_party_id || '');
    setDestinationAccountId(tx.destination_account_id || '');
    setDestinationPartyId(tx.destination_party_id || '');
    setNominalDisplay(formatNumberOnly(tx.amount));
    setDescription(tx.description ? `${tx.description} (Salinan)` : 'Salinan Transaksi');
    setFormModalOpen(true);
    showToast('info', 'Data Disalin', 'Form telah diisi dari transaksi yang dipilih.');
  };

  // Execute Save Transaction
  const executeSave = async () => {
    const amount = parseNumberFromInput(nominalDisplay);
    if (!txDate) {
      showToast('error', 'Tanggal wajib diisi');
      return;
    }
    if (!activeType) {
      showToast('error', 'Pilih tipe transaksi');
      return;
    }
    if (amount <= 0) {
      showToast('error', 'Nominal harus lebih dari 0');
      return;
    }

    // Validation per kind
    const kind = activeType.kind;
    if (kind === 'income') {
      if (!sourcePartyId) {
        showToast('error', 'Pilih Pihak Sumber Pendapatan');
        return;
      }
      if (!destinationAccountId) {
        showToast('error', 'Pilih Akun Tujuan Saldo');
        return;
      }
    } else if (kind === 'expense') {
      if (!sourceAccountId) {
        showToast('error', 'Pilih Akun Sumber Saldo');
        return;
      }
      if (!destinationPartyId) {
        showToast('error', 'Pilih Pihak Tujuan Pengeluaran');
        return;
      }
    } else if (kind === 'transfer') {
      if (!sourceAccountId) {
        showToast('error', 'Pilih Akun Asal');
        return;
      }
      if (!destinationAccountId) {
        showToast('error', 'Pilih Akun Tujuan');
        return;
      }
      if (sourceAccountId === destinationAccountId) {
        showToast('error', 'Akun asal dan akun tujuan tidak boleh sama!');
        return;
      }
    }

    const payload = {
      tx_date: txDate,
      transaction_type_id: activeType.id,
      category_id: selectedCatId || null,
      sub_category_id: selectedSubCatId || null,
      source_account_id: kind === 'income' ? null : sourceAccountId || null,
      source_party_id: kind === 'income' ? sourcePartyId || null : null,
      destination_account_id: kind === 'expense' ? null : destinationAccountId || null,
      destination_party_id: kind === 'expense' ? destinationPartyId || null : null,
      amount,
      description: description.trim() || null,
    };

    if (editingTxId) {
      const res = await updateTransaction(editingTxId, payload);
      if (res.success) {
        showToast('success', 'Transaksi Berhasil Diperbarui');
        if (res.limitWarning) {
          showLimitWarning(
            res.limitWarning.subCategoryName,
            formatRupiah(res.limitWarning.totalSpent, privacyMode),
            formatRupiah(res.limitWarning.limit, privacyMode),
            formatRupiah(res.limitWarning.diff, privacyMode)
          );
        }
        resetForm();
        setFormModalOpen(false);
      } else {
        showToast('error', 'Gagal memperbarui transaksi', res.error);
      }
    } else {
      const res = await addTransaction(payload);
      if (res.success) {
        showToast('success', 'Transaksi Berhasil Disimpan');
        if (res.limitWarning) {
          showLimitWarning(
            res.limitWarning.subCategoryName,
            formatRupiah(res.limitWarning.totalSpent, privacyMode),
            formatRupiah(res.limitWarning.limit, privacyMode),
            formatRupiah(res.limitWarning.diff, privacyMode)
          );
        }
        resetForm();
        setFormModalOpen(false);
      } else {
        showToast('error', 'Gagal menyimpan transaksi', res.error);
      }
    }
  };

  // Form submit handler with overbalance check
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseNumberFromInput(nominalDisplay);

    // Cek apakah pengeluaran melebihi saldo akun sumber
    if (activeType?.kind === 'expense' && sourceAccountId) {
      const currentBal = getAccountBalance(sourceAccountId);
      if (amount > currentBal) {
        const acc = accounts.find((a) => a.id === sourceAccountId);
        setOverbalanceWarning({
          show: true,
          accountName: acc?.name || 'Akun Sumber',
          currentBalance: currentBal,
          amount,
        });
        return;
      }
    }

    executeSave();
  };

  // Konfirmasi delete
  const confirmDelete = async () => {
    if (!deletingId) return;
    const res = await deleteTransaction(deletingId);
    if (res.success) {
      showToast('success', 'Transaksi Berhasil Dihapus');
    } else {
      showToast('error', 'Gagal menghapus transaksi', res.error);
    }
    setDeletingId(null);
  };

  // Map of subcategories exceeded per month to show warning badge on table
  const exceededCache = useMemo(() => {
    const map = new Map<string, boolean>(); // key: `${monthStr}_${subCatId}`
    transactions.forEach((t) => {
      if (t.tx_date && t.sub_category_id) {
        const ym = t.tx_date.slice(0, 7);
        const [y, m] = ym.split('-').map(Number);
        const key = `${ym}_${t.sub_category_id}`;
        if (!map.has(key)) {
          const limits = getMonthlyLimitStatusList(y, m);
          const item = limits.find((l) => l.sub_category_id === t.sub_category_id);
          map.set(key, item?.status === 'melebihi');
        }
      }
    });
    return map;
  }, [transactions, getMonthlyLimitStatusList]);

  // Statistik Saldo Rekening untuk Mini Dashboard
  const accountStats = useMemo(() => {
    let totalCashBank = 0;
    let totalTabungan = 0;
    let totalPaylater = 0;

    accounts.filter((a) => a.is_active).forEach((a) => {
      const bal = Number(a.current_balance) || 0;
      if (a.group_type === 'cash' || a.group_type === 'bank') totalCashBank += bal;
      if (a.group_type === 'tabungan') totalTabungan += bal;
      if (a.group_type === 'paylater') totalPaylater += bal;
    });

    const netBalance = totalCashBank - Math.abs(totalPaylater);
    return {
      totalCashBank,
      totalTabungan,
      totalPaylater,
      netBalance,
    };
  }, [accounts]);

  // Akun terfilter berdasarkan tab grup
  const displayedAccounts = useMemo(() => {
    return accounts
      .filter((a) => a.is_active)
      .filter((a) => accountGroupTab === 'all' || a.group_type === accountGroupTab);
  }, [accounts, accountGroupTab]);

  // Filtered and Sorted Transactions dengan filter tiap kolom
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // 1. Tanggal Start & End Date
      if (filterStartDate && tx.tx_date < filterStartDate) return false;
      if (filterEndDate && tx.tx_date > filterEndDate) return false;

      // 2. Tipe
      if (filterType !== 'all' && tx.transaction_type_id !== filterType) return false;

      // 3. Sub Kategori
      if (filterSubCategory !== 'all') {
        if (tx.sub_category_id !== filterSubCategory && tx.sub_category_name !== filterSubCategory) {
          return false;
        }
      }

      // 4. Sumber
      if (filterSource.trim()) {
        const q = filterSource.toLowerCase().trim();
        const src = (tx.source_name || '').toLowerCase();
        if (!src.includes(q)) return false;
      }

      // 5. Tujuan
      if (filterDestination.trim()) {
        const q = filterDestination.toLowerCase().trim();
        const dst = (tx.destination_name || '').toLowerCase();
        if (!dst.includes(q)) return false;
      }

      // 6. Selected Dashboard Account
      if (selectedDashboardAccount) {
        const acc = accounts.find((a) => a.id === selectedDashboardAccount);
        const accName = acc?.name.toLowerCase() || '';
        const matchSrc = tx.source_account_id === selectedDashboardAccount || (tx.source_name || '').toLowerCase() === accName;
        const matchDst = tx.destination_account_id === selectedDashboardAccount || (tx.destination_name || '').toLowerCase() === accName;
        if (!matchSrc && !matchDst) return false;
      }

      // 7. Nominal Min / Max
      if (filterMinAmount) {
        const minNum = parseNumberFromInput(filterMinAmount);
        if (minNum > 0 && tx.amount < minNum) return false;
      }
      if (filterMaxAmount) {
        const maxNum = parseNumberFromInput(filterMaxAmount);
        if (maxNum > 0 && tx.amount > maxNum) return false;
      }

      // 8. Keterangan
      if (filterDescription.trim()) {
        const q = filterDescription.toLowerCase().trim();
        const desc = (tx.description || '').toLowerCase();
        if (!desc.includes(q)) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const da = new Date(a.tx_date).getTime();
        const db = new Date(b.tx_date).getTime();
        return sortOrder === 'desc' ? db - da : da - db;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });
  }, [
    transactions,
    accounts,
    filterStartDate,
    filterEndDate,
    filterType,
    filterSubCategory,
    filterSource,
    filterDestination,
    selectedDashboardAccount,
    filterMinAmount,
    filterMaxAmount,
    filterDescription,
    sortField,
    sortOrder,
  ]);

  const isAnyFilterActive = Boolean(
    filterStartDate ||
    filterEndDate ||
    filterType !== 'all' ||
    filterSubCategory !== 'all' ||
    filterSource ||
    filterDestination ||
    selectedDashboardAccount ||
    filterMinAmount ||
    filterMaxAmount ||
    filterDescription
  );

  const resetAllFilters = () => {
    setFilterStartDate('');
    setFilterEndDate('');
    setTempStartDate('');
    setTempEndDate('');
    setFilterType('all');
    setFilterSubCategory('all');
    setFilterSource('');
    setFilterDestination('');
    setSelectedDashboardAccount(null);
    setFilterMinAmount('');
    setFilterMaxAmount('');
    setTempMinAmount('');
    setTempMaxAmount('');
    setFilterDescription('');
    setShowDatePopover(false);
    setShowNominalPopover(false);
    setCurrentPage(1);
  };

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredTransactions.slice(start, start + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Tanggal', 'Tipe', 'Kategori', 'Sub Kategori', 'Sumber', 'Tujuan', 'Nominal', 'Keterangan'];
    const rows = filteredTransactions.map((tx) => [
      tx.id,
      formatDateID(tx.tx_date),
      tx.type_name,
      tx.category_name,
      tx.sub_category_name,
      tx.source_name,
      tx.destination_name,
      tx.amount,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daily_Cashflow_${toISODate()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('success', 'File CSV Berhasil Diunduh');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pencatatan Transaksi (Daily Cashflow)
          </h1>
          <p className="text-xs text-slate-500">
            Kelola seluruh arus kas harian keluarga, filter, cari, dan ekspor data.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV</span>
          </button>

          <button
            onClick={() => {
              resetForm();
              setFormModalOpen(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#1E6B4F] hover:bg-[#16523c] text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Transaksi</span>
          </button>
        </div>
      </div>

      {/* SECTION DASHBOARD INFO SALDO TIAP REKENING (Sesuai Permintaan) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#1E6B4F] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 leading-tight">
                Dashboard Saldo Rekening & Dompet
              </h2>
              <p className="text-[11px] text-slate-500">
                Klik kartu akun untuk langsung menyaring mutasi transaksi akun tersebut.
              </p>
            </div>
          </div>

          {/* Quick Summary Numbers */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="text-[10px] text-emerald-700 font-semibold block">Kas & Bank</span>
              <span className="font-bold text-[#1E6B4F] tabular-nums">
                {formatRupiah(accountStats.totalCashBank, privacyMode)}
              </span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
              <span className="text-[10px] text-blue-700 font-semibold block">Total Tabungan</span>
              <span className="font-bold text-blue-700 tabular-nums">
                {formatRupiah(accountStats.totalTabungan, privacyMode)}
              </span>
            </div>
            {accountStats.totalPaylater > 0 && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100">
                <span className="text-[10px] text-amber-700 font-semibold block">PayLater/Hutang</span>
                <span className="font-bold text-amber-700 tabular-nums">
                  {formatRupiah(accountStats.totalPaylater, privacyMode)}
                </span>
              </div>
            )}
            <div className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-600 font-semibold block">Saldo Bersih</span>
              <span className="font-bold text-slate-900 tabular-nums">
                {formatRupiah(accountStats.netBalance, privacyMode)}
              </span>
            </div>
            {selectedDashboardAccount && (
              <button
                onClick={() => setSelectedDashboardAccount(null)}
                className="px-2.5 py-1 text-[11px] text-rose-600 bg-rose-50 border border-rose-200 rounded-lg hover:bg-rose-100 flex items-center gap-1 font-semibold transition-colors"
              >
                <X className="w-3 h-3" />
                <span>Hapus Filter Akun</span>
              </button>
            )}
          </div>
        </div>

        {/* Group Tabs Filter */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: `Semua Akun (${accounts.filter((a) => a.is_active).length})` },
            { id: 'bank', label: 'Bank' },
            { id: 'cash', label: 'Tunai / Kas' },
            { id: 'tabungan', label: 'Tabungan' },
            { id: 'paylater', label: 'PayLater / CC' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAccountGroupTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                accountGroupTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Account Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {displayedAccounts.map((acc) => {
            const isSelected = selectedDashboardAccount === acc.id;
            let groupBadge = 'Kas';
            let groupColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
            let Icon = Coins;

            if (acc.group_type === 'bank') {
              groupBadge = 'Bank';
              groupColor = 'bg-teal-50 text-teal-800 border-teal-200';
              Icon = Building;
            } else if (acc.group_type === 'tabungan') {
              groupBadge = 'Tabungan';
              groupColor = 'bg-blue-50 text-blue-800 border-blue-200';
              Icon = PiggyBank;
            } else if (acc.group_type === 'paylater') {
              groupBadge = 'PayLater';
              groupColor = 'bg-amber-50 text-amber-800 border-amber-200';
              Icon = CreditCard;
            }

            return (
              <button
                key={acc.id}
                onClick={() => {
                  if (isSelected) {
                    setSelectedDashboardAccount(null);
                  } else {
                    setSelectedDashboardAccount(acc.id);
                  }
                  setCurrentPage(1);
                }}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#1E6B4F] bg-emerald-50/70 ring-2 ring-[#1E6B4F]/20 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-1 w-full">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 text-xs block truncate" title={acc.name}>
                      {acc.name}
                    </span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {acc.owner_label ? `Milik: ${acc.owner_label}` : acc.purpose || '-'}
                    </span>
                  </div>
                  <Icon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                </div>

                <div className="mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between w-full">
                  <span
                    className={`text-xs font-extrabold tabular-nums truncate ${
                      acc.group_type === 'paylater'
                        ? 'text-amber-700'
                        : acc.group_type === 'tabungan'
                        ? 'text-blue-700'
                        : 'text-[#1E6B4F]'
                    }`}
                  >
                    {formatRupiah(acc.current_balance, privacyMode)}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold border ${groupColor}`}>
                    {groupBadge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* TRANSACTIONS TABLE DENGAN FILTER DI SETIAP KOLOM */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table summary bar */}
        <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-semibold text-slate-700">Tabel Transaksi Harian</span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-500">
              Menampilkan <strong className="text-slate-900">{filteredTransactions.length}</strong> dari {transactions.length} transaksi
            </span>
            {selectedDashboardAccount && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                Difilter Akun: {accounts.find((a) => a.id === selectedDashboardAccount)?.name}
              </span>
            )}
          </div>

          {isAnyFilterActive && (
            <button
              onClick={resetAllFilters}
              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Semua Filter</span>
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              {/* ROW 1: HEADER JUDUL KOLOM */}
              <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 font-bold">
                <th
                  onClick={() => {
                    if (sortField === 'date') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortField('date');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-2.5 px-3 whitespace-nowrap cursor-pointer hover:text-[#1E6B4F]"
                  style={{ minWidth: '150px' }}
                >
                  <div className="flex items-center gap-1">
                    <span>Tanggal</span>
                    {sortField === 'date' && (
                      <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap" style={{ minWidth: '130px' }}>
                  Tipe
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap" style={{ minWidth: '150px' }}>
                  Sub Kategori
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap" style={{ minWidth: '130px' }}>
                  Sumber
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap" style={{ minWidth: '130px' }}>
                  Tujuan
                </th>
                <th
                  onClick={() => {
                    if (sortField === 'amount') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    else {
                      setSortField('amount');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-2.5 px-3 whitespace-nowrap text-right cursor-pointer hover:text-[#1E6B4F]"
                  style={{ minWidth: '140px' }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Nominal</span>
                    {sortField === 'amount' && (
                      <span className="text-[10px]">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap" style={{ minWidth: '160px' }}>
                  Keterangan
                </th>
                <th className="py-2.5 px-3 whitespace-nowrap text-center" style={{ minWidth: '80px' }}>
                  Aksi
                </th>
              </tr>

              {/* ROW 2: IN-COLUMN FILTER ROW UNTUK SETIAP KOLOM */}
              <tr className="bg-slate-50/90 border-b border-slate-200">
                {/* 1. Filter Tanggal (1 Inputan dengan Popover Date Picker Start & End Date) */}
                <th className="p-2 align-top font-normal relative">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleOpenDatePopover}
                      className={`w-full px-2 py-1.5 text-[11px] rounded-lg border flex items-center justify-between gap-1 transition-all text-left ${
                        filterStartDate || filterEndDate
                          ? 'border-[#1E6B4F] bg-emerald-50/80 text-[#1E6B4F] font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/70 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <Calendar
                          className={`w-3.5 h-3.5 shrink-0 ${
                            filterStartDate || filterEndDate ? 'text-[#1E6B4F]' : 'text-slate-400'
                          }`}
                        />
                        <span className="truncate">{dateFilterLabel}</span>
                      </div>
                      {filterStartDate || filterEndDate ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetDate();
                          }}
                          className="p-0.5 hover:bg-emerald-200/70 rounded text-emerald-800 shrink-0"
                          title="Hapus filter tanggal"
                        >
                          <X className="w-3 h-3" />
                        </span>
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {/* Popover Dropdown Date Picker (Start & End Date) */}
                    {showDatePopover && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setShowDatePopover(false)}
                        />
                        <div className="absolute top-full left-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 w-72 text-slate-800 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-[#1E6B4F]" />
                              Rentang Tanggal
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowDatePopover(false)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick Presets */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Pilihan Cepat
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  const today = toISODate();
                                  setTempStartDate(today);
                                  setTempEndDate(today);
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left"
                              >
                                Hari Ini
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const now = new Date();
                                  const y = now.getFullYear();
                                  const m = String(now.getMonth() + 1).padStart(2, '0');
                                  const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
                                  setTempStartDate(`${y}-${m}-01`);
                                  setTempEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left"
                              >
                                Bulan Ini
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const now = new Date();
                                  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                  const y = lastMonth.getFullYear();
                                  const m = String(lastMonth.getMonth() + 1).padStart(2, '0');
                                  const lastDay = new Date(y, lastMonth.getMonth() + 1, 0).getDate();
                                  setTempStartDate(`${y}-${m}-01`);
                                  setTempEndDate(`${y}-${m}-${String(lastDay).padStart(2, '0')}`);
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left"
                              >
                                Bulan Lalu
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const y = new Date().getFullYear();
                                  setTempStartDate(`${y}-01-01`);
                                  setTempEndDate(`${y}-12-31`);
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left"
                              >
                                Tahun Ini
                              </button>
                            </div>
                          </div>

                          {/* Custom Start & End Date Inputs */}
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Tanggal Mulai (Start Date)
                              </label>
                              <input
                                type="date"
                                value={tempStartDate}
                                onChange={(e) => setTempStartDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B4F]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Tanggal Selesai (End Date)
                              </label>
                              <input
                                type="date"
                                value={tempEndDate}
                                onChange={(e) => setTempEndDate(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B4F]"
                              />
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={handleResetDate}
                              className="text-[11px] text-rose-600 hover:underline font-semibold"
                            >
                              Reset
                            </button>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setShowDatePopover(false)}
                                className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={handleApplyDate}
                                className="px-3.5 py-1 text-[11px] font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-lg shadow-2xs"
                              >
                                Terapkan
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </th>

                {/* 2. Filter Tipe */}
                <th className="p-2 align-top font-normal">
                  <select
                    value={filterType}
                    onChange={(e) => {
                      setFilterType(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-1.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B4F]"
                  >
                    <option value="all">Semua Tipe</option>
                    {transactionTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </th>

                {/* 3. Filter Sub Kategori (Dikelompokkan per Kategori Induk) */}
                <th className="p-2 align-top font-normal">
                  <select
                    value={filterSubCategory}
                    onChange={(e) => {
                      setFilterSubCategory(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full px-1.5 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B4F]"
                  >
                    <option value="all">Semua Sub Kategori</option>
                    {categories.map((cat) => {
                      const subs = subCategories.filter(
                        (s) => s.category_id === cat.id && s.is_active
                      );
                      if (subs.length === 0) return null;
                      return (
                        <optgroup key={cat.id} label={cat.name}>
                          {subs.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </th>

                {/* 4. Filter Sumber */}
                <th className="p-2 align-top font-normal">
                  <input
                    type="text"
                    value={filterSource}
                    onChange={(e) => {
                      setFilterSource(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Filter sumber..."
                    className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B4F]"
                  />
                </th>

                {/* 5. Filter Tujuan */}
                <th className="p-2 align-top font-normal">
                  <input
                    type="text"
                    value={filterDestination}
                    onChange={(e) => {
                      setFilterDestination(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Filter tujuan..."
                    className="w-full px-2 py-1.5 text-[11px] border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B4F]"
                  />
                </th>

                {/* 6. Filter Nominal (1 Inputan dengan Dropdown Min & Max) */}
                <th className="p-2 align-top font-normal relative">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={handleOpenNominalPopover}
                      className={`w-full px-2 py-1.5 text-[11px] rounded-lg border flex items-center justify-between gap-1 transition-all text-left ${
                        filterMinAmount || filterMaxAmount
                          ? 'border-[#1E6B4F] bg-emerald-50/80 text-[#1E6B4F] font-bold shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50/70 font-medium'
                      }`}
                    >
                      <span className="truncate">{nominalFilterLabel}</span>
                      {filterMinAmount || filterMaxAmount ? (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetNominal();
                          }}
                          className="p-0.5 hover:bg-emerald-200/70 rounded text-emerald-800 shrink-0"
                          title="Hapus filter nominal"
                        >
                          <X className="w-3 h-3" />
                        </span>
                      ) : (
                        <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                    </button>

                    {/* Popover Dropdown Min & Max Nominal */}
                    {showNominalPopover && (
                      <>
                        <div
                          className="fixed inset-0 z-30"
                          onClick={() => setShowNominalPopover(false)}
                        />
                        <div className="absolute top-full right-0 mt-1 z-40 bg-white rounded-xl shadow-xl border border-slate-200 p-3.5 w-72 text-slate-800 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                            <span className="text-xs font-bold text-slate-800">
                              Filter Nominal (Min & Max)
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowNominalPopover(false)}
                              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Quick Presets */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                              Pilihan Cepat
                            </span>
                            <div className="grid grid-cols-2 gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setTempMinAmount('');
                                  setTempMaxAmount('100.000');
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left"
                              >
                                &lt; Rp100.000
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTempMinAmount('100.000');
                                  setTempMaxAmount('500.000');
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left"
                              >
                                100rb - 500rb
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTempMinAmount('500.000');
                                  setTempMaxAmount('2.000.000');
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left"
                              >
                                500rb - 2 Juta
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setTempMinAmount('2.000.000');
                                  setTempMaxAmount('');
                                }}
                                className="px-2 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left"
                              >
                                &gt; Rp2.000.000
                              </button>
                            </div>
                          </div>

                          {/* Custom Min & Max Inputs */}
                          <div className="space-y-2 pt-1 border-t border-slate-100">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Nominal Minimal (Min)
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-bold text-slate-400">
                                  Rp
                                </span>
                                <input
                                  type="text"
                                  value={tempMinAmount}
                                  onChange={(e) => setTempMinAmount(formatNumberOnly(e.target.value))}
                                  placeholder="0"
                                  className="w-full pl-8 pr-2.5 py-1.5 text-xs text-right font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B4F]"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                                Nominal Maksimal (Max)
                              </label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-xs font-bold text-slate-400">
                                  Rp
                                </span>
                                <input
                                  type="text"
                                  value={tempMaxAmount}
                                  onChange={(e) => setTempMaxAmount(formatNumberOnly(e.target.value))}
                                  placeholder="Tak terbatas"
                                  className="w-full pl-8 pr-2.5 py-1.5 text-xs text-right font-mono border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B4F]"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={handleResetNominal}
                              className="text-[11px] text-rose-600 hover:underline font-semibold"
                            >
                              Reset
                            </button>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setShowNominalPopover(false)}
                                className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                              >
                                Batal
                              </button>
                              <button
                                type="button"
                                onClick={handleApplyNominal}
                                className="px-3.5 py-1 text-[11px] font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-lg shadow-2xs"
                              >
                                Terapkan
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </th>

                {/* 7. Filter Keterangan */}
                <th className="p-2 align-top font-normal">
                  <input
                    type="text"
                    value={filterDescription}
                    onChange={(e) => {
                      setFilterDescription(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Cari keterangan..."
                    className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-[#1E6B4F]"
                  />
                </th>

                {/* 8. Reset Button */}
                <th className="p-2 align-top text-center font-normal">
                  {isAnyFilterActive ? (
                    <button
                      onClick={resetAllFilters}
                      title="Reset semua filter kolom"
                      className="px-2 py-1 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[10px] transition-colors"
                    >
                      Reset
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">-</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => {
                  const isIncome = tx.type_kind === 'income';
                  const isExpense = tx.type_kind === 'expense';
                  const isTransfer = tx.type_kind === 'transfer';

                  const monthStr = tx.tx_date.slice(0, 7);
                  const isExceeded = tx.sub_category_id ? exceededCache.get(`${monthStr}_${tx.sub_category_id}`) : false;

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Tanggal */}
                      <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-700">
                        {formatDateID(tx.tx_date)}
                      </td>

                      {/* Tipe Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isIncome
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isExpense
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}
                        >
                          {tx.type_name}
                        </span>
                      </td>

                      {/* Sub Kategori + Limit Flag Badge */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: tx.sub_category_color || '#94a3b8' }}
                          />
                          <span className="font-semibold text-slate-800">
                            {tx.sub_category_name || '-'}
                          </span>
                          {isExceeded && (
                            <span
                              title="Sub kategori ini melebihi limit anggaran kuartal pada bulan tersebut"
                              className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500 text-white"
                            >
                              Melebihi Limit
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sumber */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {tx.source_name}
                      </td>

                      {/* Tujuan */}
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {tx.destination_name}
                      </td>

                      {/* Nominal */}
                      <td
                        className={`py-3 px-4 text-right font-bold tabular-nums whitespace-nowrap ${
                          isIncome ? 'text-emerald-700' : isExpense ? 'text-rose-700' : 'text-blue-700'
                        }`}
                      >
                        {isIncome ? '+' : isExpense ? '-' : ''}
                        {formatRupiah(tx.amount, privacyMode)}
                      </td>

                      {/* Keterangan */}
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                        {tx.description || '-'}
                      </td>

                      {/* Aksi */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDuplicate(tx)}
                            title="Duplikat Transaksi"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(tx)}
                            title="Edit Transaksi"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingId(tx.id)}
                            title="Hapus Transaksi"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <ReceiptText className="w-8 h-8 text-slate-300" />
                      <p className="font-medium text-slate-600">
                        {transactions.length === 0
                          ? 'Belum ada data transaksi tercatat di database.'
                          : 'Tidak ada transaksi yang cocok dengan filter pencarian.'}
                      </p>
                      {transactions.length === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            resetForm();
                            setFormModalOpen(true);
                          }}
                          className="mt-1 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#1E6B4F] text-white hover:bg-[#16523c] transition-colors"
                        >
                          + Catat Transaksi Baru
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div>
            Halaman {currentPage} dari {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
      <button
        onClick={() => {
          resetForm();
          setFormModalOpen(true);
        }}
        className="lg:hidden fixed bottom-20 right-5 z-40 w-12 h-12 rounded-full bg-[#1E6B4F] text-white shadow-lg shadow-emerald-950/20 flex items-center justify-center hover:bg-[#16523c] active:scale-95 transition-all"
        title="Tambah Transaksi Cepat"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* FORM MODAL (Mobile + Edit Modal) */}
      {formModalOpen && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setFormModalOpen(false);
          }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingTxId ? 'Edit Transaksi' : 'Tambah Transaksi Baru'}
              </h3>
              <button
                onClick={() => setFormModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipe Transaksi
                  </label>
                  <select
                    value={selectedTypeId}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  >
                    {transactionTypes
                      .filter((t) => t.is_active)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kategori
                  </label>
                  <select
                    value={selectedCatId}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  >
                    <option value="">-- Pilih --</option>
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
                    <option value="">-- Pilih --</option>
                    {availableSubCategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Sumber & Tujuan */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {activeType?.kind === 'income' ? 'Pihak Sumber (Income)' : 'Sumber Saldo Akun'}
                </label>
                {activeType?.kind === 'income' ? (
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
                ) : (
                  <select
                    required
                    value={sourceAccountId}
                    onChange={(e) => setSourceAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  >
                    <option value="">-- Pilih Akun Sumber --</option>
                    {accounts
                      .filter((a) => a.is_active)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (Saldo: {formatRupiah(a.current_balance, privacyMode)})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {activeType?.kind === 'expense' ? 'Pihak Tujuan (Expense)' : 'Saldo Tujuan Akun'}
                </label>
                {activeType?.kind === 'expense' ? (
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
                ) : (
                  <select
                    required
                    value={destinationAccountId}
                    onChange={(e) => setDestinationAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  >
                    <option value="">-- Pilih Akun Tujuan --</option>
                    {accounts
                      .filter((a) => a.is_active && (activeType?.kind !== 'transfer' || a.id !== sourceAccountId))
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} (Saldo: {formatRupiah(a.current_balance, privacyMode)})
                        </option>
                      ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nominal Transaksi (Rp)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                    Rp
                  </span>
                  <input
                    type="text"
                    required
                    value={nominalDisplay}
                    onChange={(e) => setNominalDisplay(formatNumberOnly(e.target.value))}
                    placeholder="0"
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Keterangan
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Catatan transaksi..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setFormModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs"
                >
                  {editingTxId ? 'Simpan Perubahan' : 'Simpan Transaksi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OVERBALANCE CONFIRMATION MODAL */}
      {overbalanceWarning && overbalanceWarning.show && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">
                Peringatan: Saldo Akun Tidak Mencukupi
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Pengeluaran sebesar{' '}
              <strong className="text-slate-900 font-bold">
                {formatRupiah(overbalanceWarning.amount, privacyMode)}
              </strong>{' '}
              melebihi saldo akun{' '}
              <strong className="text-slate-900">{overbalanceWarning.accountName}</strong> yang saat
              ini hanya{' '}
              <strong className="text-rose-600">
                {formatRupiah(overbalanceWarning.currentBalance, privacyMode)}
              </strong>
              .
            </p>
            <p className="text-[11px] text-slate-500">
              Apakah Anda ingin tetap menyimpan transaksi ini? (Saldo akun akan menjadi negatif).
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setOverbalanceWarning(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setOverbalanceWarning(null);
                  executeSave();
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
              >
                Tetap Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2.5 text-rose-600">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-slate-900 text-sm">Hapus Transaksi?</h3>
            </div>
            <p className="text-xs text-slate-600">
              Tindakan ini akan menghapus catatan transaksi dan mengembalikan mutasi saldo akun terkait.
            </p>

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
