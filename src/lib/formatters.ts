/**
 * Format nominal Rupiah sesuai spesifikasi:
 * Format `Rp1.234.567`, tanpa desimal.
 */
export function formatRupiah(amount: number | null | undefined, hidePrivacy: boolean = false): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp0';
  }
  if (hidePrivacy) {
    return 'Rp ••••••';
  }
  const isNegative = amount < 0;
  const absAmount = Math.round(Math.abs(amount));
  const formatted = absAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${isNegative ? '-Rp' : 'Rp'}${formatted}`;
}

/**
 * Format angka ribuan biasa tanpa 'Rp' (untuk input)
 */
export function formatNumberOnly(value: number | string): string {
  if (!value && value !== 0) return '';
  const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : Math.round(value);
  if (isNaN(num)) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parse string dengan pemisah ribuan kembali ke number murni
 */
export function parseNumberFromInput(value: string): number {
  if (!value) return 0;
  const cleaned = value.replace(/\D/g, '');
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format tanggal ke format Indonesia: `dd/MM/yyyy`
 */
export function formatDateID(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '-';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '-';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format YYYY-MM-DD untuk input date HTML
 */
export function toISODate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const QUARTER_LABELS: Record<number, string> = {
  1: 'Q1 (Jan - Mar)',
  2: 'Q2 (Apr - Jun)',
  3: 'Q3 (Jul - Sep)',
  4: 'Q4 (Okt - Des)'
};

export function getQuarterFromMonth(monthIndex1to12: number): number {
  return Math.ceil(monthIndex1to12 / 3);
}

export function getMonthsInQuarter(quarter: number): number[] {
  switch (quarter) {
    case 1: return [1, 2, 3];
    case 2: return [4, 5, 6];
    case 3: return [7, 8, 9];
    case 4: return [10, 11, 12];
    default: return [1, 2, 3];
  }
}
