import Dexie, { type Table } from 'dexie';
import {
  BusinessSettings,
  Supplier,
  Customer,
  PurchaseTaxRecord,
  SalesTaxRecord,
} from '../types';

export class TaxRecordDatabase extends Dexie {
  businessSettings!: Table<BusinessSettings, string>;
  suppliers!: Table<Supplier, string>;
  customers!: Table<Customer, string>;
  purchaseTaxRecords!: Table<PurchaseTaxRecord, string>;
  salesTaxRecords!: Table<SalesTaxRecord, string>;

  constructor() {
    super('TaxRecordDB');

    // Schema Version 1
    this.version(1).stores({
      businessSettings: 'id',
      suppliers: 'id, displayName, taxpayerId, branchNumber, createdAt',
      customers: 'id, displayName, taxpayerId, branchNumber, createdAt',
      purchaseTaxRecords:
        'id, taxDate, taxYear, taxMonth, invoiceNumber, supplierId, [taxYear+taxMonth]',
      salesTaxRecords:
        'id, taxDate, taxYear, taxMonth, invoiceNumber, customerId, [taxYear+taxMonth]',
    });
  }
}

// Singleton database instance
export const db = new TaxRecordDatabase();

/**
 * Generate collision-resistant unique ID for local-first records
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Reset and clear all database tables
 */
export async function resetDatabase(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.businessSettings,
      db.suppliers,
      db.customers,
      db.purchaseTaxRecords,
      db.salesTaxRecords,
    ],
    async () => {
      await db.businessSettings.clear();
      await db.suppliers.clear();
      await db.customers.clear();
      await db.purchaseTaxRecords.clear();
      await db.salesTaxRecords.clear();
    }
  );
}
