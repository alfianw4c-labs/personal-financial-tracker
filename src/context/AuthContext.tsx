import React, { createContext, useContext, useState, useEffect } from 'react';
import bcrypt from 'bcryptjs';
import type { AppUser, UserRole } from '../types';
import { getSupabaseClient } from '../lib/supabase';
import { INITIAL_USERS } from '../lib/mockData';

interface AuthSessionUser {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  currentUser: AuthSessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isSuperAdmin: boolean;
  changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  setDirectSession: (user: AuthSessionUser) => void;
}

const AUTH_STORAGE_KEY = 'daily_cashflow_auth_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AuthSessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.id && parsed?.role) {
          setCurrentUser(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to parse auth session:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Email dan password wajib diisi.' };
    }

    const client = getSupabaseClient();

    // 1. Jika terhubung ke Supabase
    if (client) {
      try {
        const { data: users, error } = await client
          .from('app_users')
          .select('id, full_name, email, password_hash, role, is_active')
          .eq('email', cleanEmail)
          .limit(1);

        if (error) {
          return { success: false, error: `Gagal query user: ${error.message}` };
        }

        const user = users && users[0];
        if (!user) {
          return { success: false, error: 'Email atau password salah.' };
        }

        if (user.is_active === false) {
          return { success: false, error: 'Akun Anda dinonaktifkan. Hubungi superadmin.' };
        }

        const match = bcrypt.compareSync(cleanPassword, user.password_hash);
        if (!match) {
          return { success: false, error: 'Email atau password salah.' };
        }

        const sessionUser: AuthSessionUser = {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        };

        setCurrentUser(sessionUser);
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Terjadi kesalahan saat login.' };
      }
    }

    // 2. Demo / Local fallback
    const storedDemoUsers = localStorage.getItem('daily_cashflow_demo_users');
    const userPool: AppUser[] = storedDemoUsers ? JSON.parse(storedDemoUsers) : INITIAL_USERS;

    const user = userPool.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return { success: false, error: 'Email atau password salah.' };
    }

    if (user.is_active === false) {
      return { success: false, error: 'Akun Anda dinonaktifkan.' };
    }

    const match = user.password_hash ? bcrypt.compareSync(cleanPassword, user.password_hash) : false;
    if (!match) {
      return { success: false, error: 'Email atau password salah.' };
    }

    const sessionUser: AuthSessionUser = {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      role: user.role,
    };

    setCurrentUser(sessionUser);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  };

  const setDirectSession = (user: AuthSessionUser) => {
    setCurrentUser(user);
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'Belum login.' };
    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password baru minimal 6 karakter.' };
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data: users, error } = await client
          .from('app_users')
          .select('password_hash')
          .eq('id', currentUser.id)
          .single();

        if (error || !users) {
          return { success: false, error: 'Gagal memverifikasi user.' };
        }

        const match = bcrypt.compareSync(oldPassword, users.password_hash);
        if (!match) {
          return { success: false, error: 'Password lama tidak sesuai.' };
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        const { error: updateError } = await client
          .from('app_users')
          .update({ password_hash: newHash })
          .eq('id', currentUser.id);

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }

    // Demo fallback
    const newHash = bcrypt.hashSync(newPassword, 10);
    const storedDemoUsers = localStorage.getItem('daily_cashflow_demo_users');
    let userPool: AppUser[] = storedDemoUsers ? JSON.parse(storedDemoUsers) : INITIAL_USERS;
    const target = userPool.find((u) => u.id === currentUser.id);
    if (target && target.password_hash) {
      if (!bcrypt.compareSync(oldPassword, target.password_hash)) {
        return { success: false, error: 'Password lama tidak sesuai.' };
      }
      target.password_hash = newHash;
      localStorage.setItem('daily_cashflow_demo_users', JSON.stringify(userPool));
      return { success: true };
    }
    return { success: false, error: 'User tidak ditemukan.' };
  };

  const isSuperAdmin = currentUser?.role === 'superadmin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        login,
        logout,
        isSuperAdmin,
        changePassword,
        setDirectSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
