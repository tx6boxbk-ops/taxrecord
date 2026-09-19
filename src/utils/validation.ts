/**
 * Thai Tax ID Validator: Checks if a string is a valid 13-digit Thai Tax ID / National ID format
 */
export function isValidThaiTaxId(taxId: string): boolean {
  if (!taxId) return false;
  const cleanId = taxId.trim();
  // Must be exactly 13 digits
  if (!/^\d{13}$/.test(cleanId)) return false;

  // Checksum calculation (Thai standard 13-digit mod 11 algorithm)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleanId.charAt(i), 10) * (13 - i);
  }
  const checkDigit = (11 - (sum % 11)) % 10;
  return checkDigit === parseInt(cleanId.charAt(12), 10);
}

/**
 * Validates Branch Number (must be digits, typically 4 or 5 digits e.g. "00000")
 */
export function formatBranchNumber(branch: string): string {
  if (!branch) return '00000';
  const clean = branch.trim();
  // Pad with leading zeros up to 5 digits if fewer
  if (/^\d+$/.test(clean) && clean.length < 5) {
    return clean.padStart(5, '0');
  }
  return clean;
}

/**
 * Validates whether string is non-empty
 */
export function isNonEmpty(val: string | undefined | null): boolean {
  return typeof val === 'string' && val.trim().length > 0;
}
