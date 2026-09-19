/**
 * Decimal accuracy utilities to prevent floating-point rounding errors.
 */

export function roundToTwoDecimals(value: number): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  // Use Math.round with epsilon to avoid standard IEEE 754 precision issues
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates VAT and Total Amount from a Taxable Base Amount (VAT Exclusive)
 * VAT = taxableAmount * vatRate / 100
 * Total = taxableAmount + VAT
 */
export function calculateVatExclusive(
  taxableAmount: number,
  vatRate: number = 7
): { vatAmount: number; totalAmount: number } {
  const cleanTaxable = Math.max(0, taxableAmount || 0);
  const cleanRate = Math.max(0, vatRate || 0);

  const vatAmount = roundToTwoDecimals((cleanTaxable * cleanRate) / 100);
  const totalAmount = roundToTwoDecimals(cleanTaxable + vatAmount);

  return { vatAmount, totalAmount };
}

/**
 * Extracts Taxable Base and VAT from a Total Amount (VAT Inclusive)
 * Taxable = totalAmount * 100 / (100 + vatRate)
 * VAT = totalAmount - Taxable
 */
export function calculateVatInclusive(
  totalAmount: number,
  vatRate: number = 7
): { taxableAmount: number; vatAmount: number } {
  const cleanTotal = Math.max(0, totalAmount || 0);
  const cleanRate = Math.max(0, vatRate || 0);

  const taxableAmount = roundToTwoDecimals((cleanTotal * 100) / (100 + cleanRate));
  const vatAmount = roundToTwoDecimals(cleanTotal - taxableAmount);

  return { taxableAmount, vatAmount };
}

/**
 * Formats a number with comma thousand separators and fixed 2 decimal places.
 * Example: 1000 -> "1,000.00"
 */
export function formatCurrency(value: number | string | undefined | null): string {
  if (value === undefined || value === null || value === '') return '0.00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0.00';

  return num.toLocaleString('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Safely parses input string to number with max 2 decimals.
 */
export function parseAmount(value: string | number): number {
  if (typeof value === 'number') return roundToTwoDecimals(value);
  if (!value) return 0;
  // Remove commas, spaces
  const cleaned = value.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : roundToTwoDecimals(num);
}
