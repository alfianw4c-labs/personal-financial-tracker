import React, { useState } from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  CalendarRange,
  Settings,
  Eye,
  EyeOff,
  LogOut,
  KeyRound,
  ShieldCheck,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { getSupabaseConfig } from '../../lib/supabase';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenIntegrationTab?: () => void;
}

export function Navbar({ activeTab, setActiveTab, onOpenIntegrationTab }: NavbarProps) {
  const { currentUser, logout, isSuperAdmin, changePassword } = useAuth();
  const { privacyMode, setPrivacyMode, exceededLimitCountCurrentMonth } = useData();
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Form ganti password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [savingPass, setSavingPass] = useState(false);

  const supabaseConfig = getSupabaseConfig();
  const isConnectedToSupabase = !!supabaseConfig;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (newPassword !== confirmPassword) {
      setPassError('Password konfirmasi tidak cocok.');
      return;
    }
    if (newPassword.length < 6) {
      setPassError('Password baru minimal 6 karakter.');
      return;
    }

    setSavingPass(true);
    const res = await changePassword(oldPassword, newPassword);
    setSavingPass(false);

    if (res.success) {
      setPassSuccess('Password berhasil diperbarui.');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setShowProfileModal(false), 1500);
    } else {
      setPassError(res.error || 'Gagal mengubah password.');
    }
  };

  // Tepat 4 Menu Utama sesuai instruksi user
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transaksi', label: 'Transaksi', icon: ReceiptText },
    {
      id: 'perencanaan',
      label: 'Perencanaan',
      icon: CalendarRange,
      badge: exceededLimitCountCurrentMonth > 0 ? exceededLimitCountCurrentMonth : undefined,
    },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  const handleDbClick = () => {
    setActiveTab('pengaturan');
    if (onOpenIntegrationTab) {
      onOpenIntegrationTab();
    }
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. DESKTOP SIDEBAR (Tampil di md ke atas)               */}
      {/* ======================================================== */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:border-r md:border-slate-200 md:bg-white md:z-30">
        <div className="flex flex-col h-full justify-between p-4">
          {/* Top: Brand & Menu */}
          <div className="space-y-6">
            {/* Brand Wordmark */}
            <div className="px-2 pt-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1E6B4F] text-white flex items-center justify-center font-extrabold text-base shadow-sm shrink-0">
                DC
              </div>
              <div className="min-w-0">
                <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight truncate">
                  Daily Cashflow
                </span>
                <span className="text-[11px] text-slate-500 font-medium block truncate">
                  Keuangan Keluarga
                </span>
              </div>
            </div>

            {/* Navigation (Tepat 4 Menu Utama) */}
            <nav className="space-y-1">
              <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Menu Utama
              </span>

              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-[#1E6B4F]/10 text-[#1E6B4F] font-bold border border-[#1E6B4F]/20 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#1E6B4F]' : 'text-slate-500'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white shadow-xs">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Sidebar: Status DB, Privacy Toggle & User Session */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            {/* Database Status Button */}
            <button
              onClick={handleDbClick}
              title="Status Database - Klik untuk buka Pengaturan Integrasi"
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                isConnectedToSupabase
                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900 hover:bg-emerald-100/70'
                  : 'border-amber-200 bg-amber-50/70 text-amber-900 hover:bg-amber-100/70'
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isConnectedToSupabase ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="text-[11px] truncate">
                  {isConnectedToSupabase ? 'Supabase Terhubung' : 'Belum Terhubung DB'}
                </span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0" />
            </button>

            {/* Privacy Toggle Button */}
            <button
              onClick={() => setPrivacyMode(!privacyMode)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {privacyMode ? (
                  <EyeOff className="w-4 h-4 text-[#1E6B4F]" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-500" />
                )}
                <span>{privacyMode ? 'Sembunyikan Saldo' : 'Tampilkan Saldo'}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {privacyMode ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* User Profile Card */}
            {currentUser && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="flex items-center gap-2.5 min-w-0 text-left hover:opacity-80 transition-opacity"
                  title="Klik untuk lihat profil dan ubah kata sandi"
                >
                  <div className="w-8 h-8 rounded-full bg-[#1E6B4F] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate">
                      {currentUser.full_name}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize block truncate">
                      {currentUser.role === 'superadmin' ? 'Superadmin' : 'User Keluarga'}
                    </span>
                  </div>
                </button>

                <button
                  onClick={logout}
                  title="Keluar"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. MOBILE TOP APP BAR (md:hidden)                        */}
      {/* ======================================================== */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <button
          onClick={() => setActiveTab('dashboard')}
          className="flex items-center gap-2 text-left focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-[#1E6B4F] text-white flex items-center justify-center font-bold text-xs shadow-xs">
            DC
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-slate-900 block leading-tight">
              Daily Cashflow
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              Keuangan Keluarga
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          {/* Privacy Toggle */}
          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            title={privacyMode ? 'Tampilkan Saldo' : 'Sembunyikan Saldo'}
          >
            {privacyMode ? (
              <EyeOff className="w-4 h-4 text-[#1E6B4F]" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>

          {/* User profile & password modal */}
          {currentUser && (
            <>
              <button
                onClick={() => setShowProfileModal(true)}
                className="w-7 h-7 rounded-full bg-[#1E6B4F] text-white flex items-center justify-center font-bold text-xs shadow-xs"
              >
                {currentUser.full_name?.charAt(0).toUpperCase() || 'U'}
              </button>

              <button
                onClick={logout}
                title="Keluar"
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* ======================================================== */}
      {/* 3. MOBILE BOTTOM TAB BAR (md:hidden, Tepat 4 Menu)      */}
      {/* ======================================================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200">
        <div className="grid grid-cols-4 items-center h-16 max-w-lg mx-auto px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`relative flex flex-col items-center justify-center py-1 transition-colors ${
                  isActive ? 'text-[#1E6B4F]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1.5 -right-2.5 px-1 py-0.2 min-w-[16px] text-center text-[9px] font-bold rounded-full bg-rose-600 text-white shadow-xs">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-1 tracking-tight ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-[#1E6B4F] mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MODAL PROFIL & GANTI KATA SANDI                       */}
      {/* ======================================================== */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#1E6B4F]" />
                <h3 className="font-semibold text-slate-900 text-base">Profil & Kata Sandi</h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Nama:</span>
                  <span className="font-medium text-slate-800">{currentUser?.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-medium text-slate-800">{currentUser?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Role:</span>
                  <span className="font-semibold text-[#1E6B4F] capitalize">{currentUser?.role}</span>
                </div>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 pt-2">
                  <KeyRound className="w-3.5 h-3.5 text-[#1E6B4F]" />
                  Ganti Password
                </h4>

                {passError && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                    {passError}
                  </div>
                )}
                {passSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs">
                    {passSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Password Lama
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Konfirmasi Password Baru
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Tutup
                  </button>
                  <button
                    type="submit"
                    disabled={savingPass}
                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-lg shadow-xs transition-colors disabled:opacity-50"
                  >
                    {savingPass ? 'Menyimpan...' : 'Simpan Password'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
