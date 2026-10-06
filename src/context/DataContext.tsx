import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import bcrypt from 'bcryptjs';
import type {
  TransactionType,
  Category,
  SubCategory,
  Account,
  FlowParty,
  Transaction,
  QuarterlyPlan,
  QuarterlyPlanItem,
  AppSettings,
  AppUser,
  MonthlyLimitStatus,
} from '../types';
import { getSupabaseClient, getSupabaseConfig, fetchServerSupabaseConfig } from '../lib/supabase';
import {
  INITIAL_TRANSACTION_TYPES,
  INITIAL_FLOW_PARTIES,
  INITIAL_CATEGORIES,
  INITIAL_SUB_CATEGORIES,
  INITIAL_ACCOUNTS,
  INITIAL_SETTINGS,
  INITIAL_PLANS,
  INITIAL_PLAN_ITEMS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
} from '../lib/mockData';
import { useAuth } from './AuthContext';

interface LimitExceedCheckResult {
  exceeded: boolean;
  subCategoryName: string;
  limit: number;
  totalSpent: number;
  diff: number;
}

interface DataContextType {
  transactionTypes: TransactionType[];
  categories: Category[];
  subCategories: SubCategory[];
  accounts: Account[];
  flowParties: FlowParty[];
  transactions: Transaction[];
  quarterlyPlans: QuarterlyPlan[];
  quarterlyPlanItems: QuarterlyPlanItem[];
  settings: AppSettings;
  appUsers: AppUser[];
  privacyMode: boolean;
  setPrivacyMode: React.Dispatch<React.SetStateAction<boolean>>;
  isLoading: boolean;
  isSupabaseConnected: boolean;
  dbSyncError: string | null;
  refetchAll: () => Promise<void>;

  // Account balances calculation
  getAccountBalance: (accountId: string) => number;

  // Monthly Limit Evaluation
  getMonthlyLimitStatusList: (year: number, month: number) => MonthlyLimitStatus[];
  checkLimitWarningAfterExpense: (subCategoryId: string, txDate: string, amount: number) => LimitExceedCheckResult | null;
  exceededLimitCountCurrentMonth: number;

  // Transaction CRUD
  addTransaction: (tx: Omit<Transaction, 'id' | 'created_at'>) => Promise<{ success: boolean; id?: string; error?: string; limitWarning?: LimitExceedCheckResult }>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<{ success: boolean; error?: string; limitWarning?: LimitExceedCheckResult }>;
  deleteTransaction: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Master Data CRUD
  saveTransactionType: (item: Partial<TransactionType>) => Promise<{ success: boolean; error?: string }>;
  deleteTransactionType: (id: string) => Promise<{ success: boolean; error?: string }>;

  saveCategory: (item: Partial<Category>) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => Promise<{ success: boolean; error?: string }>;

  saveSubCategory: (item: Partial<SubCategory>) => Promise<{ success: boolean; error?: string }>;
  deleteSubCategory: (id: string) => Promise<{ success: boolean; error?: string }>;

  saveAccount: (item: Partial<Account>) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: (id: string) => Promise<{ success: boolean; error?: string }>;

  saveFlowParty: (item: Partial<FlowParty>) => Promise<{ success: boolean; error?: string }>;
  deleteFlowParty: (id: string) => Promise<{ success: boolean; error?: string }>;

  saveAppSettings: (newSettings: Partial<AppSettings>) => Promise<{ success: boolean; error?: string }>;

  // Planning CRUD
  saveQuarterlyPlan: (plan: Partial<QuarterlyPlan>) => Promise<{ success: boolean; id?: string; error?: string }>;
  deleteQuarterlyPlan: (id: string) => Promise<{ success: boolean; error?: string }>;
  savePlanItem: (item: Partial<QuarterlyPlanItem>) => Promise<{ success: boolean; error?: string }>;
  deletePlanItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  copyPlanFromPreviousQuarter: (targetYear: number, targetQuarter: number) => Promise<{ success: boolean; count: number; error?: string }>;

  // User Management CRUD (Superadmin)
  saveAppUser: (user: { id?: string; full_name: string; email: string; password?: string; role: 'superadmin' | 'user'; is_active: boolean }) => Promise<{ success: boolean; error?: string }>;
  toggleUserStatus: (id: string, active: boolean) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (id: string, newPasswordPlain: string) => Promise<{ success: boolean; error?: string }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isSuperAdmin } = useAuth();

  const [transactionTypes, setTransactionTypes] = useState<TransactionType[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [flowParties, setFlowParties] = useState<FlowParty[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [quarterlyPlans, setQuarterlyPlans] = useState<QuarterlyPlan[]>([]);
  const [quarterlyPlanItems, setQuarterlyPlanItems] = useState<QuarterlyPlanItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>(INITIAL_SETTINGS);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);

  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return localStorage.getItem('daily_cashflow_privacy') === 'true';
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(() => !!getSupabaseConfig());
  const [dbSyncError, setDbSyncError] = useState<string | null>(null);

  // Sync privacy mode to localStorage
  useEffect(() => {
    localStorage.setItem('daily_cashflow_privacy', privacyMode ? 'true' : 'false');
  }, [privacyMode]);

  // Load from local storage or mock initial data
  const loadLocalFallback = useCallback(() => {
    try {
      const getStored = (key: string, fallback: any) => {
        const val = localStorage.getItem(`daily_cashflow_${key}`);
        return val ? JSON.parse(val) : fallback;
      };

      setTransactionTypes(getStored('transaction_types', INITIAL_TRANSACTION_TYPES));
      setFlowParties(getStored('flow_parties', INITIAL_FLOW_PARTIES));
      setCategories(getStored('categories', INITIAL_CATEGORIES));
      setSubCategories(getStored('sub_categories', INITIAL_SUB_CATEGORIES));
      setAccounts(getStored('accounts', INITIAL_ACCOUNTS));
      setSettings(getStored('settings', INITIAL_SETTINGS));
      setQuarterlyPlans(getStored('quarterly_plans', INITIAL_PLANS));
      setQuarterlyPlanItems(getStored('quarterly_plan_items', INITIAL_PLAN_ITEMS));
      const storedTxs = getStored('transactions', []);
      const cleanTxs = Array.isArray(storedTxs)
        ? storedTxs.filter((t: any) => !t.id?.startsWith('tx-0'))
        : [];
      setTransactions(cleanTxs);
      const storedUsers = getStored('demo_users', INITIAL_USERS);
      setAppUsers(Array.isArray(storedUsers) && storedUsers.length >= 3 ? storedUsers : INITIAL_USERS);
    } catch (e) {
      console.error('Error loading fallback data:', e);
    }
  }, []);

  const saveLocalStore = useCallback((key: string, data: any) => {
    try {
      localStorage.setItem(`daily_cashflow_${key}`, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to local storage:`, e);
    }
  }, []);

  const refetchAll = useCallback(async () => {
    setIsLoading(true);
    setDbSyncError(null);

    // Auto-detect server-side Supabase environment variable jika belum terpasang
    let config = getSupabaseConfig();
    if (!config) {
      config = await fetchServerSupabaseConfig();
    }
    const hasConfig = !!config;
    setIsSupabaseConnected(hasConfig);

    const client = getSupabaseClient();

    if (!client) {
      loadLocalFallback();
      setIsLoading(false);
      return;
    }

    try {
      // Fetch in parallel
      const [
        typesRes,
        partiesRes,
        catRes,
        subCatRes,
        accRes,
        txRes,
        plansRes,
        planItemsRes,
        settingsRes,
        usersRes,
      ] = await Promise.all([
        client.from('transaction_types').select('*').order('name'),
        client.from('flow_parties').select('*').order('sort_order'),
        client.from('categories').select('*').order('name'),
        client.from('sub_categories').select('*').order('name'),
        client.from('accounts').select('*').order('sort_order'),
        client.from('transactions').select('*').order('tx_date', { ascending: false }),
        client.from('quarterly_plans').select('*').order('year', { ascending: false }),
        client.from('quarterly_plan_items').select('*'),
        client.from('settings').select('*').maybeSingle(),
        client.from('app_users').select('*').order('full_name'),
      ]);

      if (usersRes.error) {
        console.warn('Gagal membaca tabel app_users di Supabase:', usersRes.error);
        setDbSyncError(`Gagal membaca app_users: ${usersRes.error.message}`);
      }

      if (typesRes.data && typesRes.data.length > 0) {
        setTransactionTypes(typesRes.data);
      } else {
        setTransactionTypes(INITIAL_TRANSACTION_TYPES);
      }

      if (partiesRes.data && partiesRes.data.length > 0) {
        setFlowParties(partiesRes.data);
      } else {
        setFlowParties(INITIAL_FLOW_PARTIES);
      }

      if (catRes.data && catRes.data.length > 0) {
        setCategories(catRes.data);
      } else {
        setCategories(INITIAL_CATEGORIES);
      }

      if (subCatRes.data && subCatRes.data.length > 0) {
        setSubCategories(subCatRes.data);
      } else {
        setSubCategories(INITIAL_SUB_CATEGORIES);
      }

      if (accRes.data && accRes.data.length > 0) {
        setAccounts(accRes.data);
      } else {
        setAccounts(INITIAL_ACCOUNTS);
      }

      if (txRes.data) {
        setTransactions(txRes.data);
      }

      if (plansRes.data && plansRes.data.length > 0) {
        setQuarterlyPlans(plansRes.data);
      } else {
        setQuarterlyPlans(INITIAL_PLANS);
      }

      if (planItemsRes.data && planItemsRes.data.length > 0) {
        setQuarterlyPlanItems(planItemsRes.data);
      } else {
        setQuarterlyPlanItems(INITIAL_PLAN_ITEMS);
      }

      if (settingsRes.data) {
        setSettings(settingsRes.data);
      }

      if (usersRes.data && usersRes.data.length > 0) {
        setAppUsers(usersRes.data as AppUser[]);
      } else if (!usersRes.error) {
        // Jika tabel ada tapi belum ada user di Supabase
        setAppUsers(INITIAL_USERS);
      }
    } catch (err: any) {
      console.error('Failed to fetch from Supabase, using local fallback:', err);
      setDbSyncError(err?.message || 'Gagal terhubung ke Supabase');
      loadLocalFallback();
    } finally {
      setIsLoading(false);
    }
  }, [loadLocalFallback]);

  useEffect(() => {
    refetchAll();
  }, [refetchAll]);

  // Join transactions with master data for display
  const enrichedTransactions = useMemo(() => {
    const typeMap = new Map(transactionTypes.map((t) => [t.id, t]));
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const subCatMap = new Map(subCategories.map((s) => [s.id, s]));
    const accMap = new Map(accounts.map((a) => [a.id, a]));
    const partyMap = new Map(flowParties.map((p) => [p.id, p]));

    return transactions.map((t) => {
      const type = typeMap.get(t.transaction_type_id);
      const cat = t.category_id ? catMap.get(t.category_id) : undefined;
      const subCat = t.sub_category_id ? subCatMap.get(t.sub_category_id) : undefined;

      // Label sumber dan tujuan
      let sourceName = '-';
      let destName = '-';

      if (type?.kind === 'income') {
        sourceName = t.source_party_id ? partyMap.get(t.source_party_id)?.name || '-' : '-';
        destName = t.destination_account_id ? accMap.get(t.destination_account_id)?.name || '-' : '-';
      } else if (type?.kind === 'expense') {
        sourceName = t.source_account_id ? accMap.get(t.source_account_id)?.name || '-' : '-';
        destName = t.destination_party_id ? partyMap.get(t.destination_party_id)?.name || '-' : '-';
      } else if (type?.kind === 'transfer') {
        sourceName = t.source_account_id ? accMap.get(t.source_account_id)?.name || '-' : '-';
        destName = t.destination_account_id ? accMap.get(t.destination_account_id)?.name || '-' : '-';
      }

      return {
        ...t,
        type_name: type?.name || '-',
        type_kind: type?.kind || 'expense',
        category_name: cat?.name || '-',
        sub_category_name: subCat?.name || '-',
        sub_category_color: subCat?.color || cat?.color || '#94a3b8',
        source_name: sourceName,
        destination_name: destName,
      };
    });
  }, [transactions, transactionTypes, categories, subCategories, accounts, flowParties]);

  // Hitung saldo akun dinamis (opening_balance + masuk - keluar)
  const getAccountBalance = useCallback(
    (accountId: string): number => {
      const acc = accounts.find((a) => a.id === accountId);
      if (!acc) return 0;
      const opening = Number(acc.opening_balance) || 0;

      let inbound = 0;
      let outbound = 0;

      for (const t of transactions) {
        const amt = Number(t.amount) || 0;
        if (t.destination_account_id === accountId) {
          inbound += amt;
        }
        if (t.source_account_id === accountId) {
          outbound += amt;
        }
      }

      return opening + inbound - outbound;
    },
    [accounts, transactions]
  );

  // Perkaya data akun dengan `current_balance`
  const enrichedAccounts = useMemo(() => {
    return accounts.map((acc) => ({
      ...acc,
      current_balance: getAccountBalance(acc.id),
    }));
  }, [accounts, getAccountBalance]);

  // Perhitungan status limit bulanan
  const getMonthlyLimitStatusList = useCallback(
    (year: number, month1to12: number): MonthlyLimitStatus[] => {
      const quarter = Math.ceil(month1to12 / 3);
      const plan = quarterlyPlans.find((p) => Number(p.year) === year && Number(p.quarter) === quarter);
      const planItems = quarterlyPlanItems.filter((i) => i.plan_id === plan?.id);

      // Hitung pengeluaran per sub kategori untuk bulan tersebut
      const spentBySubCat: Record<string, number> = {};

      const monthStr = `${year}-${String(month1to12).padStart(2, '0')}`;

      for (const t of transactions) {
        if (!t.tx_date || !t.tx_date.startsWith(monthStr)) continue;
        const type = transactionTypes.find((tt) => tt.id === t.transaction_type_id);
        if (type?.kind === 'expense' && t.sub_category_id) {
          spentBySubCat[t.sub_category_id] = (spentBySubCat[t.sub_category_id] || 0) + Number(t.amount);
        }
      }

      // Daftar sub kategori di bawah tipe expense
      const expenseTypeIds = new Set(transactionTypes.filter((t) => t.kind === 'expense').map((t) => t.id));
      const expenseCatIds = new Set(categories.filter((c) => expenseTypeIds.has(c.transaction_type_id)).map((c) => c.id));
      const expenseSubCats = subCategories.filter((s) => expenseCatIds.has(s.category_id));

      const result: MonthlyLimitStatus[] = [];

      for (const sub of expenseSubCats) {
        const planItem = planItems.find((pi) => pi.sub_category_id === sub.id);
        const effectiveLimit = planItem ? Number(planItem.monthly_limit) : (sub.default_limit !== null && sub.default_limit !== undefined ? Number(sub.default_limit) : null);
        const spent = spentBySubCat[sub.id] || 0;
        const cat = categories.find((c) => c.id === sub.category_id);

        let status: 'aman' | 'mendekati' | 'melebihi' | 'tanpa_limit' = 'tanpa_limit';
        let remaining: number | undefined = undefined;
        let percentage: number | undefined = undefined;

        if (effectiveLimit !== null && effectiveLimit !== undefined && effectiveLimit > 0) {
          remaining = effectiveLimit - spent;
          percentage = Math.round((spent / effectiveLimit) * 100);

          if (spent > effectiveLimit) {
            status = 'melebihi';
          } else if (spent >= 0.8 * effectiveLimit) {
            status = 'mendekati';
          } else {
            status = 'aman';
          }
        }

        result.push({
          month: `${monthStr}-01`,
          sub_category_id: sub.id,
          sub_category_name: sub.name,
          category_name: cat?.name || '-',
          monthly_limit: effectiveLimit,
          spent,
          remaining,
          percentage,
          status,
        });
      }

      return result.sort((a, b) => (b.spent || 0) - (a.spent || 0));
    },
    [quarterlyPlans, quarterlyPlanItems, transactions, transactionTypes, categories, subCategories]
  );

  // Cek apakah penambahan pengeluaran menyebabkan sub kategori melebihi limit
  const checkLimitWarningAfterExpense = useCallback(
    (subCategoryId: string, txDate: string, additionalAmount: number): LimitExceedCheckResult | null => {
      if (!subCategoryId || !txDate || additionalAmount <= 0) return null;
      const date = new Date(txDate);
      if (isNaN(date.getTime())) return null;

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const quarter = Math.ceil(month / 3);

      const plan = quarterlyPlans.find((p) => Number(p.year) === year && Number(p.quarter) === quarter);
      const planItem = quarterlyPlanItems.find((pi) => pi.plan_id === plan?.id && pi.sub_category_id === subCategoryId);
      const subCat = subCategories.find((s) => s.id === subCategoryId);

      const effectiveLimit = planItem ? Number(planItem.monthly_limit) : (subCat?.default_limit !== null && subCat?.default_limit !== undefined ? Number(subCat.default_limit) : null);
      if (effectiveLimit === null || effectiveLimit === undefined || effectiveLimit <= 0) {
        return null;
      }

      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      let currentMonthSpent = 0;

      for (const t of transactions) {
        if (!t.tx_date || !t.tx_date.startsWith(monthStr)) continue;
        if (t.sub_category_id === subCategoryId) {
          const type = transactionTypes.find((tt) => tt.id === t.transaction_type_id);
          if (type?.kind === 'expense') {
            currentMonthSpent += Number(t.amount);
          }
        }
      }

      const newTotal = currentMonthSpent + additionalAmount;
      if (newTotal > effectiveLimit) {
        return {
          exceeded: true,
          subCategoryName: subCat?.name || 'Sub Kategori',
          limit: effectiveLimit,
          totalSpent: newTotal,
          diff: newTotal - effectiveLimit,
        };
      }

      return null;
    },
    [quarterlyPlans, quarterlyPlanItems, subCategories, transactions, transactionTypes]
  );

  // Hitung berapa sub kategori yang melebihi limit di bulan berjalan (Oktober 2026 atau bulan lokal saat ini)
  const exceededLimitCountCurrentMonth = useMemo(() => {
    const today = new Date();
    // Gunakan tahun 2026 dan bulan 10 jika demo atau sesuai tanggal hari ini
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    const list = getMonthlyLimitStatusList(year, month);
    return list.filter((item) => item.status === 'melebihi').length;
  }, [getMonthlyLimitStatusList]);

  // ==========================================
  // TRANSACTION CRUD
  // ==========================================
  const addTransaction = async (txData: Omit<Transaction, 'id' | 'created_at'>) => {
    // Periksa apakah ini expense dan memicu warning limit
    let limitWarning: LimitExceedCheckResult | undefined = undefined;
    const txType = transactionTypes.find((tt) => tt.id === txData.transaction_type_id);
    if (txType?.kind === 'expense' && txData.sub_category_id) {
      const warn = checkLimitWarningAfterExpense(txData.sub_category_id, txData.tx_date, txData.amount);
      if (warn) limitWarning = warn;
    }

    const client = getSupabaseClient();
    const newTx: Transaction = {
      ...txData,
      id: crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`,
      created_by: currentUser?.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (client) {
      try {
        const { data, error } = await client
          .from('transactions')
          .insert({
            tx_date: txData.tx_date,
            transaction_type_id: txData.transaction_type_id,
            category_id: txData.category_id || null,
            sub_category_id: txData.sub_category_id || null,
            source_account_id: txData.source_account_id || null,
            source_party_id: txData.source_party_id || null,
            destination_account_id: txData.destination_account_id || null,
            destination_party_id: txData.destination_party_id || null,
            amount: txData.amount,
            description: txData.description || null,
            created_by: currentUser?.id || null,
          })
          .select('id')
          .single();

        if (error) {
          return { success: false, error: error.message };
        }
        await refetchAll();
        return { success: true, id: data?.id, limitWarning };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Local/demo fallback
    const updated = [newTx, ...transactions];
    setTransactions(updated);
    saveLocalStore('transactions', updated);
    return { success: true, id: newTx.id, limitWarning };
  };

  const updateTransaction = async (id: string, updates: Partial<Transaction>) => {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { error } = await client
          .from('transactions')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) return { success: false, error: error.message };
        await refetchAll();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Fallback
    const updated = transactions.map((t) => (t.id === id ? { ...t, ...updates, updated_at: new Date().toISOString() } : t));
    setTransactions(updated);
    saveLocalStore('transactions', updated);
    return { success: true };
  };

  const deleteTransaction = async (id: string) => {
    const client = getSupabaseClient();

    if (client) {
      try {
        const { error } = await client.from('transactions').delete().eq('id', id);
        if (error) return { success: false, error: error.message };
        await refetchAll();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    const updated = transactions.filter((t) => t.id !== id);
    setTransactions(updated);
    saveLocalStore('transactions', updated);
    return { success: true };
  };

  // ==========================================
  // MASTER DATA CRUD (With dependency checks)
  // ==========================================
  const saveTransactionType = async (item: Partial<TransactionType>) => {
    const client = getSupabaseClient();
    const id = item.id || (crypto.randomUUID ? crypto.randomUUID() : `tt-${Date.now()}`);
    const payload = { ...item, id, is_active: item.is_active ?? true };

    if (client) {
      try {
        const { error } = await client.from('transaction_types').upsert(payload);
        if (error) return { success: false, error: error.message };
        await refetchAll();
        return { success: true };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }

    const exists = transactionTypes.some((t) => t.id === id);
    const updated = exists ? transactionTypes.map((t) => (t.id === id ? { ...t, ...payload } : t)) : [...transactionTypes, payload as TransactionType];
    setTransactionTypes(updated);
    saveLocalStore('transaction_types', updated);
    return { success: true };
  };

  const deleteTransactionType = async (id: string) => {
    const inUse = transactions.some((t) => t.transaction_type_id === id);
    if (inUse) {
      // Nonaktifkan jika sudah dipakai
      await saveTransactionType({ id, is_active: false });
      return { success: false, error: 'Tipe transaksi telah dipakai di transaksi! Data otomatis dinonaktifkan (is_active = false) untuk menjaga keutuhan riwayat.' };
    }

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('transaction_types').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const updated = transactionTypes.filter((t) => t.id !== id);
    setTransactionTypes(updated);
    saveLocalStore('transaction_types', updated);
    return { success: true };
  };

  const saveCategory = async (item: Partial<Category>) => {
    const client = getSupabaseClient();
    const id = item.id || (crypto.randomUUID ? crypto.randomUUID() : `cat-${Date.now()}`);
    const payload = { ...item, id, is_active: item.is_active ?? true };

    if (client) {
      const { error } = await client.from('categories').upsert(payload);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const exists = categories.some((c) => c.id === id);
    const updated = exists ? categories.map((c) => (c.id === id ? { ...c, ...payload } : c)) : [...categories, payload as Category];
    setCategories(updated);
    saveLocalStore('categories', updated);
    return { success: true };
  };

  const deleteCategory = async (id: string) => {
    const inUse = transactions.some((t) => t.category_id === id);
    if (inUse) {
      await saveCategory({ id, is_active: false });
      return { success: false, error: 'Kategori ini dipakai di transaksi! Kategori dinonaktifkan (is_active = false) agar riwayat tetap utuh.' };
    }

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('categories').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const updated = categories.filter((c) => c.id !== id);
    setCategories(updated);
    saveLocalStore('categories', updated);
    return { success: true };
  };

  const saveSubCategory = async (item: Partial<SubCategory>) => {
    const client = getSupabaseClient();
    const id = item.id || (crypto.randomUUID ? crypto.randomUUID() : `sc-${Date.now()}`);
    const payload = { ...item, id, is_active: item.is_active ?? true };

    if (client) {
      const { error } = await client.from('sub_categories').upsert(payload);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const exists = subCategories.some((s) => s.id === id);
    const updated = exists ? subCategories.map((s) => (s.id === id ? { ...s, ...payload } : s)) : [...subCategories, payload as SubCategory];
    setSubCategories(updated);
    saveLocalStore('sub_categories', updated);
    return { success: true };
  };

  const deleteSubCategory = async (id: string) => {
    const inUse = transactions.some((t) => t.sub_category_id === id);
    if (inUse) {
      await saveSubCategory({ id, is_active: false });
      return { success: false, error: 'Sub Kategori telah dipakai dalam transaksi! Dinonaktifkan (is_active = false) demi konsistensi data.' };
    }

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('sub_categories').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const updated = subCategories.filter((s) => s.id !== id);
    setSubCategories(updated);
    saveLocalStore('sub_categories', updated);
    return { success: true };
  };

  const saveAccount = async (item: Partial<Account>) => {
    const client = getSupabaseClient();
    const id = item.id || (crypto.randomUUID ? crypto.randomUUID() : `acc-${Date.now()}`);
    const payload = { ...item, id, is_active: item.is_active ?? true };

    if (client) {
      const { error } = await client.from('accounts').upsert(payload);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const exists = accounts.some((a) => a.id === id);
    const updated = exists ? accounts.map((a) => (a.id === id ? { ...a, ...payload } : a)) : [...accounts, payload as Account];
    setAccounts(updated);
    saveLocalStore('accounts', updated);
    return { success: true };
  };

  const deleteAccount = async (id: string) => {
    const inUse = transactions.some((t) => t.source_account_id === id || t.destination_account_id === id);
    if (inUse) {
      await saveAccount({ id, is_active: false });
      return { success: false, error: 'Akun telah memiliki mutasi transaksi! Akun dinonaktifkan (is_active = false) untuk menjaga audit trail.' };
    }

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('accounts').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const updated = accounts.filter((a) => a.id !== id);
    setAccounts(updated);
    saveLocalStore('accounts', updated);
    return { success: true };
  };

  const saveFlowParty = async (item: Partial<FlowParty>) => {
    const client = getSupabaseClient();
    const id = item.id || (crypto.randomUUID ? crypto.randomUUID() : `party-${Date.now()}`);
    const payload = { ...item, id, is_active: item.is_active ?? true };

    if (client) {
      const { error } = await client.from('flow_parties').upsert(payload);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const exists = flowParties.some((p) => p.id === id);
    const updated = exists ? flowParties.map((p) => (p.id === id ? { ...p, ...payload } : p)) : [...flowParties, payload as FlowParty];
    setFlowParties(updated);
    saveLocalStore('flow_parties', updated);
    return { success: true };
  };

  const deleteFlowParty = async (id: string) => {
    const inUse = transactions.some((t) => t.source_party_id === id || t.destination_party_id === id);
    if (inUse) {
      await saveFlowParty({ id, is_active: false });
      return { success: false, error: 'Pihak sumber/tujuan ini pernah dicatat di transaksi! Status dinonaktifkan (is_active = false).' };
    }

    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('flow_parties').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const updated = flowParties.filter((p) => p.id !== id);
    setFlowParties(updated);
    saveLocalStore('flow_parties', updated);
    return { success: true };
  };

  const saveAppSettings = async (newSettings: Partial<AppSettings>) => {
    const payload = { ...settings, ...newSettings, id: 1 };
    const client = getSupabaseClient();

    if (client) {
      const { error } = await client.from('settings').upsert(payload);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    setSettings(payload);
    saveLocalStore('settings', payload);
    return { success: true };
  };

  // ==========================================
  // PLANNING CRUD
  // ==========================================
  const saveQuarterlyPlan = async (plan: Partial<QuarterlyPlan>) => {
    const client = getSupabaseClient();
    const id = plan.id || (crypto.randomUUID ? crypto.randomUUID() : `plan-${Date.now()}`);
    const payload = { ...plan, id, created_by: currentUser?.id, created_at: new Date().toISOString() };

    if (client) {
      const { error } = await client.from('quarterly_plans').upsert({
        id,
        year: plan.year,
        quarter: plan.quarter,
        title: plan.title,
        notes: plan.notes,
        created_by: currentUser?.id,
      });
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true, id };
    }

    const exists = quarterlyPlans.some((p) => p.id === id);
    const updated = exists ? quarterlyPlans.map((p) => (p.id === id ? { ...p, ...payload } : p)) : [...quarterlyPlans, payload as QuarterlyPlan];
    setQuarterlyPlans(updated);
    saveLocalStore('quarterly_plans', updated);
    return { success: true, id };
  };

  const deleteQuarterlyPlan = async (id: string) => {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('quarterly_plans').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    setQuarterlyPlans(quarterlyPlans.filter((p) => p.id !== id));
    setQuarterlyPlanItems(quarterlyPlanItems.filter((i) => i.plan_id !== id));
    saveLocalStore('quarterly_plans', quarterlyPlans.filter((p) => p.id !== id));
    saveLocalStore('quarterly_plan_items', quarterlyPlanItems.filter((i) => i.plan_id !== id));
    return { success: true };
  };

  const savePlanItem = async (item: Partial<QuarterlyPlanItem>) => {
    const client = getSupabaseClient();
    const id = item.id || (crypto.randomUUID ? crypto.randomUUID() : `pi-${Date.now()}`);
    const payload = { ...item, id };

    if (client) {
      const { error } = await client.from('quarterly_plan_items').upsert(payload);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const exists = quarterlyPlanItems.some((i) => i.id === id);
    const updated = exists ? quarterlyPlanItems.map((i) => (i.id === id ? { ...i, ...payload } : i)) : [...quarterlyPlanItems, payload as QuarterlyPlanItem];
    setQuarterlyPlanItems(updated);
    saveLocalStore('quarterly_plan_items', updated);
    return { success: true };
  };

  const deletePlanItem = async (id: string) => {
    const client = getSupabaseClient();
    if (client) {
      const { error } = await client.from('quarterly_plan_items').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      await refetchAll();
      return { success: true };
    }

    const updated = quarterlyPlanItems.filter((i) => i.id !== id);
    setQuarterlyPlanItems(updated);
    saveLocalStore('quarterly_plan_items', updated);
    return { success: true };
  };

  const copyPlanFromPreviousQuarter = async (targetYear: number, targetQuarter: number) => {
    // Cari kuartal sebelumnya
    let prevYear = targetYear;
    let prevQuarter = targetQuarter - 1;
    if (prevQuarter < 1) {
      prevQuarter = 4;
      prevYear = targetYear - 1;
    }

    const prevPlan = quarterlyPlans.find((p) => Number(p.year) === prevYear && Number(p.quarter) === prevQuarter);
    if (!prevPlan) {
      return { success: false, count: 0, error: `Tidak ditemukan rencana untuk Q${prevQuarter} ${prevYear}` };
    }

    const prevItems = quarterlyPlanItems.filter((i) => i.plan_id === prevPlan.id);
    if (prevItems.length === 0) {
      return { success: false, count: 0, error: `Kuartal sebelumnya tidak memiliki item limit.` };
    }

    // Pastikan target plan ada
    let targetPlan = quarterlyPlans.find((p) => Number(p.year) === targetYear && Number(p.quarter) === targetQuarter);
    let targetPlanId = targetPlan?.id;

    if (!targetPlanId) {
      const planRes = await saveQuarterlyPlan({
        year: targetYear,
        quarter: targetQuarter,
        title: `Q${targetQuarter} ${targetYear}`,
        notes: `Salinan dari Q${prevQuarter} ${prevYear}`,
      });
      if (!planRes.success || !planRes.id) {
        return { success: false, count: 0, error: planRes.error || 'Gagal membuat rencana kuartal baru' };
      }
      targetPlanId = planRes.id;
    }

    // Salin item
    let copiedCount = 0;
    for (const item of prevItems) {
      const newId = crypto.randomUUID ? crypto.randomUUID() : `pi-${Date.now()}-${Math.random()}`;
      await savePlanItem({
        id: newId,
        plan_id: targetPlanId,
        sub_category_id: item.sub_category_id,
        monthly_limit: item.monthly_limit,
        note: item.note ? `(Salinan Q${prevQuarter}) ${item.note}` : `Salinan Q${prevQuarter}`,
      });
      copiedCount++;
    }

    return { success: true, count: copiedCount };
  };

  // ==========================================
  // USER MANAGEMENT CRUD (Superadmin)
  // ==========================================
  const saveAppUser = async (user: { id?: string; full_name: string; email: string; password?: string; role: 'superadmin' | 'user'; is_active: boolean }) => {
    if (!isSuperAdmin) {
      return { success: false, error: 'Hanya superadmin yang memiliki akses mengelola user.' };
    }

    const client = getSupabaseClient();
    const id = user.id || (crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`);

    const payload: any = {
      id,
      full_name: user.full_name,
      email: user.email.toLowerCase().trim(),
      role: user.role,
      is_active: user.is_active,
    };

    if (user.password && user.password.length >= 6) {
      payload.password_hash = bcrypt.hashSync(user.password, 10);
    }

    if (client) {
      try {
        const { error } = await client.from('app_users').upsert(payload);
        if (error) return { success: false, error: error.message };
        await refetchAll();
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Demo store
    const storedDemoUsers = localStorage.getItem('daily_cashflow_demo_users');
    let pool: AppUser[] = storedDemoUsers ? JSON.parse(storedDemoUsers) : INITIAL_USERS;
    const exists = pool.some((u) => u.id === id);
    if (exists) {
      pool = pool.map((u) => (u.id === id ? { ...u, ...payload, password_hash: payload.password_hash || u.password_hash } : u));
    } else {
      if (!payload.password_hash) {
        payload.password_hash = bcrypt.hashSync('user123', 10);
      }
      pool.push(payload);
    }
    localStorage.setItem('daily_cashflow_demo_users', JSON.stringify(pool));
    setAppUsers(pool);
    return { success: true };
  };

  const toggleUserStatus = async (id: string, active: boolean) => {
    if (!isSuperAdmin) return { success: false, error: 'Akses ditolak.' };
    return saveAppUser({
      ...appUsers.find((u) => u.id === id)!,
      is_active: active,
    });
  };

  const resetUserPassword = async (id: string, newPasswordPlain: string) => {
    if (!isSuperAdmin) return { success: false, error: 'Akses ditolak.' };
    if (!newPasswordPlain || newPasswordPlain.length < 6) {
      return { success: false, error: 'Password baru minimal 6 karakter.' };
    }
    const target = appUsers.find((u) => u.id === id);
    if (!target) return { success: false, error: 'User tidak ditemukan.' };

    return saveAppUser({
      ...target,
      password: newPasswordPlain,
    });
  };

  return (
    <DataContext.Provider
      value={{
        transactionTypes,
        categories,
        subCategories,
        accounts: enrichedAccounts,
        flowParties,
        transactions: enrichedTransactions,
        quarterlyPlans,
        quarterlyPlanItems,
        settings,
        appUsers,
        privacyMode,
        setPrivacyMode,
        isLoading,
        isSupabaseConnected,
        dbSyncError,
        refetchAll,
        getAccountBalance,
        getMonthlyLimitStatusList,
        checkLimitWarningAfterExpense,
        exceededLimitCountCurrentMonth,
        addTransaction,
        updateTransaction,
        deleteTransaction,
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
        saveQuarterlyPlan,
        deleteQuarterlyPlan,
        savePlanItem,
        deletePlanItem,
        copyPlanFromPreviousQuarter,
        saveAppUser,
        toggleUserStatus,
        resetUserPassword,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
