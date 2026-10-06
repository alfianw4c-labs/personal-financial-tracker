import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseConfig } from '../types';

const STORAGE_KEY = 'daily_cashflow_supabase_config';
const DEMO_MODE_KEY = 'daily_cashflow_demo_mode';

let cachedClient: SupabaseClient | null = null;
let cachedConfigKey: string | null = null;

export function getSupabaseConfig(): SupabaseConfig | null {
  // 1. Cek Environment variables (prioritas 1)
  const envUrl = import.meta.env.VITE_SUPABASE_URL;
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (envUrl && envKey && envUrl.startsWith('http')) {
    return {
      url: envUrl.trim(),
      anonKey: envKey.trim(),
      source: 'env',
    };
  }

  // 2. Cek LocalStorage konfigurasi pengguna (prioritas 2)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.url && parsed.anonKey) {
        return {
          url: parsed.url.trim(),
          anonKey: parsed.anonKey.trim(),
          source: 'local',
        };
      }
    }
  } catch (err) {
    console.error('Error reading saved supabase config:', err);
  }

  // 3. Cek Demo mode
  if (isDemoModeActive()) {
    return {
      url: 'https://demo-local-cashflow.internal',
      anonKey: 'demo-anon-key',
      source: 'demo',
    };
  }

  return null;
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  localStorage.removeItem(DEMO_MODE_KEY);
  cachedClient = null;
  cachedConfigKey = null;
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DEMO_MODE_KEY);
  cachedClient = null;
  cachedConfigKey = null;
}

export function setDemoMode(active: boolean): void {
  if (active) {
    localStorage.setItem(DEMO_MODE_KEY, 'true');
  } else {
    localStorage.removeItem(DEMO_MODE_KEY);
  }
  cachedClient = null;
  cachedConfigKey = null;
}

export function isDemoModeActive(): boolean {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getSupabaseConfig();
  if (!config || config.source === 'demo') {
    return null;
  }

  const key = `${config.url}::${config.anonKey}`;
  if (cachedClient && cachedConfigKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    cachedConfigKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

/**
 * Tes koneksi ke Supabase dan cek apakah tabel sudah siap
 */
export async function testSupabaseConnection(
  url: string,
  anonKey: string
): Promise<{ success: boolean; message: string; schemaVersion?: string }> {
  try {
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      return { success: false, message: 'URL harus diawali dengan https://' };
    }

    const testClient = createClient(url.trim(), anonKey.trim(), {
      auth: { persistSession: false },
    });

    // Coba query app_meta untuk cek apakah tabel & skema sudah dimigrasi
    const { data, error } = await testClient
      .from('app_meta')
      .select('value')
      .eq('key', 'schema_version')
      .maybeSingle();

    if (error) {
      // Jika error 42P01 (relation does not exist), berarti terhubung ke Postgres tapi belum dimigrasi
      if (error.code === '42P01' || error.message.includes('does not exist') || error.message.includes('app_meta')) {
        return {
          success: true,
          message: 'Berhasil terhubung ke Supabase! (Skema database belum dimigrasi)',
          schemaVersion: undefined,
        };
      }
      return {
        success: false,
        message: `Koneksi gagal: ${error.message || 'Periksa URL dan Anon Key'}`,
      };
    }

    return {
      success: true,
      message: `Terhubung dengan baik! Skema database versi ${data?.value || '1'} terdeteksi.`,
      schemaVersion: data?.value || '1',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Gagal menghubungi server Supabase. Periksa koneksi internet atau URL.',
    };
  }
}

/**
 * Cek status skema database saat ini
 */
export async function checkDatabaseSchema(client: SupabaseClient): Promise<{ hasSchema: boolean; version?: string }> {
  try {
    const { data, error } = await client
      .from('app_meta')
      .select('value')
      .eq('key', 'schema_version')
      .maybeSingle();

    if (error || !data) {
      return { hasSchema: false };
    }
    return { hasSchema: true, version: data.value };
  } catch {
    return { hasSchema: false };
  }
}
