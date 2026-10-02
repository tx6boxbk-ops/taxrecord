import { db } from '../db/db';
import { InvoiceNumberConfig, ParsedInvoiceNumber } from '../types';

const STORAGE_PREFIX = 'tax_app_inv_cfg_';

/**
 * Parses an invoice number string to extract prefix, numeric value, and padding length
 * e.g. "TK005" -> prefix "TK", num 5, padLength 3
 * e.g. "INV001" -> prefix "INV", num 1, padLength 3
 * e.g. "BILL099" -> prefix "BILL", num 99, padLength 3
 * e.g. "TAX999" -> prefix "TAX", num 999, padLength 3
 * e.g. "2026-001" -> prefix "2026-", num 1, padLength 3
 * e.g. "001" -> prefix "", num 1, padLength 3
 */
export function parseInvoiceNumber(invNumber: string): ParsedInvoiceNumber {
  const raw = (invNumber || '').trim();
  if (!raw) {
    return { raw: '', prefix: '', num: 1, padLength: 3, hasDigits: false };
  }

  // Look for trailing digits
  const match = raw.match(/^(.*?)(\d+)$/);
  if (match) {
    const prefix = match[1];
    const digitsStr = match[2];
    const num = parseInt(digitsStr, 10);
    const padLength = digitsStr.length;
    return {
      raw,
      prefix,
      num: isNaN(num) ? 1 : num,
      padLength,
      hasDigits: true,
    };
  }

  // No trailing digits found (e.g. "INV" or "BILL")
  return {
    raw,
    prefix: raw,
    num: 1,
    padLength: 3,
    hasDigits: false,
  };
}

/**
 * Formats prefix and number maintaining at least padLength digits
 */
export function formatInvoiceNumber(prefix: string, num: number, padLength: number): string {
  const safePad = Math.max(padLength || 1, 1);
  const digits = String(Math.max(num, 0)).padStart(safePad, '0');
  return `${prefix}${digits}`;
}

/**
 * Increments an invoice number string while preserving its prefix and padding
 * e.g. TK005 -> TK006
 * e.g. TK009 -> TK010
 * e.g. BILL099 -> BILL100
 * e.g. TAX999 -> TAX1000
 * e.g. 2026-001 -> 2026-002
 */
export function incrementInvoiceNumber(invNumber: string): string {
  const parsed = parseInvoiceNumber(invNumber);
  if (!parsed.hasDigits) {
    return `${parsed.prefix}001`;
  }
  return formatInvoiceNumber(parsed.prefix, parsed.num + 1, parsed.padLength);
}

/**
 * Generates unique config ID for type, year, and month
 */
export function getInvoiceConfigId(
  type: 'SALES' | 'PURCHASE',
  year: number,
  month: number
): string {
  return `${type.toLowerCase()}_${year}_${month}`;
}

/**
 * Gets the stored configuration for a specific year and month
 */
export async function getInvoiceNumberConfig(
  type: 'SALES' | 'PURCHASE',
  year: number,
  month: number
): Promise<InvoiceNumberConfig | null> {
  const id = getInvoiceConfigId(type, year, month);

  // 1. Try Dexie table
  try {
    const record = await db.invoiceNumberConfigs.get(id);
    if (record) return record;
  } catch (err) {
    console.warn('Error reading invoiceNumberConfigs from DB:', err);
  }

  // 2. Try LocalStorage fallback
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
    if (raw) {
      const parsed = JSON.parse(raw) as InvoiceNumberConfig;
      return parsed;
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Saves or updates invoice number configuration for a specific year and month
 */
export async function saveInvoiceNumberConfig(params: {
  type?: 'SALES' | 'PURCHASE';
  year: number;
  month: number;
  startNumber: string;
}): Promise<InvoiceNumberConfig> {
  const type = params.type || 'SALES';
  const year = params.year;
  const month = params.month;
  let startNumber = params.startNumber.trim();

  if (!startNumber) {
    startNumber = type === 'SALES' ? 'INV001' : 'BILL001';
  }

  const parsed = parseInvoiceNumber(startNumber);
  const id = getInvoiceConfigId(type, year, month);

  const existingConfig = await getInvoiceNumberConfig(type, year, month);

  // Check if any invoice records already exist in this month
  const existingRecords =
    type === 'SALES'
      ? await db.salesTaxRecords.where('taxYear').equals(year).filter((r) => r.taxMonth === month).toArray()
      : await db.purchaseTaxRecords.where('taxYear').equals(year).filter((r) => r.taxMonth === month).toArray();

  const now = new Date().toISOString();

  let highestNumber = existingConfig?.highestNumber;
  let lastUsedNumber = existingConfig?.lastUsedNumber;

  // If no documents exist in this month yet, reset highest/lastUsed so the new startNumber takes effect immediately
  if (existingRecords.length === 0) {
    highestNumber = undefined;
    lastUsedNumber = undefined;
  }

  const config: InvoiceNumberConfig = {
    id,
    type,
    year,
    month,
    startNumber,
    lastUsedNumber,
    highestNumber,
    prefix: parsed.prefix,
    padLength: parsed.padLength,
    updatedAt: now,
  };

  // Save to Dexie
  try {
    await db.invoiceNumberConfigs.put(config);
  } catch (err) {
    console.warn('Error putting invoiceNumberConfigs to DB:', err);
  }

  // Save to localStorage
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(config));
  } catch {
    // ignore
  }

  return config;
}

/**
 * Computes the next invoice number for a given year and month
 * Guaranteed:
 * - Checks startNumber for this month
 * - Tracks highest number used so far in this month (never rolls back on item deletion)
 * - If user edited to a higher number (e.g. TK020), next is TK021
 * - Avoids collisions with any existing records in this month
 */
export async function getNextInvoiceNumber(
  type: 'SALES' | 'PURCHASE',
  year: number,
  month: number
): Promise<string> {
  const config = await getInvoiceNumberConfig(type, year, month);
  const defaultStart = type === 'SALES' ? 'INV001' : 'BILL001';
  const startNumber = config?.startNumber?.trim() || defaultStart;

  // 1. Fetch all existing records in this year and month
  const records =
    type === 'SALES'
      ? await db.salesTaxRecords.where('taxYear').equals(year).filter((r) => r.taxMonth === month).toArray()
      : await db.purchaseTaxRecords.where('taxYear').equals(year).filter((r) => r.taxMonth === month).toArray();

  const existingInvoiceSet = new Set(
    records.map((r) => r.invoiceNumber.trim().toLowerCase()).filter(Boolean)
  );

  // If no records exist in this month and no prior usage recorded:
  if (records.length === 0 && !config?.highestNumber && !config?.lastUsedNumber) {
    return startNumber;
  }

  // 2. Collect all candidate numbers to find the highest number used
  const candidates: string[] = [];

  for (const r of records) {
    if (r.invoiceNumber && r.invoiceNumber.trim()) {
      candidates.push(r.invoiceNumber.trim());
    }
  }

  if (config?.highestNumber && config.highestNumber.trim()) {
    candidates.push(config.highestNumber.trim());
  }

  if (config?.lastUsedNumber && config.lastUsedNumber.trim()) {
    candidates.push(config.lastUsedNumber.trim());
  }

  // If candidates are empty, return startNumber
  if (candidates.length === 0) {
    return startNumber;
  }

  // Parse startNumber to compare prefix
  const startParsed = parseInvoiceNumber(startNumber);

  // Find the candidate with highest numeric value matching startNumber prefix (or overall highest)
  let maxParsed: ParsedInvoiceNumber | null = null;

  for (const c of candidates) {
    const p = parseInvoiceNumber(c);
    if (!maxParsed) {
      maxParsed = p;
    } else {
      // Prioritize same prefix
      if (p.prefix === startParsed.prefix && maxParsed.prefix === startParsed.prefix) {
        if (p.num > maxParsed.num) {
          maxParsed = p;
        }
      } else if (p.prefix === startParsed.prefix && maxParsed.prefix !== startParsed.prefix) {
        maxParsed = p;
      } else if (p.prefix !== startParsed.prefix && maxParsed.prefix !== startParsed.prefix) {
        if (p.num > maxParsed.num) {
          maxParsed = p;
        }
      }
    }
  }

  // Compare with startNumber itself:
  // If no records have been saved yet, but startNumber was specified:
  if (records.length === 0 && (!config?.highestNumber || config.highestNumber === startNumber)) {
    if (!existingInvoiceSet.has(startNumber.toLowerCase())) {
      return startNumber;
    }
  }

  let nextCandidate = '';

  if (maxParsed && maxParsed.hasDigits) {
    // If startNumber has higher numeric value than any recorded used number, startNumber takes precedence
    if (
      startParsed.hasDigits &&
      startParsed.prefix === maxParsed.prefix &&
      startParsed.num > maxParsed.num &&
      !existingInvoiceSet.has(startNumber.toLowerCase())
    ) {
      nextCandidate = startNumber;
    } else {
      nextCandidate = formatInvoiceNumber(
        maxParsed.prefix,
        maxParsed.num + 1,
        Math.max(maxParsed.padLength, startParsed.padLength)
      );
    }
  } else {
    nextCandidate = incrementInvoiceNumber(startNumber);
  }

  // Safety loop: Ensure candidate does not collide with any existing record in this month
  let iterations = 0;
  while (existingInvoiceSet.has(nextCandidate.toLowerCase()) && iterations < 1000) {
    nextCandidate = incrementInvoiceNumber(nextCandidate);
    iterations++;
  }

  return nextCandidate;
}

/**
 * Records that an invoice number was actually saved and used in this year and month
 * Updates lastUsedNumber and highestNumber in persistent storage
 */
export async function recordUsedInvoiceNumber(
  type: 'SALES' | 'PURCHASE',
  year: number,
  month: number,
  invoiceNumber: string
): Promise<void> {
  const cleanNumber = (invoiceNumber || '').trim();
  if (!cleanNumber) return;

  const config = (await getInvoiceNumberConfig(type, year, month)) || {
    id: getInvoiceConfigId(type, year, month),
    type,
    year,
    month,
    startNumber: cleanNumber,
    updatedAt: new Date().toISOString(),
  };

  const parsedCurrent = parseInvoiceNumber(cleanNumber);
  let highest = config.highestNumber;

  if (!highest) {
    highest = cleanNumber;
  } else {
    const parsedHighest = parseInvoiceNumber(highest);
    if (parsedCurrent.prefix === parsedHighest.prefix) {
      if (parsedCurrent.num >= parsedHighest.num) {
        highest = cleanNumber;
      }
    } else {
      highest = cleanNumber;
    }
  }

  const updatedConfig: InvoiceNumberConfig = {
    ...config,
    lastUsedNumber: cleanNumber,
    highestNumber: highest,
    updatedAt: new Date().toISOString(),
  };

  const id = getInvoiceConfigId(type, year, month);

  try {
    await db.invoiceNumberConfigs.put(updatedConfig);
  } catch (err) {
    console.warn('Error saving invoice config to DB:', err);
  }

  try {
    localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(updatedConfig));
  } catch {
    // ignore
  }
}

/**
 * Checks if an invoice number is duplicate within the specified year and month
 * Returns true if duplicate exists, false if valid and unique
 */
export async function checkInvoiceNumberDuplicate(
  type: 'SALES' | 'PURCHASE',
  year: number,
  month: number,
  invoiceNumber: string,
  excludeId?: string
): Promise<boolean> {
  const clean = (invoiceNumber || '').trim().toLowerCase();
  if (!clean) return false;

  const records =
    type === 'SALES'
      ? await db.salesTaxRecords.where('taxYear').equals(year).filter((r) => r.taxMonth === month).toArray()
      : await db.purchaseTaxRecords.where('taxYear').equals(year).filter((r) => r.taxMonth === month).toArray();

  return records.some(
    (r) => r.invoiceNumber.trim().toLowerCase() === clean && (!excludeId || r.id !== excludeId)
  );
}
