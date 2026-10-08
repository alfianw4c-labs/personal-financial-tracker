import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  ArrowRight,
  Database,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  X,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { useAuth } from '../../context/AuthContext';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  getSupabaseClient,
} from '../../lib/supabase';
import { SUPABASE_SETUP_SQL } from '../../lib/supabaseSql';

export function LoginView() {
  const { login } = useAuth();
  const [email, setEmail] = useState('admin@dailycashflow.local');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Supabase Config State
  const [supabaseConfig, setSupabaseConfig] = useState(getSupabaseConfig());
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState<'connection' | 'sql' | 'credentials'>('connection');

  // Form Config Modal
  const [inputUrl, setInputUrl] = useState(supabaseConfig?.url || '');
  const [inputAnonKey, setInputAnonKey] = useState(supabaseConfig?.anonKey || '');
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    schemaVersion?: string;
  } | null>(null);

  // Copy SQL State
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Auto seed state
  const [isSeedingAdmin, setIsSeedingAdmin] = useState(false);
  const [seedSuccessMsg, setSeedSuccessMsg] = useState('');

  // Check connection on mount if config exists
  useEffect(() => {
    const config = getSupabaseConfig();
    setSupabaseConfig(config);
    if (config) {
      setInputUrl(config.url);
      setInputAnonKey(config.anonKey);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setErrorCode(null);
    setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setErrorMsg(result.error || 'Login gagal. Periksa email dan kata sandi.');
      if (result.code) {
        setErrorCode(result.code);
      }
    }
  };

  const handleTestAndSaveConfig = async () => {
    if (!inputUrl || !inputAnonKey) {
      setTestResult({
        tested: true,
        success: false,
        message: 'URL Project dan Anon Key harus diisi.',
      });
      return;
    }

    setIsTesting(true);
    const res = await testSupabaseConnection(inputUrl, inputAnonKey);
    setIsTesting(false);

    setTestResult({
      tested: true,
      success: res.success,
      message: res.message,
      schemaVersion: res.schemaVersion,
    });

    if (res.success) {
      saveSupabaseConfig(inputUrl, inputAnonKey);
      setSupabaseConfig(getSupabaseConfig());
      setErrorMsg('');
      setErrorCode(null);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const handleCopyEnvSnippet = () => {
    const text = `VITE_SUPABASE_URL="${inputUrl || 'https://your-project.supabase.co'}"\nVITE_SUPABASE_ANON_KEY="${inputAnonKey || 'your-anon-key'}"`;
    navigator.clipboard.writeText(text);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  // Seed superadmin user directly into Supabase app_users table
  const handleSeedSuperadminDirectly = async () => {
    const client = getSupabaseClient();
    if (!client) {
      alert('Koneksi Supabase belum aktif. Simpan URL dan Anon Key terlebih dahulu.');
      return;
    }

    setIsSeedingAdmin(true);
    try {
      const defaultUsers = [
        {
          id: '00000000-0000-0000-0000-000000000001',
          full_name: 'Alfian Faiz (Superadmin)',
          email: 'admin@dailycashflow.local',
          password_hash: bcrypt.hashSync('admin123', 10),
          role: 'superadmin',
          is_active: true,
        },
        {
          id: '00000000-0000-0000-0000-000000000002',
          full_name: 'Alfian Faiz',
          email: 'alfianfaiz.w4c@gmail.com',
          password_hash: bcrypt.hashSync('admin123', 10),
          role: 'superadmin',
          is_active: true,
        },
      ];

      const { error } = await client.from('app_users').upsert(defaultUsers, { onConflict: 'email' });
      if (error) {
        throw new Error(error.message);
      }

      setSeedSuccessMsg('Akun superadmin berhasil diinisialisasi di Supabase! Anda kini dapat langsung login.');
      setErrorMsg('');
      setErrorCode(null);
      setEmail('admin@dailycashflow.local');
      setPassword('admin123');
    } catch (err: any) {
      alert(`Gagal inisialisasi akun ke Supabase: ${err.message}. Pastikan tabel app_users sudah dibuat lewat SQL Editor.`);
    } finally {
      setIsSeedingAdmin(false);
    }
  };

  const isConnected = !!supabaseConfig;
  const projectHost = supabaseConfig ? new URL(supabaseConfig.url).hostname : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-md w-full">
        {/* App Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl overflow-hidden shadow-md shadow-emerald-950/10 mb-3 border border-slate-200/80 bg-white">
            <img src="/logo.png" alt="MyFinTrack Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            MyFinTrack
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pencatatan Keuangan & Arus Kas Harian Keluarga
          </p>
        </div>

        {/* Database Status Pill */}
        <div className="mb-4 flex items-center justify-between bg-white px-3.5 py-2 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={`w-2 h-2 rounded-full shrink-0 ${
                isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] font-medium text-slate-600 truncate">
              {isConnected ? (
                <>
                  <span className="text-emerald-700 font-semibold">Supabase:</span>{' '}
                  <span className="text-slate-500">{projectHost}</span>
                </>
              ) : (
                <span className="text-amber-700 font-medium">Supabase belum terhubung di browser ini</span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsConfigModalOpen(true);
              setActiveModalTab(isConnected ? 'sql' : 'connection');
            }}
            className="text-[11px] font-semibold text-[#1E6B4F] hover:text-[#16523c] shrink-0 pl-2 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Database className="w-3 h-3" />
            <span>{isConnected ? 'Query SQL' : 'Atur DB'}</span>
          </button>
        </div>

        {/* Card Login */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Masuk ke Akun</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Masukkan email & kata sandi akun keluarga Anda.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs leading-relaxed space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMsg}</div>
              </div>

              {/* Actionable buttons inside error */}
              {(errorCode === 'SCHEMA_NOT_FOUND' || errorCode === 'TABLE_EMPTY' || errorCode === 'PERMISSION_DENIED') && (
                <div className="pt-2 border-t border-rose-200/70 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfigModalOpen(true);
                      setActiveModalTab('sql');
                    }}
                    className="px-2.5 py-1 text-[11px] font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Buka Query SQL Supabase
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedSuperadminDirectly}
                    disabled={isSeedingAdmin}
                    className="px-2.5 py-1 text-[11px] font-medium bg-white hover:bg-slate-50 text-rose-800 border border-rose-300 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSeedingAdmin ? 'Menyimpan...' : 'Inisialisasi Akun Superadmin'}
                  </button>
                </div>
              )}
            </div>
          )}

          {seedSuccessMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{seedSuccessMsg}</span>
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
                  placeholder="admin@dailycashflow.local"
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
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#1E6B4F] hover:bg-[#16523c] text-white font-semibold text-sm shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
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

          {/* Quick Credential Box */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#1E6B4F]" />
                Akun Superadmin Default:
              </span>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@dailycashflow.local');
                  setPassword('admin123');
                }}
                className="text-[11px] text-[#1E6B4F] hover:underline cursor-pointer"
              >
                Gunakan Ini
              </button>
            </div>
            <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] font-mono text-slate-600 space-y-1 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Email:</span>
                <span className="text-slate-800 font-medium">admin@dailycashflow.local</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Sandi:</span>
                <span className="text-slate-800 font-medium">admin123</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Link to SQL and Setup */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsConfigModalOpen(true);
              setActiveModalTab('sql');
            }}
            className="text-xs text-slate-500 hover:text-[#1E6B4F] font-medium transition-colors inline-flex items-center gap-1 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Koneksi atau query database Supabase bermasalah? Klik di sini</span>
          </button>
        </div>
      </div>

      {/* Modal Pengaturan Database & Query SQL Supabase */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-[#1E6B4F] rounded-xl">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                    Integrasi Database Supabase
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfigurasi koneksi & query SQL untuk deploy Vercel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 px-5 bg-white shrink-0">
              <button
                type="button"
                onClick={() => setActiveModalTab('connection')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeModalTab === 'connection'
                    ? 'border-[#1E6B4F] text-[#1E6B4F]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                1. Koneksi Supabase
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('sql')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeModalTab === 'sql'
                    ? 'border-[#1E6B4F] text-[#1E6B4F]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                2. Query SQL Migrasi
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('credentials')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeModalTab === 'credentials'
                    ? 'border-[#1E6B4F] text-[#1E6B4F]'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                3. Panduan Deploy Vercel
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {activeModalTab === 'connection' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    Masukkan URL dan Anon Public Key dari project Supabase Anda. Konfigurasi ini disimpan di browser sehingga Anda dapat login di Vercel meskipun environment variables belum diset.
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Project URL Supabase
                    </label>
                    <input
                      type="text"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      placeholder="https://xyzcompany.supabase.co"
                      className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ditemukan di: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project URL
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Anon Public Key
                    </label>
                    <textarea
                      rows={3}
                      value={inputAnonKey}
                      onChange={(e) => setInputAnonKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      Ditemukan di: Supabase Dashboard &gt; Project Settings &gt; API &gt; Project API keys (anon public)
                    </p>
                  </div>

                  {testResult && (
                    <div
                      className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                        testResult.success
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                          : 'bg-rose-50 border border-rose-200 text-rose-800'
                      }`}
                    >
                      {testResult.success ? (
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-semibold">
                          {testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}
                        </div>
                        <div className="mt-0.5">{testResult.message}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleTestAndSaveConfig}
                      disabled={isTesting}
                      className="w-full sm:w-auto px-4 py-2.5 bg-[#1E6B4F] hover:bg-[#16523c] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Menguji Koneksi...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tes & Simpan Koneksi</span>
                        </>
                      )}
                    </button>

                    {isConnected && (
                      <button
                        type="button"
                        onClick={handleSeedSuperadminDirectly}
                        disabled={isSeedingAdmin}
                        className="w-full sm:w-auto px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#1E6B4F] border border-emerald-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isSeedingAdmin ? 'Menyimpan...' : 'Inisialisasi Akun Superadmin'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {activeModalTab === 'sql' && (
                <div className="space-y-3">
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                    <strong>PENTING:</strong> Jalankan query berikut di Supabase Anda untuk membuat tabel <code className="bg-amber-100 px-1 py-0.5 rounded">app_users</code>, hak akses RLS, dan akun Superadmin awal.
                    <ol className="list-decimal pl-4 mt-1.5 space-y-1 text-amber-800">
                      <li>Buka <strong>Supabase Dashboard</strong> &gt; Pilih Project Anda.</li>
                      <li>Pilih menu <strong>SQL Editor</strong> di sidebar kiri.</li>
                      <li>Klik <strong>+ New Query</strong>, tempel seluruh kode SQL di bawah ini.</li>
                      <li>Klik tombol hijau <strong>Run</strong> di pojok kanan bawah.</li>
                    </ol>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Query SQL Lengkap (PostgreSQL)
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySql}
                      className="px-3 py-1.5 bg-[#1E6B4F] hover:bg-[#16523c] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      {copiedSql ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Tersalin!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Salin Seluruh Query SQL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="bg-slate-900 text-emerald-400 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 border border-slate-800 select-all leading-relaxed">
                    {SUPABASE_SETUP_SQL}
                  </pre>
                </div>
              )}

              {activeModalTab === 'credentials' && (
                <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                  <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-emerald-900">
                    <p className="font-semibold text-emerald-950 mb-1">
                      Cara Setting Environment Variable di Vercel:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-emerald-800">
                      <li>Buka Dashboard project Anda di <strong>vercel.com</strong></li>
                      <li>Buka menu <strong>Settings</strong> &gt; <strong>Environment Variables</strong></li>
                      <li>Tambahkan 2 variabel berikut:</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Format Nilai untuk Vercel:</span>
                      <button
                        type="button"
                        onClick={handleCopyEnvSnippet}
                        className="text-[11px] font-semibold text-[#1E6B4F] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedEnv ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedEnv ? 'Tersalin' : 'Salin Snippet'}</span>
                      </button>
                    </div>

                    <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] space-y-2">
                      <div>
                        <span className="text-emerald-400">VITE_SUPABASE_URL</span>=
                        <span className="text-amber-300">"{inputUrl || 'https://your-project.supabase.co'}"</span>
                      </div>
                      <div>
                        <span className="text-emerald-400">VITE_SUPABASE_ANON_KEY</span>=
                        <span className="text-amber-300">"{inputAnonKey ? inputAnonKey.slice(0, 24) + '...' : 'eyJhbGciOiJIUzI1Ni...'}"</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-slate-500">
                    <p className="font-semibold text-slate-700">Catatan Penting:</p>
                    <p>
                      Karena aplikasi ini menggunakan Vite di sisi klien, nama environment variable <strong>HARUS</strong> diawali dengan prefix <code className="text-emerald-700 font-mono font-semibold">VITE_</code>.
                    </p>
                    <p>
                      Setelah menambahkan variabel di Vercel, lakukan <strong>Redeploy</strong> agar Vite mem-build ulang variabel ke dalam bundle frontend.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-500">
                MyFinTrack Supabase Integration
              </span>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
