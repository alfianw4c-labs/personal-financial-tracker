import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, ShieldCheck, Database, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getSupabaseConfig, setDemoMode } from '../../lib/supabase';
import { useData } from '../../context/DataContext';

interface LoginViewProps {
  onOpenSetup: () => void;
}

export function LoginView({ onOpenSetup }: LoginViewProps) {
  const { login } = useAuth();
  const { refetchAll } = useData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const supabaseConfig = getSupabaseConfig();
  const isSupabaseConfigured = supabaseConfig && supabaseConfig.source !== 'demo';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Login gagal. Periksa email dan password.');
    }
  };

  const handleQuickDemoSuperadmin = async () => {
    if (!isSupabaseConfigured) {
      setDemoMode(true);
      await refetchAll();
    }
    setEmail('admin@dailycashflow.local');
    setPassword('admin123');
    setLoading(true);
    const res = await login('admin@dailycashflow.local', 'admin123');
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Akun demo belum diinisialisasi.');
    }
  };

  const handleQuickDemoUser = async () => {
    if (!isSupabaseConfigured) {
      setDemoMode(true);
      await refetchAll();
    }
    setEmail('ofi@dailycashflow.local');
    setPassword('user123');
    setLoading(true);
    const res = await login('ofi@dailycashflow.local', 'user123');
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Akun demo belum diinisialisasi.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-100 flex flex-col justify-center items-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* App Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1E6B4F] text-white shadow-md shadow-emerald-950/10 mb-4">
            <span className="text-xl font-bold tracking-tight">DC</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Daily Cashflow
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pencatatan Keuangan & Arus Kas Harian Keluarga
          </p>
        </div>

        {/* Card Login */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Masuk ke Akun</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan email & kata sandi yang telah didaftarkan.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@keluarga.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Kata Sandi
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#1E6B4F] hover:bg-[#16523c] text-white font-semibold text-sm shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Memeriksa Akun...</span>
              ) : (
                <>
                  <span>Masuk Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Buttons */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block text-center mb-3">
              Akses Cepat (Uji Coba & Demo)
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickDemoSuperadmin}
                className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80 text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E6B4F]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Superadmin</span>
                </div>
                <p className="text-[10px] text-emerald-800/80 mt-0.5">
                  Alfian (Hak Penuh)
                </p>
              </button>

              <button
                type="button"
                onClick={handleQuickDemoUser}
                className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-colors"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                  <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                  <span>User Keluarga</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Ofi (Input Transaksi)
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Supabase Connection Setup Link */}
        <div className="mt-6 text-center">
          <button
            onClick={onOpenSetup}
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-[#1E6B4F] bg-white hover:bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 transition-all shadow-2xs"
          >
            <Database className="w-3.5 h-3.5 text-[#1E6B4F]" />
            <span>
              {isSupabaseConfigured
                ? 'Konfigurasi Database Supabase'
                : 'Setup Wizard Database Supabase'}
            </span>
          </button>
          <p className="text-[11px] text-slate-400 mt-2">
            Aplikasi internal keluarga · Tanpa pendaftaran mandiri
          </p>
        </div>
      </div>
    </div>
  );
}
