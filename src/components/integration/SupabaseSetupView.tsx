import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Copy,
  ExternalLink,
  RefreshCw,
  Server,
  Key,
  Lock,
  UserPlus,
  Play,
  ArrowLeft,
  Check,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  getSupabaseClient,
} from '../../lib/supabase';
import { SUPABASE_SETUP_SQL } from '../../lib/supabaseSql';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../layout/NotificationToast';

interface SupabaseSetupViewProps {
  onBackToApp?: () => void;
}

export function SupabaseSetupView({ onBackToApp }: SupabaseSetupViewProps) {
  const { setDirectSession } = useAuth();
  const { refetchAll, saveAppUser } = useData();
  const { showToast } = useToast();

  const config = getSupabaseConfig();
  const isEnvLocked = config?.source === 'env';

  // Stepper state (1: Koneksi, 2: Cek Skema, 3: Migrasi, 4: Superadmin)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1 Form
  const [url, setUrl] = useState<string>(config?.url || '');
  const [anonKey, setAnonKey] = useState<string>(config?.anonKey || '');
  const [showAnonKey, setShowAnonKey] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    tested: boolean;
    success: boolean;
    message: string;
    schemaVersion?: string;
  }>({
    tested: false,
    success: false,
    message: '',
  });

  // Step 3 Migration
  const [migrationMode, setMigrationMode] = useState<'auto' | 'manual'>('auto');
  const [connectionString, setConnectionString] = useState<string>('');
  const [runningMigration, setRunningMigration] = useState<boolean>(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Step 4 Superadmin Form
  const [adminName, setAdminName] = useState<string>('Alfian Faiz');
  const [adminEmail, setAdminEmail] = useState<string>('admin@dailycashflow.local');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [creatingAdmin, setCreatingAdmin] = useState<boolean>(false);

  // Vercel Snippet
  const [copiedVercel, setCopiedVercel] = useState<boolean>(false);

  // SQL Script cached for manual copy
  const [sqlContent, setSqlContent] = useState<string>(SUPABASE_SETUP_SQL);

  useEffect(() => {
    // Muat SQL dari file migrations jika dibutuhkan, fallback ke SUPABASE_SETUP_SQL
    fetch('/supabase/migrations/001_init.sql')
      .then((res) => {
        if (res.ok) return res.text();
        return '';
      })
      .then((text) => {
        if (text) setSqlContent(text);
      })
      .catch(() => {});
  }, []);

  // Tes koneksi
  const handleTestConnection = async () => {
    if (!url || !anonKey) {
      setConnectionStatus({
        tested: true,
        success: false,
        message: 'URL Project dan Anon Key harus diisi.',
      });
      return;
    }

    setTestingConnection(true);
    const result = await testSupabaseConnection(url, anonKey);
    setTestingConnection(false);

    setConnectionStatus({
      tested: true,
      success: result.success,
      message: result.message,
      schemaVersion: result.schemaVersion,
    });

    if (result.success) {
      saveSupabaseConfig(url, anonKey);
      if (result.schemaVersion) {
        // Skema sudah ada, lompat ke pengecekan user / step 4
        setCurrentStep(4);
      } else {
        // Skema belum ada, lanjut ke langkah 3 migrasi
        setCurrentStep(3);
      }
    }
  };

  // Jalankan Migrasi Otomatis lewat /api/setup
  const handleRunAutoMigration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectionString) {
      showToast('error', 'Masukkan database connection string');
      return;
    }

    setRunningMigration(true);
    setMigrationLogs(['Mengirim permintaan ke serverless function /api/setup...']);

    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionString }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Migrasi gagal.');
      }

      setMigrationLogs(data.logs || ['Migrasi berhasil dieksekusi.']);
      showToast('success', 'Migrasi Berhasil', 'Tabel dan skema database telah selesai dibuat.');
      setConnectionString(''); // Buang segera demi keamanan!
      await refetchAll();

      // Lanjut ke Step 4
      setTimeout(() => {
        setCurrentStep(4);
      }, 1200);
    } catch (err: any) {
      setMigrationLogs((prev) => [...prev, `Gagal: ${err.message}`]);
      showToast('error', 'Migrasi Gagal', err.message);
    } finally {
      setRunningMigration(false);
    }
  };

  // Salin SQL manual
  const handleCopySql = () => {
    if (sqlContent) {
      navigator.clipboard.writeText(sqlContent);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
      showToast('info', 'SQL Disalin', 'Buka SQL Editor di dashboard Supabase Anda dan jalankan.');
    } else {
      showToast('error', 'Gagal memuat isi file SQL migrasi');
    }
  };

  // Buat Superadmin Pertama
  const handleCreateSuperadmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminPassword || adminPassword.length < 6) {
      showToast('error', 'Password minimal 6 karakter');
      return;
    }

    setCreatingAdmin(true);
    const res = await saveAppUser({
      full_name: adminName,
      email: adminEmail,
      password: adminPassword,
      role: 'superadmin',
      is_active: true,
    });
    setCreatingAdmin(false);

    if (res.success) {
      showToast('success', 'Superadmin Berhasil Dibuat', 'Mengalihkan ke dashboard...');
      setDirectSession({
        id: crypto.randomUUID ? crypto.randomUUID() : 'admin-1',
        full_name: adminName,
        email: adminEmail,
        role: 'superadmin',
      });
      await refetchAll();
      if (onBackToApp) onBackToApp();
    } else {
      showToast('error', 'Gagal membuat superadmin', res.error);
    }
  };

  // Salin env untuk Vercel
  const handleCopyVercelEnv = () => {
    const text = `VITE_SUPABASE_URL=${url}\nVITE_SUPABASE_ANON_KEY=${anonKey}`;
    navigator.clipboard.writeText(text);
    setCopiedVercel(true);
    setTimeout(() => setCopiedVercel(false), 2500);
    showToast('success', 'Disalin!', 'Dua baris konfigurasi telah disalin untuk Vercel Environment Variables.');
  };

  const handleDisconnect = () => {
    if (confirm('Yakin ingin memutuskan koneksi Supabase? Konfigurasi di browser ini akan dihapus.')) {
      clearSupabaseConfig();
      setUrl('');
      setAnonKey('');
      setConnectionStatus({ tested: false, success: false, message: '' });
      setCurrentStep(1);
      refetchAll();
      showToast('info', 'Koneksi Diputuskan', 'Konfigurasi database telah dihapus dari browser.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#1E6B4F] text-white flex items-center justify-center font-bold">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Integrasi Database Supabase</h1>
            <p className="text-xs text-slate-500">
              Konfigurasi PostgreSQL cloud, eksekusi migrasi skema, dan manajemen akun keluarga.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali</span>
            </button>
          )}
        </div>
      </div>

      {/* Stepper Wizard Indicator */}
      <div className="my-6">
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { step: 1, label: '1. Koneksi' },
            { step: 2, label: '2. Cek Skema' },
            { step: 3, label: '3. Migrasi Skema' },
            { step: 4, label: '4. Superadmin' },
          ].map((item) => (
            <div
              key={item.step}
              onClick={() => setCurrentStep(item.step)}
              className={`cursor-pointer p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                currentStep === item.step
                  ? 'border-[#1E6B4F] bg-[#1E6B4F]/10 text-[#1E6B4F] shadow-xs'
                  : currentStep > item.step
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-slate-200 bg-white text-slate-400'
              }`}
            >
              {item.label}
            </div>
          ))}
        </div>
      </div>

      {/* Security Warning Banner */}
      <div className="mb-6 p-4 rounded-xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <p className="font-bold">Keamanan Credential:</p>
          <p className="mt-0.5 opacity-90">
            Hanya gunakan <strong>Anon / Publishable Key</strong> di frontend. Jangan pernah
            memasukkan <em>service_role</em> secret key! Connection string database hanya digunakan
            sekali di serverless migration lalu segera dibuang.
          </p>
        </div>
      </div>

      {/* STEP 1: KONEKSI */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Langkah 1: Parameter Koneksi</h2>
              <p className="text-xs text-slate-500">
                Masukkan Project URL dan Anon Key dari dashboard Supabase Anda (Project Settings &gt; API).
              </p>
            </div>
            {isEnvLocked && (
              <span className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full font-semibold">
                Terkunci via Vercel Env
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project URL <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={isEnvLocked}
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://abcdefghijkl.supabase.co"
                  className="w-full px-3 py-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] disabled:bg-slate-50 disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Anon / Publishable Key <span className="text-rose-500">*</span>
                </label>
                {!isEnvLocked && (
                  <button
                    type="button"
                    onClick={() => setShowAnonKey(!showAnonKey)}
                    className="text-[11px] text-[#1E6B4F] hover:underline"
                  >
                    {showAnonKey ? 'Sembunyikan' : 'Tampilkan Key'}
                  </button>
                )}
              </div>
              <input
                type={showAnonKey ? 'text' : 'password'}
                required
                disabled={isEnvLocked}
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F] disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            {connectionStatus.tested && (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  connectionStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                {connectionStatus.success ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-semibold">
                    {connectionStatus.success ? 'Koneksi Berhasil' : 'Koneksi Gagal'}
                  </p>
                  <p className="mt-0.5 opacity-90">{connectionStatus.message}</p>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="px-5 py-2.5 rounded-xl bg-[#1E6B4F] hover:bg-[#16523c] text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Menguji Koneksi...</span>
                  </>
                ) : (
                  <>
                    <Server className="w-3.5 h-3.5" />
                    <span>Tes Koneksi & Lanjut</span>
                  </>
                )}
              </button>

              {config?.url && !isEnvLocked && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                >
                  Putuskan Koneksi
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CEK DATABASE */}
      {currentStep === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Langkah 2: Status Skema Database</h2>
          <p className="text-xs text-slate-500">
            Aplikasi memeriksa tabel <code>app_meta</code> di database PostgreSQL Anda.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-600">Database URL:</span>
              <span className="font-mono font-medium text-slate-800">{url}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Versi Skema Terdeteksi:</span>
              <span className="font-bold text-slate-800">
                {connectionStatus.schemaVersion ? `Versi ${connectionStatus.schemaVersion}` : 'Belum Ada (Perlu Migrasi)'}
              </span>
            </div>
          </div>

          <div className="pt-2 flex justify-between">
            <button
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Kembali
            </button>
            <button
              onClick={() => setCurrentStep(connectionStatus.schemaVersion ? 4 : 3)}
              className="px-5 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl flex items-center gap-1.5"
            >
              <span>{connectionStatus.schemaVersion ? 'Lanjut ke Superadmin' : 'Lanjut ke Migrasi Skema'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: BUAT TABEL / MIGRASI */}
      {currentStep === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Langkah 3: Pembuatan Skema Database</h2>
            <p className="text-xs text-slate-500">
              Buat tabel master, view mutasi saldo, limit monitoring, dan data awal aplikasi.
            </p>
          </div>

          {/* Toggle Choice */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setMigrationMode('auto')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                migrationMode === 'auto' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pilihan 1: Otomatis via Serverless (/api/setup)
            </button>
            <button
              type="button"
              onClick={() => setMigrationMode('manual')}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                migrationMode === 'manual' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pilihan 2: Manual (Supabase SQL Editor)
            </button>
          </div>

          {migrationMode === 'auto' ? (
            <form onSubmit={handleRunAutoMigration} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Database Connection String (URI PostgreSQL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={connectionString}
                  onChange={(e) => setConnectionString(e.target.value)}
                  placeholder="postgresql://postgres:[PASSWORD]@db.xxxx.supabase.co:5432/postgres"
                  className="w-full px-3 py-2.5 text-xs font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Ambil dari Supabase &gt; Project Settings &gt; Database &gt; Connection String (URI). Hanya dipakai sekali untuk migrasi dan tidak pernah disimpan.
                </p>
              </div>

              {migrationLogs.length > 0 && (
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto">
                  {migrationLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={runningMigration || !connectionString}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-50"
                >
                  {runningMigration ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menjalankan Migrasi...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Jalankan Migrasi Database</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Salin seluruh script migrasi <code>supabase/migrations/001_init.sql</code>, buka SQL Editor di Supabase, tempel dan jalankan:
              </p>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-2 hover:bg-slate-800 transition-colors"
                >
                  {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedSql ? 'SQL Berhasil Disalin!' : 'Salin SQL Migrasi'}</span>
                </button>

                <a
                  href="https://supabase.com/dashboard"
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-50 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-slate-500" />
                  <span>Buka Supabase Dashboard</span>
                </a>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                Setelah selesai menjalankan SQL di Supabase, klik tombol di bawah untuk memeriksa kembali:
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Saya Sudah Menjalankan, Cek Ulang</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: BUAT SUPERADMIN */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
          <div>
            <h2 className="text-base font-bold text-slate-900">Langkah 4: Akun Superadmin Pertama</h2>
            <p className="text-xs text-slate-500">
              Buat akun administrator utama keluarga yang memegang hak penuh aplikasi.
            </p>
          </div>

          <form onSubmit={handleCreateSuperadmin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap Superadmin <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="Contoh: Alfian Faiz"
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alamat Email Login <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@keluarga.com"
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kata Sandi Baru (Min. 6 Karakter) <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Buat kata sandi aman"
                className="w-full px-3 py-2.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1E6B4F]"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Kembali
              </button>
              <button
                type="submit"
                disabled={creatingAdmin || !adminPassword}
                className="px-6 py-2.5 text-xs font-bold text-white bg-[#1E6B4F] hover:bg-[#16523c] rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-50"
              >
                {creatingAdmin ? (
                  <span>Menyimpan Superadmin...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Simpan & Masuk ke Dashboard</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VERCEL DEPLOYMENT SNIPPET */}
      <div className="mt-8 bg-slate-900 text-slate-100 rounded-2xl p-6 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">Panduan Deploy ke Vercel</h3>
            <p className="text-xs text-slate-400">
              Salin environment variable ini agar aplikasi langsung terhubung untuk seluruh anggota keluarga tanpa input ulang.
            </p>
          </div>
          <button
            onClick={handleCopyVercelEnv}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            {copiedVercel ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedVercel ? 'Disalin!' : 'Salin untuk Vercel'}</span>
          </button>
        </div>

        <pre className="p-3 bg-slate-950 rounded-xl text-xs font-mono overflow-x-auto text-emerald-400">
          {`VITE_SUPABASE_URL=${url || 'https://your-project.supabase.co'}\nVITE_SUPABASE_ANON_KEY=${anonKey || 'eyJhbGciOiJIUzI1Ni...'}`}
        </pre>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          <strong>Langkah di Vercel:</strong> Buka Project Anda &gt; <em>Settings</em> &gt; <em>Environment Variables</em> &gt; Tambahkan kedua variabel di atas &gt; Klik <em>Redeploy</em>.
        </p>
      </div>
    </div>
  );
}
