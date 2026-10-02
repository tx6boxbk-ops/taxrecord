export const THAI_MONTHS_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
];

export const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
];

/**
 * Converts Gregorian Year (AD) to Buddhist Era Year (BE)
 * BE = AD + 543
 */
export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear + 543;
}

/**
 * Converts Buddhist Era Year (BE) to Gregorian Year (AD)
 * AD = BE - 543
 */
export function toGregorianYear(buddhistYear: number): number {
  return buddhistYear - 543;
}

/**
 * Parses YYYY-MM-DD string to get taxYear (Gregorian) and taxMonth (1-12)
 */
export function parseTaxPeriod(dateStr: string): { taxYear: number; taxMonth: number } {
  if (!dateStr) {
    const now = new Date();
    return { taxYear: now.getFullYear(), taxMonth: now.getMonth() + 1 };
  }
  const parts = dateStr.split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);
  return {
    taxYear: isNaN(year) ? new Date().getFullYear() : year,
    taxMonth: isNaN(month) ? new Date().getMonth() + 1 : month,
  };
}

/**
 * Formats YYYY-MM-DD into Thai date string e.g. "18/09/2569"
 */
export function formatThaiDateShort(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  const beYear = toBuddhistYear(year);
  return `${day}/${month}/${beYear}`;
}

/**
 * Formats YYYY-MM-DD into full Thai date string e.g. "18 กันยายน 2569"
 */
export function formatThaiDateFull(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const beYear = toBuddhistYear(year);
  const monthName = THAI_MONTHS_FULL[monthIdx] || parts[1];
  return `${day} ${monthName} ${beYear}`;
}

/**
 * Returns Thai month name for 1-based month index (1 to 12)
 */
export function getThaiMonthName(monthNumber: number): string {
  return THAI_MONTHS_FULL[monthNumber - 1] || `เดือน ${monthNumber}`;
}

/**
 * Returns Short Thai month name for 1-based month index (1 to 12)
 */
export function getThaiMonthShortName(monthNumber: number): string {
  return THAI_MONTHS_SHORT[monthNumber - 1] || `ด.${monthNumber}`;
}

/**
 * Gets today's date in YYYY-MM-DD format in local timezone
 */
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns 1-based month index (1 to 12) from full Thai month name (e.g. "มกราคม" -> 1)
 */
export function getMonthNumberFromName(monthName: string): number {
  const idx = THAI_MONTHS_FULL.indexOf(monthName.trim());
  return idx !== -1 ? idx + 1 : 1;
}

/**
 * Returns the number of days in a given Gregorian month and year (handles leap years)
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Constructs an ISO YYYY-MM-DD string from year, month (1-12), and day (1-31)
 */
export function constructIsoDate(year: number, month: number, day: number | string): string {
  const d = typeof day === 'string' ? parseInt(day, 10) : day;
  const safeDay = isNaN(d) || d < 1 ? 1 : d;
  const maxDays = getDaysInMonth(year, month);
  const clampedDay = Math.min(safeDay, maxDays);
  return `${year}-${String(month).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}
