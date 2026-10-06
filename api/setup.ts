import type { Request, Response } from 'express';
import { Client } from 'pg';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

const SetupSchema = z.object({
  connectionString: z.string().min(10, 'Connection string minimal 10 karakter'),
});

export async function handleSetupMigration(connectionString: string): Promise<{ success: boolean; message: string; logs: string[] }> {
  const logs: string[] = [];
  logs.push('Memulai koneksi ke PostgreSQL...');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    logs.push('Berhasil terhubung ke database PostgreSQL.');

    // Baca migration SQL dari file atau fallback
    let sqlContent = '';
    const possiblePaths = [
      path.resolve(process.cwd(), 'supabase/migrations/001_init.sql'),
      path.resolve(__dirname, '../supabase/migrations/001_init.sql'),
      path.resolve(__dirname, '../../supabase/migrations/001_init.sql'),
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        sqlContent = fs.readFileSync(p, 'utf8');
        logs.push(`Membaca file migrasi: ${path.basename(p)}`);
        break;
      }
    }

    if (!sqlContent) {
      logs.push('File migrasi tidak ditemukan di disk, menjalankan skema standar...');
      throw new Error('File migrasi supabase/migrations/001_init.sql tidak ditemukan.');
    }

    logs.push('Mengeksekusi SQL skema tabel, relasi, view, dan data awal...');
    await client.query('BEGIN');
    await client.query(sqlContent);
    await client.query(`
      INSERT INTO app_meta (key, value)
      VALUES ('schema_version', '1')
      ON CONFLICT (key) DO UPDATE SET value = '1';
    `);
    await client.query('COMMIT');

    logs.push('Skema berhasil dibuat dan versi app_meta diperbarui ke 1.');
    logs.push('Migrasi selesai 100% dengan sukses!');

    return {
      success: true,
      message: 'Migrasi database berhasil dijalankan.',
      logs,
    };
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // ignore rollback error if client wasn't in transaction
    }
    const cleanError = err.message || 'Terjadi kesalahan saat migrasi database.';
    logs.push(`Error: ${cleanError}`);
    throw new Error(cleanError);
  } finally {
    try {
      await client.end();
      logs.push('Koneksi database ditutup.');
    } catch {
      // ignore
    }
  }
}

// Vercel Serverless Function & Express handler compatibility
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Hanya method POST yang diizinkan' });
  }

  try {
    const parseResult = SetupSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.issues[0]?.message || 'Format data tidak valid',
      });
    }

    const result = await handleSetupMigration(parseResult.data.connectionString);
    return res.status(200).json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Gagal menjalankan migrasi database',
    });
  }
}
