import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider, useData } from './context/DataContext';
import { ToastProvider } from './components/layout/NotificationToast';
import { Navbar } from './components/layout/Navbar';
import { LoginView } from './components/auth/LoginView';
import { SupabaseSetupView } from './components/integration/SupabaseSetupView';
import { DashboardView } from './components/dashboard/DashboardView';
import { TransactionListView } from './components/transactions/TransactionListView';
import { PlanningView } from './components/planning/PlanningView';
import { MasterDataView } from './components/master/MasterDataView';
import { getSupabaseConfig, isDemoModeActive } from './lib/supabase';

function MainApp() {
  const { currentUser, loading: authLoading } = useAuth();
  const { isLoading: dataLoading } = useData();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'transaksi' | 'perencanaan' | 'pengaturan'>('dashboard');
  const [pengaturanSubTab, setPengaturanSubTab] = useState<any>('accounts');
  const [showSetupWizard, setShowSetupWizard] = useState<boolean>(false);

  // Cek apakah konfigurasi Supabase sudah ada
  useEffect(() => {
    const config = getSupabaseConfig();
    const isDemo = isDemoModeActive();

    // Jika belum ada konfigurasi sama sekali pada first run, buka setup wizard
    if (!config && !isDemo && !currentUser) {
      setShowSetupWizard(true);
    }
  }, [currentUser]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#1E6B4F] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Memuat Daily Cashflow...</p>
        </div>
      </div>
    );
  }

  // Jika dipaksa setup wizard atau belum ada konfigurasi sama sekali
  if (showSetupWizard && !currentUser) {
    return <SupabaseSetupView onBackToApp={() => setShowSetupWizard(false)} />;
  }

  // Jika belum login, tampilkan LoginView
  if (!currentUser) {
    return <LoginView onOpenSetup={() => setShowSetupWizard(true)} />;
  }

  const handleOpenIntegrationFromNavbar = () => {
    setActiveTab('pengaturan');
    setPengaturanSubTab('integrasi');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Desktop Sidebar & Mobile Top/Bottom Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab: any) => {
          setActiveTab(tab);
          if (tab === 'pengaturan') {
            setPengaturanSubTab('accounts');
          }
        }}
        onOpenIntegrationTab={handleOpenIntegrationFromNavbar}
      />

      {/* Main Content Area - with left padding on desktop to clear sidebar */}
      <div className="flex-1 md:pl-64 min-w-0 flex flex-col min-h-screen pb-20 md:pb-8">
        <main className="flex-1">
          {dataLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <div className="w-8 h-8 border-3 border-[#1E6B4F] border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Sinkronisasi data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  onNavigateToTransactions={() => setActiveTab('transaksi')}
                  onNavigateToPlanning={() => setActiveTab('perencanaan')}
                />
              )}

              {activeTab === 'transaksi' && <TransactionListView />}

              {activeTab === 'perencanaan' && <PlanningView />}

              {activeTab === 'pengaturan' && (
                <MasterDataView initialTab={pengaturanSubTab} key={pengaturanSubTab} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <ToastProvider>
          <MainApp />
        </ToastProvider>
      </DataProvider>
    </AuthProvider>
  );
}
