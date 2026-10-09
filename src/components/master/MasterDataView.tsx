import React, { useState } from 'react';
import {
  Layers,
  Tag,
  ListTree,
  Building,
  Users,
  Settings,
  ShieldCheck,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  KeyRound,
  UserCheck,
  UserX,
  Lock,
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  AlertTriangle,
  Copy,
  Check,
  ArrowRight,
  CalendarClock,
} from 'lucide-react';
import { SupabaseSetupView } from '../integration/SupabaseSetupView';
import { RecurringTransactionsView } from './RecurringTransactionsView';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../layout/NotificationToast';
import { getSupabaseConfig } from '../../lib/supabase';
import {
  formatRupiah,
  formatNumberOnly,
  parseNumberFromInput,
} from '../../lib/formatters';
import type {
  TransactionType,
  Category,
  SubCategory,
  Account,
  FlowParty,
  AppUser,
  AccountGroup,
  PartyScope,
  TxKind,
} from '../../types';

export interface MasterDataViewProps {
  initialTab?: 'accounts' | 'sub_categories' | 'categories' | 'types' | 'parties' | 'users' | 'settings' | 'integrasi' | 'otomasi';
}

export function MasterDataView({ initialTab }: MasterDataViewProps = {}) {
  const { isSuperAdmin } = useAuth();
  const {
    transactionTypes,
    categories,
    subCategories,
    accounts,
    flowParties,
    recurringTransactions,
    settings,
    appUsers,
    privacyMode,
    saveTransactionType,
    deleteTransactionType,
    saveCategory,
    deleteCategory,
    saveSubCategory,
    deleteSubCategory,
    saveAccount,
    deleteAccount,
    saveFlowParty,
    deleteFlowParty,
    saveAppSettings,
    saveAppUser,
    toggleUserStatus,
    resetUserPassword,
    isSupabaseConnected,
    dbSyncError,
    refetchAll,
  } = useData();

  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'accounts' | 'sub_categories' | 'categories' | 'types' | 'parties' | 'users' | 'settings' | 'integrasi' | 'otomasi'
  >(initialTab || 'accounts');

  const [settingsSidebarCollapsed, setSettingsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('daily_cashflow_settings_sidebar_collapsed') === 'true';
  });

  const handleToggleSettingsSidebar = () => {
    setSettingsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('daily_cashflow_settings_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Generic modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  // 1. Transaction Type
  const [typeName, setTypeName] = useState('');
  const [typeKind, setTypeKind] = useState<TxKind>('expense');
  const [typeColor, setTypeColor] = useState('#1E6B4F');
  const [typeActive, setTypeActive] = useState(true);

  // 2. Category
  const [catName, setCatName] = useState('');
  const [catTypeId, setCatTypeId] = useState('');
  const [catColor, setCatColor] = useState('#999999');
  const [catActive, setCatActive] = useState(true);

  // 3. Sub Category
  const [subCatName, setSubCatName] = useState('');
  const [subCatCatId, setSubCatCatId] = useState('');
  const [subCatLimitDisplay, setSubCatLimitDisplay] = useState('');
  const [subCatColor, setSubCatColor] = useState('#999999');
  const [subCatActive, setSubCatActive] = useState(true);

  // 4. Account
  const [accName, setAccName] = useState('');
  const [accGroup, setAccGroup] = useState<AccountGroup>('bank');
  const [accPurpose, setAccPurpose] = useState('');
  const [accOwner, setAccOwner] = useState('Bersama');
  const [accSavingsGoal, setAccSavingsGoal] = useState('');
  const [accTargetDisplay, setAccTargetDisplay] = useState('');
  const [accOpeningDisplay, setAccOpeningDisplay] = useState('0');
  const [accSortOrder, setAccSortOrder] = useState('0');
  const [accActive, setAccActive] = useState(true);

  // 5. Flow Party
  const [partyName, setPartyName] = useState('');
  const [partyScope, setPartyScope] = useState<PartyScope>('income_source');
  const [partySortOrder, setPartySortOrder] = useState('0');
  const [partyActive, setPartyActive] = useState(true);

  // 6. User Management
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState<'superadmin' | 'user'>('user');
  const [userActive, setUserActive] = useState(true);

  // Reset User Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [newPasswordToReset, setNewPasswordToReset] = useState('');

  // Settings form
  const [emergencyAccId, setEmergencyAccId] = useState(settings.emergency_fund_account_id || '');
  const [runwayBasis, setRunwayBasis] = useState(String(settings.runway_months_basis || 3));

  // Reset form
  const resetForms = () => {
    setEditingId(null);
    setTypeName('');
    setTypeKind('expense');
    setTypeColor('#1E6B4F');
    setTypeActive(true);

    setCatName('');
    setCatTypeId(transactionTypes[0]?.id || '');
    setCatColor('#999999');
    setCatActive(true);

    setSubCatName('');
    setSubCatCatId(categories[0]?.id || '');
    setSubCatLimitDisplay('');
    setSubCatColor('#999999');
    setSubCatActive(true);

    setAccName('');
    setAccGroup('bank');
    setAccPurpose('');
    setAccOwner('Bersama');
    setAccSavingsGoal('');
    setAccTargetDisplay('');
    setAccOpeningDisplay('0');
    setAccSortOrder('0');
    setAccActive(true);

    setPartyName('');
    setPartyScope('income_source');
    setPartySortOrder('0');
    setPartyActive(true);

    setUserFullName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole('user');
    setUserActive(true);
  };

  const [isSyncingUsers, setIsSyncingUsers] = useState(false);
  const [copiedFixRls, setCopiedFixRls] = useState(false);
  const supabaseCfg = getSupabaseConfig();

  const handleSyncFromSupabase = async () => {
    setIsSyncingUsers(true);
    await refetchAll();
    setIsSyncingUsers(false);
    showToast('info', 'Sinkronisasi Selesai', 'Data pengguna telah diperbarui dari database.');
  };

  // Open modal for add
  const handleOpenAdd = () => {
    resetForms();
    setModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (tab: string, item: any) => {
    resetForms();
    setEditingId(item.id);

    if (tab === 'types') {
      setTypeName(item.name);
      setTypeKind(item.kind);
      setTypeColor(item.color || '#1E6B4F');
      setTypeActive(item.is_active ?? true);
    } else if (tab === 'categories') {
      setCatName(item.name);
      setCatTypeId(item.transaction_type_id);
      setCatColor(item.color || '#999999');
      setCatActive(item.is_active ?? true);
    } else if (tab === 'sub_categories') {
      setSubCatName(item.name);
      setSubCatCatId(item.category_id);
      setSubCatLimitDisplay(item.default_limit ? formatNumberOnly(item.default_limit) : '');
      setSubCatColor(item.color || '#999999');
      setSubCatActive(item.is_active ?? true);
    } else if (tab === 'accounts') {
      setAccName(item.name);
      setAccGroup(item.group_type);
      setAccPurpose(item.purpose || '');
      setAccOwner(item.owner_label || 'Bersama');
      setAccSavingsGoal(item.savings_goal_name || '');
      setAccTargetDisplay(item.target_amount ? formatNumberOnly(item.target_amount) : '');
      setAccOpeningDisplay(formatNumberOnly(item.opening_balance || 0));
      setAccSortOrder(String(item.sort_order || 0));
      setAccActive(item.is_active ?? true);
    } else if (tab === 'parties') {
      setPartyName(item.name);
      setPartyScope(item.scope);
      setPartySortOrder(String(item.sort_order || 0));
      setPartyActive(item.is_active ?? true);
    } else if (tab === 'users') {
      setUserFullName(item.full_name);
      setUserEmail(item.email);
      setUserRole(item.role);
      setUserActive(item.is_active ?? true);
    }

    setModalOpen(true);
  };

  // Handle submit modal
  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSuperAdmin) {
      showToast('error', 'Hanya superadmin yang boleh mengubah master data');
      return;
    }

    if (activeTab === 'types') {
      const res = await saveTransactionType({
        id: editingId || undefined,
        name: typeName.trim(),
        kind: typeKind,
        color: typeColor,
        is_active: typeActive,
      });
      if (res.success) {
        showToast('success', 'Tipe Transaksi Berhasil Disimpan');
        setModalOpen(false);
      } else {
        showToast('error', 'Gagal menyimpan tipe transaksi', res.error);
      }
    } else if (activeTab === 'categories') {
      const res = await saveCategory({
        id: editingId || undefined,
        name: catName.trim(),
        transaction_type_id: catTypeId,
        color: catColor,
        is_active: catActive,
      });
      if (res.success) {
        showToast('success', 'Kategori Berhasil Disimpan');
        setModalOpen(false);
      } else {
        showToast('error', 'Gagal menyimpan kategori', res.error);
      }
    } else if (activeTab === 'sub_categories') {
      const defLimit = subCatLimitDisplay ? parseNumberFromInput(subCatLimitDisplay) : null;
      const res = await saveSubCategory({
        id: editingId || undefined,
        name: subCatName.trim(),
        category_id: subCatCatId,
        default_limit: defLimit,
        color: subCatColor,
        is_active: subCatActive,
      });
      if (res.success) {
        showToast('success', 'Sub Kategori Berhasil Disimpan');
        setModalOpen(false);
      } else {
        showToast('error', 'Gagal menyimpan sub kategori', res.error);
      }
    } else if (activeTab === 'accounts') {
      const targetAmt = accTargetDisplay ? parseNumberFromInput(accTargetDisplay) : null;
      const opening = parseNumberFromInput(accOpeningDisplay);
      const res = await saveAccount({
        id: editingId || undefined,
        name: accName.trim(),
        group_type: accGroup,
        purpose: accPurpose.trim() || null,
        owner_label: accOwner.trim() || null,
        savings_goal_name: accGroup === 'tabungan' ? accSavingsGoal.trim() || null : null,
        target_amount: accGroup === 'tabungan' ? targetAmt : null,
        opening_balance: opening,
        sort_order: parseInt(accSortOrder, 10) || 0,
        is_active: accActive,
      });
      if (res.success) {
        showToast('success', 'Rekening Berhasil Disimpan');
        setModalOpen(false);
      } else {
        showToast('error', 'Gagal menyimpan rekening', res.error);
      }
    } else if (activeTab === 'parties') {
      const res = await saveFlowParty({
        id: editingId || undefined,
        name: partyName.trim(),
        scope: partyScope,
        sort_order: parseInt(partySortOrder, 10) || 0,
        is_active: partyActive,
      });
      if (res.success) {
        showToast('success', 'Pihak Berhasil Disimpan');
        setModalOpen(false);
      } else {
        showToast('error', 'Gagal menyimpan pihak', res.error);
      }
    } else if (activeTab === 'users') {
      if (!editingId && (!userPassword || userPassword.length < 6)) {
        showToast('error', 'Password minimal 6 karakter');
        return;
      }
      const res = await saveAppUser({
        id: editingId || undefined,
        full_name: userFullName.trim(),
        email: userEmail.trim(),
        password: userPassword ? userPassword.trim() : undefined,
        role: userRole,
        is_active: userActive,
      });
      if (res.success) {
        showToast('success', editingId ? 'User Berhasil Diperbarui' : 'User Baru Berhasil Dibuat');
        setModalOpen(false);
      } else {
        showToast('error', 'Gagal menyimpan user', res.error);
      }
    }
  };

  // Handle Delete Master Data
  const handleDelete = async (tab: string, id: string) => {
    if (!isSuperAdmin) {
      showToast('error', 'Hanya superadmin yang boleh menghapus master data');
      return;
    }

    if (confirm('Yakin ingin menghapus master data ini? Jika sudah pernah dipakai pada transaksi, data akan dinonaktifkan secara aman.')) {
      let res: { success: boolean; error?: string } = { success: false };

      if (tab === 'types') res = await deleteTransactionType(id);
      else if (tab === 'categories') res = await deleteCategory(id);
      else if (tab === 'sub_categories') res = await deleteSubCategory(id);
      else if (tab === 'accounts') res = await deleteAccount(id);
      else if (tab === 'parties') res = await deleteFlowParty(id);

      if (res.success) {
        showToast('success', 'Data berhasil dihapus');
      } else {
        showToast('warning', 'Pemberitahuan', res.error);
      }
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) return;

    const res = await saveAppSettings({
      emergency_fund_account_id: emergencyAccId || null,
      runway_months_basis: parseInt(runwayBasis, 10) || 3,
    });

    if (res.success) {
      showToast('success', 'Pengaturan Berhasil Disimpan');
    } else {
      showToast('error', 'Gagal menyimpan pengaturan', res.error);
    }
  };

  // Reset Password for a user
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId) return;
    if (newPasswordToReset.length < 6) {
      showToast('error', 'Password baru minimal 6 karakter');
      return;
    }

    const res = await resetUserPassword(targetUserId, newPasswordToReset);
    if (res.success) {
      showToast('success', 'Password User Berhasil Direset');
      setResetModalOpen(false);
      setNewPasswordToReset('');
    } else {
      showToast('error', 'Gagal mereset password', res.error);
    }
  };

  // Definisi menu tab pengaturan (Sidebar di Desktop, Tab bar di Mobile)
  const tabItems = [
    {
      id: 'accounts',
      label: 'Rekening',
      icon: Building,
      count: accounts.length,
      description: 'Daftar rekening bank, dompet kas, tabungan, dan paylater keluarga',
    },
    {
      id: 'sub_categories',
      label: 'Sub Kategori & Limit',
      icon: ListTree,
      count: subCategories.length,
      description: 'Sub kategori pengeluaran/pemasukan dan limit anggaran bulanan default',
    },
    {
      id: 'categories',
      label: 'Kategori',
      icon: Tag,
      count: categories.length,
      description: 'Kategori induk transaksi yang mengelompokkan sub kategori',
    },
    {
      id: 'types',
      label: 'Tipe Transaksi',
      icon: Layers,
      count: transactionTypes.length,
      description: 'Klasifikasi arus kas: Income (Pemasukan), Expense (Pengeluaran), dan Transfer',
    },
    {
      id: 'parties',
      label: 'Pihak Sumber / Tujuan',
      icon: Users,
      count: flowParties.length,
      description: 'Pihak luar sumber pemasukan atau tujuan pembayaran',
    },
    {
      id: 'otomasi',
      label: 'Otomasi Transaksi',
      icon: CalendarClock,
      count: recurringTransactions.length,
      description: 'Jadwal otomatis buat transaksi rutin harian / tiap tanggal tertentu beserta jam & nominal susulan',
    },
    {
      id: 'settings',
      label: 'Pengaturan Umum',
      icon: Settings,
      description: 'Konfigurasi rekening dana darurat dan basis runway bulan',
    },
    ...(isSuperAdmin
      ? [
          {
            id: 'users',
            label: 'Kelola Pengguna',
            icon: ShieldCheck,
            count: appUsers.length,
            description: 'Manajemen akun pengguna login dan hak akses keluarga',
          },
          {
            id: 'integrasi',
            label: 'Integrasi Database',
            icon: Database,
            description: 'Koneksi Supabase & panduan eksekusi migrasi skema tabel',
          },
        ]
      : []),
  ];

  const currentTabInfo = tabItems.find((t) => t.id === activeTab) || tabItems[0];

  return (
    <div className="w-full max-w-[1680px] mx-auto px-2.5 sm:px-4 lg:px-6 py-4 space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Pengaturan Master Data & Rekening
          </h1>
          <p className="text-xs text-slate-500">
            {isSuperAdmin
              ? 'Kelola daftar rekening keuangan, kategori, limit default bulanan, pihak aliran kas, dan pengguna.'
              : 'Melihat konfigurasi master data (Akses edit dibatasi hanya untuk Superadmin).'}
          </p>
        </div>
      </div>

      {/* MOBILE TABS NAVIGATION (Hanya tampil di mobile < md) */}
      <div className="md:hidden flex overflow-x-auto gap-1 p-1 bg-slate-100 rounded-xl max-w-full">
        {tabItems.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                isActive ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TWO-COLUMN LAYOUT: SIDEBAR (DESKTOP) + CONTENT */}
      <div className="flex flex-col md:flex-row items-start gap-4 sm:gap-5">
        {/* SETTINGS SIDEBAR (Desktop: Collapsible Icon-Only or Full) */}
        <aside
          className={`hidden md:block ${
            settingsSidebarCollapsed ? 'w-16 p-2' : 'w-60 lg:w-64 p-3'
          } shrink-0 bg-white rounded-2xl border border-slate-200 shadow-2xs transition-[width] duration-200 select-none`}
        >
          <div
            className={`pb-2 border-b border-slate-100 mb-2 flex items-center ${
              settingsSidebarCollapsed ? 'justify-center' : 'justify-between px-2'
            }`}
          >
            {!settingsSidebarCollapsed && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Menu Pengaturan
              </span>
            )}
            <button
              type="button"
              onClick={handleToggleSettingsSidebar}
              title={settingsSidebarCollapsed ? 'Perluas Menu Pengaturan' : 'Ciutkan Menu (Hanya Icon)'}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {settingsSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-[#1E6B4F]" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          <nav className="space-y-1">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  title={settingsSidebarCollapsed ? `${tab.label}${tab.count !== undefined ? ` (${tab.count})` : ''}` : undefined}
                  className={`relative w-full flex items-center ${
                    settingsSidebarCollapsed
                      ? 'justify-center p-2.5 rounded-xl'
                      : 'justify-between px-3 py-2 rounded-xl text-xs font-semibold'
                  } transition-all text-left ${
                    isActive
                      ? 'bg-[#1E6B4F]/10 text-[#1E6B4F] font-bold border border-[#1E6B4F]/20 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                  }`}
                >
                  <div className={`flex items-center ${settingsSidebarCollapsed ? 'justify-center' : 'gap-2.5 min-w-0'}`}>
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#1E6B4F]' : 'text-slate-500'}`} />
                    {!settingsSidebarCollapsed && <span className="truncate">{tab.label}</span>}
                  </div>
                  {tab.count !== undefined && (
                    settingsSidebarCollapsed ? (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#1E6B4F]" />
                    ) : (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                          isActive ? 'bg-[#1E6B4F]/20 text-[#1E6B4F]' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* SETTINGS CONTENT (Right Column) */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          {/* ACTIVE TAB INFO HEADER CARD */}
          <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                {currentTabInfo && <currentTabInfo.icon className="w-4 h-4 text-[#1E6B4F]" />}
                {currentTabInfo?.label}
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {currentTabInfo?.description}
              </p>
            </div>

            {isSuperAdmin && activeTab !== 'settings' && activeTab !== 'integrasi' && activeTab !== 'otomasi' && (
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-[#1E6B4F] hover:bg-[#16523c] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {activeTab === 'accounts'
                    ? 'Tambah Rekening'
                    : activeTab === 'users'
                    ? 'Tambah User Baru'
                    : 'Tambah Data Baru'}
                </span>
              </button>
            )}
          </div>

          {/* READ-ONLY BANNER FOR REGULAR USERS */}
          {!isSuperAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>
                Anda masuk sebagai <strong>User Keluarga</strong>. Hak akses Anda adalah melihat data. Penambahan dan pengubahan master data dikelola oleh Superadmin.
              </span>
            </div>
          )}

          {/* TAB 1: ACCOUNTS / REKENING */}
          {activeTab === 'accounts' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                      <th className="py-3 px-4">Nama Rekening</th>
                      <th className="py-3 px-4">Grup Rekening</th>
                      <th className="py-3 px-4">Pemilik</th>
                      <th className="py-3 px-4">Catatan / Peruntukan</th>
                      <th className="py-3 px-4 text-right">Saldo Awal</th>
                      <th className="py-3 px-4 text-right">Saldo Saat Ini</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      {isSuperAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                    </tr>
                  </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {acc.name}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-600 font-medium">
                      {acc.group_type}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {acc.owner_label || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {acc.group_type === 'tabungan' && acc.savings_goal_name
                        ? `Target: ${acc.savings_goal_name} (${formatRupiah(acc.target_amount, privacyMode)})`
                        : acc.purpose || '-'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-700 tabular-nums">
                      {formatRupiah(acc.opening_balance, privacyMode)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-[#1E6B4F] tabular-nums">
                      {formatRupiah(acc.current_balance, privacyMode)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          acc.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {acc.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit('accounts', acc)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete('accounts', acc.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SUB CATEGORIES */}
      {activeTab === 'sub_categories' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Nama Sub Kategori</th>
                  <th className="py-3 px-4">Kategori Induk</th>
                  <th className="py-3 px-4 text-right">Default Limit Bulanan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isSuperAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subCategories.map((sub) => {
                  const cat = categories.find((c) => c.id === sub.category_id);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: sub.color || '#999' }}
                        />
                        <span>{sub.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {cat?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-800 tabular-nums">
                        {sub.default_limit !== null && sub.default_limit !== undefined
                          ? formatRupiah(sub.default_limit, privacyMode)
                          : 'Tanpa Limit'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            sub.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {sub.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit('sub_categories', sub)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete('sub_categories', sub.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
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
        </div>
      )}

      {/* TAB 3: CATEGORIES */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Nama Kategori</th>
                  <th className="py-3 px-4">Tipe Transaksi</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isSuperAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => {
                  const type = transactionTypes.find((t) => t.id === cat.transaction_type_id);
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color || '#999' }}
                        />
                        <span>{cat.name}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {type?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            cat.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {cat.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleOpenEdit('categories', cat)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete('categories', cat.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
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
        </div>
      )}

      {/* TAB 4: TRANSACTION TYPES */}
      {activeTab === 'types' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Nama Tipe</th>
                  <th className="py-3 px-4">Kind (Logika Arus Saldo)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isSuperAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactionTypes.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: t.color || '#1E6B4F' }}
                      />
                      <span>{t.name}</span>
                    </td>
                    <td className="py-3 px-4 uppercase font-semibold text-slate-600">
                      {t.kind}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          t.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {t.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit('types', t)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete('types', t.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: FLOW PARTIES */}
      {activeTab === 'parties' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Nama Pihak</th>
                  <th className="py-3 px-4">Scope</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isSuperAdmin && <th className="py-3 px-4 text-center">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flowParties.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {p.name}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                          p.scope === 'income_source'
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {p.scope === 'income_source' ? 'Pihak Sumber (Income)' : 'Pihak Tujuan (Expense)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          p.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {p.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    {isSuperAdmin && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleOpenEdit('parties', p)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete('parties', p.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SETTINGS UMUM */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs max-w-xl space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Pengaturan Kalkulasi Dashboard
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Akun Dana Darurat (Digunakan untuk rasio Hidup Tanpa Gaji)
              </label>
              <select
                disabled={!isSuperAdmin}
                value={emergencyAccId}
                onChange={(e) => setEmergencyAccId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] disabled:bg-slate-50"
              >
                <option value="">-- Pilih Akun Tabungan Darurat --</option>
                {accounts
                  .filter((a) => a.is_active && a.group_type === 'tabungan')
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Basis Rata-rata Pengeluaran (Bulan Terakhir)
              </label>
              <input
                type="number"
                min="1"
                max="12"
                disabled={!isSuperAdmin}
                value={runwayBasis}
                onChange={(e) => setRunwayBasis(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] disabled:bg-slate-50"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Berapa bulan pengeluaran ke belakang yang dijadikan acuan perhitungan rata-rata pengeluaran bulanan (standar: 3 bulan).
              </p>
            </div>

            {isSuperAdmin && (
              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs transition-colors"
                >
                  Simpan Pengaturan
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* TAB 7: USER MANAGEMENT (SUPERADMIN ONLY) */}
      {activeTab === 'users' && isSuperAdmin && (
        <div className="space-y-4">
          {/* Status Integrasi Supabase Banner */}
          {!isSupabaseConnected ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-amber-950">
                      Database Supabase Belum Terhubung di Browser Ini
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                      Sistem saat ini berjalan dalam mode offline lokal sehingga hanya mendeteksi 1 akun simulasi. Tiga akun yang ada di database Supabase Anda belum dapat dibaca.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('integrasi')}
                  className="px-3.5 py-2 bg-[#1E6B4F] hover:bg-[#16523c] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 shadow-xs cursor-pointer self-start sm:self-auto"
                >
                  <span>Hubungkan Supabase</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="text-xs font-bold text-emerald-900">
                    Terhubung ke Database Supabase:
                  </span>
                  <span className="text-xs font-mono text-emerald-700 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                    {supabaseCfg ? new URL(supabaseCfg.url).hostname : 'Supabase Cloud'}
                  </span>
                  <span className="text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                    {appUsers.length} akun terdeteksi di sistem
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSyncFromSupabase}
                  disabled={isSyncingUsers}
                  className="px-3 py-1.5 bg-white hover:bg-emerald-100/60 text-[#1E6B4F] border border-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-2xs self-start sm:self-auto"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingUsers ? 'animate-spin' : ''}`} />
                  <span>{isSyncingUsers ? 'Menyinkronkan...' : 'Sinkronkan Ulang dari Supabase'}</span>
                </button>
              </div>

              {/* Notice jika jumlah akun di Supabase dashboard berbeda dengan yang terdeteksi */}
              {appUsers.length < 3 && (
                <div className="pt-2 border-t border-emerald-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="text-amber-800 text-[11px] leading-relaxed">
                    <strong>Pemberitahuan:</strong> Jika di Dashboard Supabase terdapat 3 akun tapi di sini hanya terbaca {appUsers.length} akun, jalankan query perbaikan RLS & sync akun di Supabase SQL Editor.
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const query = `ALTER TABLE public.app_users DISABLE ROW LEVEL SECURITY;\nGRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;\nINSERT INTO public.app_users (id, full_name, email, password_hash, role, is_active)\nSELECT id, coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), email, '$2b$10$aWvqMAMsSCJR5id.2LHOq.3oLx.8UWxBgi3cOrTGgRh/H7xY0uEIe', 'superadmin', true FROM auth.users ON CONFLICT (email) DO UPDATE SET is_active = true;`;
                      navigator.clipboard.writeText(query);
                      setCopiedFixRls(true);
                      setTimeout(() => setCopiedFixRls(false), 2500);
                      showToast('info', 'Query Disalin', 'Jalankan query ini di Supabase SQL Editor lalu klik Sinkronkan Ulang.');
                    }}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-medium text-[11px] rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedFixRls ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedFixRls ? 'Tersalin!' : 'Salin Query Fix RLS & Auth (1-Klik)'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {dbSyncError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{dbSyncError}</span>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Nama Pengguna</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Aksi Superadmin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {appUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {u.full_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {u.email}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.role === 'superadmin'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          u.is_active ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {u.is_active ? 'Aktif' : 'Dinonaktifkan'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Role/Nama */}
                        <button
                          onClick={() => handleOpenEdit('users', u)}
                          title="Ubah Data User"
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setTargetUserId(u.id);
                            setNewPasswordToReset('');
                            setResetModalOpen(true);
                          }}
                          title="Reset Password User"
                          className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        {/* Toggle Status Aktif */}
                        <button
                          onClick={() => toggleUserStatus(u.id, !u.is_active)}
                          title={u.is_active ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                          className={`p-1.5 rounded-lg ${
                            u.is_active
                              ? 'text-slate-400 hover:text-rose-600'
                              : 'text-emerald-600 hover:text-emerald-700'
                          }`}
                        >
                          {u.is_active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      )}

      {/* TAB 8: INTEGRASI DATABASE SUPABASE (SUPERADMIN ONLY) */}
      {activeTab === 'integrasi' && isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-2 sm:p-6 overflow-hidden">
          <SupabaseSetupView onBackToApp={() => setActiveTab('accounts')} />
        </div>
      )}

      {/* TAB 9: OTOMASI JADWAL TRANSAKSI BERULANG */}
      {activeTab === 'otomasi' && (
        <RecurringTransactionsView />
      )}
        </div>
      </div>

      {/* GENERIC MASTER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base">
                {editingId
                  ? activeTab === 'accounts'
                    ? 'Edit Rekening'
                    : 'Edit Data Master'
                  : activeTab === 'accounts'
                  ? 'Tambah Rekening Baru'
                  : 'Tambah Data Master'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="py-4 space-y-4">
              {/* Form Tipe Transaksi */}
              {activeTab === 'types' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Tipe
                    </label>
                    <input
                      type="text"
                      required
                      value={typeName}
                      onChange={(e) => setTypeName(e.target.value)}
                      placeholder="Contoh: Pemasukan"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kind (Logika Arus)
                    </label>
                    <select
                      value={typeKind}
                      onChange={(e) => setTypeKind(e.target.value as TxKind)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    >
                      <option value="income">Income (Pemasukan)</option>
                      <option value="expense">Expense (Pengeluaran)</option>
                      <option value="transfer">Transfer (Antar Akun)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Warna Representasi (Hex)
                    </label>
                    <input
                      type="text"
                      value={typeColor}
                      onChange={(e) => setTypeColor(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                  </div>
                </>
              )}

              {/* Form Kategori */}
              {activeTab === 'categories' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Kategori
                    </label>
                    <input
                      type="text"
                      required
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="Contoh: Tagihan Bulanan"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tipe Transaksi Terkait
                    </label>
                    <select
                      required
                      value={catTypeId}
                      onChange={(e) => setCatTypeId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    >
                      {transactionTypes.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Form Sub Kategori */}
              {activeTab === 'sub_categories' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Sub Kategori
                    </label>
                    <input
                      type="text"
                      required
                      value={subCatName}
                      onChange={(e) => setSubCatName(e.target.value)}
                      placeholder="Contoh: Wifi, Listrik, Bensin..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kategori Induk
                    </label>
                    <select
                      required
                      value={subCatCatId}
                      onChange={(e) => setSubCatCatId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Default Limit Bulanan (Rp) - Opsional
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={subCatLimitDisplay}
                        onChange={(e) => setSubCatLimitDisplay(formatNumberOnly(e.target.value))}
                        placeholder="Kosongkan jika tanpa limit"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Form Rekening */}
              {activeTab === 'accounts' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Rekening
                    </label>
                    <input
                      type="text"
                      required
                      value={accName}
                      onChange={(e) => setAccName(e.target.value)}
                      placeholder="Contoh: Seabank Ofi, Kas Dapur, BCA Alfian..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Grup Rekening
                      </label>
                      <select
                        value={accGroup}
                        onChange={(e) => setAccGroup(e.target.value as AccountGroup)}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      >
                        <option value="bank">Bank</option>
                        <option value="cash">Cash / Tunai</option>
                        <option value="tabungan">Tabungan</option>
                        <option value="paylater">Paylater / Kartu Kredit</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Label Pemilik Rekening
                      </label>
                      <input
                        type="text"
                        value={accOwner}
                        onChange={(e) => setAccOwner(e.target.value)}
                        placeholder="Alfian / Ofi / Bersama"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      />
                    </div>
                  </div>

                  {accGroup === 'tabungan' && (
                    <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-blue-900 mb-1">
                          Nama Tujuan Tabungan
                        </label>
                        <input
                          type="text"
                          value={accSavingsGoal}
                          onChange={(e) => setAccSavingsGoal(e.target.value)}
                          placeholder="Kesehatan, Darurat, Rumah, Kendaraan..."
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-blue-900 mb-1">
                          Target Nominal Tabungan (Rp)
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                            Rp
                          </span>
                          <input
                            type="text"
                            value={accTargetDisplay}
                            onChange={(e) => setAccTargetDisplay(formatNumberOnly(e.target.value))}
                            placeholder="Contoh: 50.000.000"
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Saldo Awal (Rp)
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-slate-400">
                        Rp
                      </span>
                      <input
                        type="text"
                        value={accOpeningDisplay}
                        onChange={(e) => setAccOpeningDisplay(formatNumberOnly(e.target.value))}
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Catatan / Peruntukan
                    </label>
                    <input
                      type="text"
                      value={accPurpose}
                      onChange={(e) => setAccPurpose(e.target.value)}
                      placeholder="Contoh: Rekening belanja dapur..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                  </div>
                </>
              )}

              {/* Form Pihak Aliran Kas */}
              {activeTab === 'parties' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Pihak
                    </label>
                    <input
                      type="text"
                      required
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder="Contoh: Pendapatan, Pemberian, Admin/Pajak..."
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Scope Aliran
                    </label>
                    <select
                      value={partyScope}
                      onChange={(e) => setPartyScope(e.target.value as PartyScope)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    >
                      <option value="income_source">Pihak Sumber (Income)</option>
                      <option value="expense_destination">Pihak Tujuan (Expense)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Form User */}
              {activeTab === 'users' && isSuperAdmin && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap User
                    </label>
                    <input
                      type="text"
                      required
                      value={userFullName}
                      onChange={(e) => setUserFullName(e.target.value)}
                      placeholder="Nama anggota keluarga"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Login
                    </label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="email@keluarga.com"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                  </div>

                  {!editingId && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Password Awal (Min. 6 Karakter)
                      </label>
                      <input
                        type="password"
                        required
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Role Akses
                    </label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as 'superadmin' | 'user')}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    >
                      <option value="user">User (Input transaksi, lihat dashboard & anggaran)</option>
                      <option value="superadmin">Superadmin (Semua hak akses termasuk master & user)</option>
                    </select>
                  </div>
                </>
              )}

              {/* Status Aktif / Nonaktif */}
              {activeTab !== 'users' && (
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={
                      activeTab === 'types'
                        ? typeActive
                        : activeTab === 'categories'
                        ? catActive
                        : activeTab === 'sub_categories'
                        ? subCatActive
                        : activeTab === 'accounts'
                        ? accActive
                        : partyActive
                    }
                    onChange={(e) => {
                      const v = e.target.checked;
                      if (activeTab === 'types') setTypeActive(v);
                      else if (activeTab === 'categories') setCatActive(v);
                      else if (activeTab === 'sub_categories') setSubCatActive(v);
                      else if (activeTab === 'accounts') setAccActive(v);
                      else if (activeTab === 'parties') setPartyActive(v);
                    }}
                    className="rounded text-[#1E6B4F] focus:ring-[#1E6B4F]"
                  />
                  <span>Status Aktif</span>
                </label>
              )}

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
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs"
                >
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL FOR SUPERADMIN */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-[#1E6B4F]" />
                <span>Ganti Password User</span>
              </h3>
              <button
                onClick={() => setResetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password Baru (Min. 6 Karakter)
                </label>
                <input
                  type="password"
                  required
                  value={newPasswordToReset}
                  onChange={(e) => setNewPasswordToReset(e.target.value)}
                  placeholder="Masukkan password baru"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs"
                >
                  Ubah Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
