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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; code?: string }>;
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
    const validateSession = async () => {
      try {
        const stored = localStorage.getItem(AUTH_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.id && parsed?.role) {
            const client = getSupabaseClient();
            if (client) {
              const { data: dbUser, error } = await client
                .from('app_users')
                .select('id, full_name, email, role, is_active')
                .eq('id', parsed.id)
                .maybeSingle();

              if (!error && dbUser) {
                if (dbUser.is_active === false) {
                  // User dinonaktifkan: batalkan sesi dan redirect ke login
                  localStorage.removeItem(AUTH_STORAGE_KEY);
                  setCurrentUser(null);
                  setLoading(false);
                  return;
                }
                const sessionUser: AuthSessionUser = {
                  id: dbUser.id,
                  full_name: dbUser.full_name,
                  email: dbUser.email,
                  role: dbUser.role,
                };
                setCurrentUser(sessionUser);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
                setLoading(false);
                return;
              }
            }
            setCurrentUser(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to parse auth session:', e);
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setCurrentUser(null);
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; code?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { success: false, error: 'Email dan kata sandi wajib diisi.' };
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
          if (
            error.code === '42P01' ||
            error.message.includes('does not exist') ||
            error.message.includes('app_users')
          ) {
            return {
              success: false,
              code: 'SCHEMA_NOT_FOUND',
              error:
                'Tabel app_users belum dibuat di database Supabase Anda. Buka menu "Atur Koneksi / Query SQL" di bawah dan jalankan query di Supabase SQL Editor.',
            };
          }
          if (error.code === '42501' || error.message.includes('permission denied')) {
            return {
              success: false,
              code: 'PERMISSION_DENIED',
              error:
                'Izin akses tabel app_users ditolak. Silakan jalankan query RLS di Supabase agar role anon diizinkan.',
            };
          }
          return {
            success: false,
            error: `Gagal membaca database Supabase: ${error.message}`,
          };
        }

        const user = users && users[0];

        // Jika user tidak ditemukan berdasarkan email
        if (!user) {
          // Cek apakah tabel app_users masih kosong (belum ada baris sama sekali)
          const { count, error: countErr } = await client
            .from('app_users')
            .select('id', { count: 'exact', head: true });

          if (!countErr && (count === 0 || count === null)) {
            // Jika tabel kosong dan user mencoba email admin default
            const isDefaultSuperadmin =
              (cleanEmail === 'admin@dailycashflow.local' ||
                cleanEmail === 'alfianfaiz.w4c@gmail.com') &&
              cleanPassword === 'admin123';

            if (isDefaultSuperadmin) {
              // Otomatis seed akun superadmin ke Supabase agar user langsung bisa masuk!
              const autoAdmin = {
                id:
                  cleanEmail === 'alfianfaiz.w4c@gmail.com'
                    ? '00000000-0000-0000-0000-000000000002'
                    : '00000000-0000-0000-0000-000000000001',
                full_name: 'Alfian Faiz (Superadmin)',
                email: cleanEmail,
                password_hash: bcrypt.hashSync(cleanPassword, 10),
                role: 'superadmin' as const,
                is_active: true,
              };
              const { error: insertErr } = await client.from('app_users').insert(autoAdmin);
              if (!insertErr) {
                const sessionUser: AuthSessionUser = {
                  id: autoAdmin.id,
                  full_name: autoAdmin.full_name,
                  email: autoAdmin.email,
                  role: 'superadmin',
                };
                setCurrentUser(sessionUser);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
                return { success: true };
              }
            }

            return {
              success: false,
              code: 'TABLE_EMPTY',
              error:
                'Tabel pengguna (app_users) di Supabase masih kosong. Silakan jalankan query migrasi/seed di Supabase SQL Editor.',
            };
          }

          // Coba autentikasi bawaan Supabase Auth (GoTrue) jika ada
          if (client.auth) {
            try {
              const { data: authData, error: authError } = await client.auth.signInWithPassword({
                email: cleanEmail,
                password: cleanPassword,
              });
              if (!authError && authData.user) {
                const sessionUser: AuthSessionUser = {
                  id: authData.user.id,
                  full_name: authData.user.user_metadata?.full_name || cleanEmail.split('@')[0],
                  email: cleanEmail,
                  role: 'superadmin',
                };
                setCurrentUser(sessionUser);
                localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
                return { success: true };
              }
            } catch {
              // Abaikan jika auth native tidak terkonfigurasi
            }
          }

          return {
            success: false,
            error:
              'Email tidak ditemukan di database Supabase. Pastikan email terdaftar atau gunakan admin@dailycashflow.local / alfianfaiz.w4c@gmail.com.',
          };
        }

        if (user.is_active === false) {
          return { success: false, error: 'Akun Anda dinonaktifkan. Hubungi superadmin.' };
        }

        // Cek password hash: dukung hash bcrypt & teks biasa (jika diedit langsung di tabel Supabase)
        let match = false;
        if (user.password_hash) {
          if (user.password_hash === cleanPassword) {
            match = true;
          } else {
            try {
              match = bcrypt.compareSync(cleanPassword, user.password_hash);
            } catch {
              match = false;
            }
          }
        }

        // Fallback coba Supabase Auth bawaan
        if (!match && client.auth) {
          try {
            const { data: authData, error: authError } = await client.auth.signInWithPassword({
              email: cleanEmail,
              password: cleanPassword,
            });
            if (!authError && authData.user) {
              match = true;
            }
          } catch {
            // ignore
          }
        }

        if (!match) {
          return { success: false, error: 'Kata sandi tidak sesuai. Periksa kembali huruf besar/kecil.' };
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
        return {
          success: false,
          error: err.message || 'Terjadi kesalahan saat memeriksa akun ke Supabase.',
        };
      }
    }

    // 2. Fallback Lokal (Jika Supabase belum disetup sama sekali)
    const storedDemoUsers = localStorage.getItem('daily_cashflow_demo_users');
    const userPool: AppUser[] = storedDemoUsers ? JSON.parse(storedDemoUsers) : INITIAL_USERS;

    const user = userPool.find((u) => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return {
        success: false,
        error:
          'Koneksi Supabase belum dikonfigurasi dan email tidak cocok dengan akun lokal (admin@dailycashflow.local).',
      };
    }

    if (user.is_active === false) {
      return { success: false, error: 'Akun Anda dinonaktifkan.' };
    }

    let match = false;
    if (user.password_hash) {
      if (user.password_hash === cleanPassword) {
        match = true;
      } else {
        try {
          match = bcrypt.compareSync(cleanPassword, user.password_hash);
        } catch {
          match = false;
        }
      }
    }

    if (!match) {
      return { success: false, error: 'Kata sandi salah.' };
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
