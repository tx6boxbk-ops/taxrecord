import { db, generateId } from '../db/db';
import {
  PurchaseTaxRecord,
  SalesTaxRecord,
  TaxSummary,
} from '../types';
import { calculateVatExclusive, roundToTwoDecimals } from '../utils/calculation';
import { parseTaxPeriod } from '../utils/thaiDate';

// ==================== PURCHASE TAX SERVICE ====================

export async function createPurchaseTaxRecord(
  data: Omit<
    PurchaseTaxRecord,
    'id' | 'taxYear' | 'taxMonth' | 'vatAmount' | 'totalAmount' | 'createdAt' | 'updatedAt'
  > & {
    customVatAmount?: number;
    customTotalAmount?: number;
  }
): Promise<PurchaseTaxRecord> {
  const { taxYear, taxMonth } = parseTaxPeriod(data.taxDate);
  const now = new Date().toISOString();

  // Calculation
  const { vatAmount, totalAmount } =
    data.customVatAmount !== undefined && data.customTotalAmount !== undefined
      ? { vatAmount: data.customVatAmount, totalAmount: data.customTotalAmount }
      : calculateVatExclusive(data.taxableAmount, data.vatRate);

  const newRecord: PurchaseTaxRecord = {
    id: generateId(),
    taxDate: data.taxDate,
    taxYear,
    taxMonth,
    invoiceBookNumber: String(data.invoiceBookNumber || '').trim(),
    invoiceNumber: String(data.invoiceNumber || '').trim(),
    supplierId: data.supplierId,
    supplierNameSnapshot: data.supplierNameSnapshot.trim(),
    supplierTaxpayerIdSnapshot: String(data.supplierTaxpayerIdSnapshot || '').trim(),
    supplierBranchTypeSnapshot: data.supplierBranchTypeSnapshot,
    supplierBranchNumberSnapshot: String(data.supplierBranchNumberSnapshot || '00000').trim(),
    taxableAmount: roundToTwoDecimals(data.taxableAmount),
    vatRate: roundToTwoDecimals(data.vatRate),
    vatAmount: roundToTwoDecimals(vatAmount),
    totalAmount: roundToTwoDecimals(totalAmount),
    note: (data.note || '').trim(),
    createdAt: now,
    updatedAt: now,
  };

  await db.purchaseTaxRecords.add(newRecord);
  return newRecord;
}

export async function updatePurchaseTaxRecord(
  id: string,
  data: Partial<Omit<PurchaseTaxRecord, 'id' | 'createdAt' | 'updatedAt'>> & {
    customVatAmount?: number;
    customTotalAmount?: number;
  }
): Promise<void> {
  const existing = await db.purchaseTaxRecords.get(id);
  if (!existing) {
    throw new Error('ไม่พบรายการภาษีซื้อที่ต้องการแก้ไข');
  }

  const taxDate = data.taxDate ?? existing.taxDate;
  const { taxYear, taxMonth } = parseTaxPeriod(taxDate);

  const taxableAmount =
    data.taxableAmount !== undefined
      ? roundToTwoDecimals(data.taxableAmount)
      : existing.taxableAmount;

  const vatRate =
    data.vatRate !== undefined ? roundToTwoDecimals(data.vatRate) : existing.vatRate;

  let vatAmount = existing.vatAmount;
  let totalAmount = existing.totalAmount;

  if (data.customVatAmount !== undefined && data.customTotalAmount !== undefined) {
    vatAmount = roundToTwoDecimals(data.customVatAmount);
    totalAmount = roundToTwoDecimals(data.customTotalAmount);
  } else if (data.taxableAmount !== undefined || data.vatRate !== undefined) {
    const calc = calculateVatExclusive(taxableAmount, vatRate);
    vatAmount = calc.vatAmount;
    totalAmount = calc.totalAmount;
  }

  const updated: Partial<PurchaseTaxRecord> = {
    ...data,
    taxDate,
    taxYear,
    taxMonth,
    taxableAmount,
    vatRate,
    vatAmount,
    totalAmount,
    updatedAt: new Date().toISOString(),
  };

  if (data.invoiceBookNumber !== undefined) {
    updated.invoiceBookNumber = String(data.invoiceBookNumber).trim();
  }
  if (data.invoiceNumber !== undefined) {
    updated.invoiceNumber = String(data.invoiceNumber).trim();
  }
  if (data.supplierTaxpayerIdSnapshot !== undefined) {
    updated.supplierTaxpayerIdSnapshot = String(data.supplierTaxpayerIdSnapshot).trim();
  }
  if (data.supplierBranchNumberSnapshot !== undefined) {
    updated.supplierBranchNumberSnapshot = String(data.supplierBranchNumberSnapshot).trim();
  }

  await db.purchaseTaxRecords.update(id, updated);
}

export async function deletePurchaseTaxRecord(id: string): Promise<void> {
  await db.purchaseTaxRecords.delete(id);
}

export async function getPurchaseTaxRecords(options?: {
  year?: number;
  month?: number;
  search?: string;
  supplierId?: string;
}): Promise<PurchaseTaxRecord[]> {
  let records = await db.purchaseTaxRecords.toArray();

  // Filter by year
  if (options?.year) {
    records = records.filter((r) => r.taxYear === options.year);
  }

  // Filter by month
  if (options?.month) {
    records = records.filter((r) => r.taxMonth === options.month);
  }

  // Filter by supplierId
  if (options?.supplierId) {
    records = records.filter((r) => r.supplierId === options.supplierId);
  }

  // Filter by search query
  if (options?.search) {
    const query = options.search.trim().toLowerCase();
    records = records.filter(
      (r) =>
        r.supplierNameSnapshot.toLowerCase().includes(query) ||
        r.supplierTaxpayerIdSnapshot.includes(query) ||
        r.invoiceNumber.toLowerCase().includes(query) ||
        r.invoiceBookNumber.toLowerCase().includes(query) ||
        r.taxDate.includes(query)
    );
  }

  // Sort by date ascending, then invoice number
  return records.sort((a, b) => {
    const dateCmp = a.taxDate.localeCompare(b.taxDate);
    if (dateCmp !== 0) return dateCmp;
    return a.invoiceNumber.localeCompare(b.invoiceNumber);
  });
}

// ==================== SALES TAX SERVICE ====================

export async function createSalesTaxRecord(
  data: Omit<
    SalesTaxRecord,
    'id' | 'taxYear' | 'taxMonth' | 'vatAmount' | 'totalAmount' | 'createdAt' | 'updatedAt'
  > & {
    customVatAmount?: number;
    customTotalAmount?: number;
  }
): Promise<SalesTaxRecord> {
  const { taxYear, taxMonth } = parseTaxPeriod(data.taxDate);
  const now = new Date().toISOString();

  // Calculation
  const { vatAmount, totalAmount } =
    data.customVatAmount !== undefined && data.customTotalAmount !== undefined
      ? { vatAmount: data.customVatAmount, totalAmount: data.customTotalAmount }
      : calculateVatExclusive(data.taxableAmount, data.vatRate);

  const newRecord: SalesTaxRecord = {
    id: generateId(),
    taxDate: data.taxDate,
    taxYear,
    taxMonth,
    invoiceBookNumber: String(data.invoiceBookNumber || '').trim(),
    invoiceNumber: String(data.invoiceNumber || '').trim(),
    customerId: data.customerId,
    customerNameSnapshot: data.customerNameSnapshot.trim(),
    customerTaxpayerIdSnapshot: String(data.customerTaxpayerIdSnapshot || '').trim(),
    customerBranchTypeSnapshot: data.customerBranchTypeSnapshot,
    customerBranchNumberSnapshot: String(data.customerBranchNumberSnapshot || '00000').trim(),
    taxableAmount: roundToTwoDecimals(data.taxableAmount),
    vatRate: roundToTwoDecimals(data.vatRate),
    vatAmount: roundToTwoDecimals(vatAmount),
    totalAmount: roundToTwoDecimals(totalAmount),
    note: (data.note || '').trim(),
    createdAt: now,
    updatedAt: now,
  };

  await db.salesTaxRecords.add(newRecord);
  return newRecord;
}

export async function updateSalesTaxRecord(
  id: string,
  data: Partial<Omit<SalesTaxRecord, 'id' | 'createdAt' | 'updatedAt'>> & {
    customVatAmount?: number;
    customTotalAmount?: number;
  }
): Promise<void> {
  const existing = await db.salesTaxRecords.get(id);
  if (!existing) {
    throw new Error('ไม่พบรายการภาษีขายที่ต้องการแก้ไข');
  }

  const taxDate = data.taxDate ?? existing.taxDate;
  const { taxYear, taxMonth } = parseTaxPeriod(taxDate);

  const taxableAmount =
    data.taxableAmount !== undefined
      ? roundToTwoDecimals(data.taxableAmount)
      : existing.taxableAmount;

  const vatRate =
    data.vatRate !== undefined ? roundToTwoDecimals(data.vatRate) : existing.vatRate;

  let vatAmount = existing.vatAmount;
  let totalAmount = existing.totalAmount;

  if (data.customVatAmount !== undefined && data.customTotalAmount !== undefined) {
    vatAmount = roundToTwoDecimals(data.customVatAmount);
    totalAmount = roundToTwoDecimals(data.customTotalAmount);
  } else if (data.taxableAmount !== undefined || data.vatRate !== undefined) {
    const calc = calculateVatExclusive(taxableAmount, vatRate);
    vatAmount = calc.vatAmount;
    totalAmount = calc.totalAmount;
  }

  const updated: Partial<SalesTaxRecord> = {
    ...data,
    taxDate,
    taxYear,
    taxMonth,
    taxableAmount,
    vatRate,
    vatAmount,
    totalAmount,
    updatedAt: new Date().toISOString(),
  };

  if (data.invoiceBookNumber !== undefined) {
    updated.invoiceBookNumber = String(data.invoiceBookNumber).trim();
  }
  if (data.invoiceNumber !== undefined) {
    updated.invoiceNumber = String(data.invoiceNumber).trim();
  }
  if (data.customerTaxpayerIdSnapshot !== undefined) {
    updated.customerTaxpayerIdSnapshot = String(data.customerTaxpayerIdSnapshot).trim();
  }
  if (data.customerBranchNumberSnapshot !== undefined) {
    updated.customerBranchNumberSnapshot = String(data.customerBranchNumberSnapshot).trim();
  }

  await db.salesTaxRecords.update(id, updated);
}

export async function deleteSalesTaxRecord(id: string): Promise<void> {
  await db.salesTaxRecords.delete(id);
}

export async function getSalesTaxRecords(options?: {
  year?: number;
  month?: number;
  search?: string;
  customerId?: string;
}): Promise<SalesTaxRecord[]> {
  let records = await db.salesTaxRecords.toArray();

  if (options?.year) {
    records = records.filter((r) => r.taxYear === options.year);
  }

  if (options?.month) {
    records = records.filter((r) => r.taxMonth === options.month);
  }

  if (options?.customerId) {
    records = records.filter((r) => r.customerId === options.customerId);
  }

  if (options?.search) {
    const query = options.search.trim().toLowerCase();
    records = records.filter(
      (r) =>
        r.customerNameSnapshot.toLowerCase().includes(query) ||
        r.customerTaxpayerIdSnapshot.includes(query) ||
        r.invoiceNumber.toLowerCase().includes(query) ||
        r.invoiceBookNumber.toLowerCase().includes(query) ||
        r.taxDate.includes(query)
    );
  }

  return records.sort((a, b) => {
    const dateCmp = a.taxDate.localeCompare(b.taxDate);
    if (dateCmp !== 0) return dateCmp;
    return a.invoiceNumber.localeCompare(b.invoiceNumber);
  });
}

// ==================== AGGREGATE CALCULATIONS ====================

export function calculateSummary(
  records: Array<{ taxableAmount: number; vatAmount: number; totalAmount: number }>
): TaxSummary {
  let taxableAmount = 0;
  let vatAmount = 0;
  let totalAmount = 0;

  for (const r of records) {
    taxableAmount += r.taxableAmount;
    vatAmount += r.vatAmount;
    totalAmount += r.totalAmount;
  }

  return {
    count: records.length,
    taxableAmount: roundToTwoDecimals(taxableAmount),
    vatAmount: roundToTwoDecimals(vatAmount),
    totalAmount: roundToTwoDecimals(totalAmount),
  };
}

export interface MonthlyOverviewItem {
  month: number;
  purchaseTaxable: number;
  purchaseVat: number;
  purchaseCount: number;
  salesTaxable: number;
  salesVat: number;
  salesCount: number;
  vatDifference: number; // salesVat - purchaseVat
}

export async function getYearlyTaxOverview(year: number): Promise<MonthlyOverviewItem[]> {
  const purchases = await db.purchaseTaxRecords.where('taxYear').equals(year).toArray();
  const sales = await db.salesTaxRecords.where('taxYear').equals(year).toArray();

  const result: MonthlyOverviewItem[] = [];

  for (let m = 1; m <= 12; m++) {
    const monthPurchases = purchases.filter((p) => p.taxMonth === m);
    const monthSales = sales.filter((s) => s.taxMonth === m);

    const purchaseSummary = calculateSummary(monthPurchases);
    const salesSummary = calculateSummary(monthSales);

    const vatDifference = roundToTwoDecimals(salesSummary.vatAmount - purchaseSummary.vatAmount);

    result.push({
      month: m,
      purchaseTaxable: purchaseSummary.taxableAmount,
      purchaseVat: purchaseSummary.vatAmount,
      purchaseCount: purchaseSummary.count,
      salesTaxable: salesSummary.taxableAmount,
      salesVat: salesSummary.vatAmount,
      salesCount: salesSummary.count,
      vatDifference,
    });
  }

  return result;
}
