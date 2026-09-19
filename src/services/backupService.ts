import { db } from '../db/db';
import { BackupData, BackupPreview, BusinessSettings } from '../types';

export const CURRENT_SCHEMA_VERSION = 1;
export const CURRENT_BACKUP_FORMAT_VERSION = '1.0';
export const APP_VERSION = '1.0.0';

/**
 * Exports all IndexedDB tables to a JSON object
 */
export async function exportDatabaseToJson(): Promise<BackupData> {
  const businessSettings = await db.businessSettings.toArray();
  const suppliers = await db.suppliers.toArray();
  const customers = await db.customers.toArray();
  const purchaseTaxRecords = await db.purchaseTaxRecords.toArray();
  const salesTaxRecords = await db.salesTaxRecords.toArray();

  const backup: BackupData = {
    backupFormatVersion: CURRENT_BACKUP_FORMAT_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    businessSettings,
    suppliers,
    customers,
    purchaseTaxRecords,
    salesTaxRecords,
  };

  return backup;
}

/**
 * Triggers a client-side download of the backup JSON file
 */
export function downloadBackupFile(data: BackupData, prefix = 'TaxRecord_Backup'): string {
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${prefix}_${dateStr}.json`;

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return filename;
}

/**
 * Validates and previews a parsed backup object
 */
export function validateAndPreviewBackup(rawJson: string): {
  data: BackupData;
  preview: BackupPreview;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new Error('ไม่สามารถอ่านไฟล์ได้ เนื่องจากรูปแบบ JSON ไม่ถูกต้อง');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('โครงสร้างไฟล์ Backup ไม่ถูกต้อง');
  }

  const b = parsed as Partial<BackupData>;

  if (!b.backupFormatVersion && !b.schemaVersion) {
    throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลของ Tax Record');
  }

  if (b.schemaVersion !== undefined && b.schemaVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `ไฟล์ Backup มาจากเวอร์ชันที่ใหม่กว่า (Schema ${b.schemaVersion}) แอปพลิเคชันปัจจุบันไม่รองรับ`
    );
  }

  if (!Array.isArray(b.suppliers) || !Array.isArray(b.customers)) {
    throw new Error('โครงสร้างข้อมูลผู้ขายหรือผู้ซื้อในไฟล์ Backup ไม่ถูกต้อง');
  }

  if (!Array.isArray(b.purchaseTaxRecords) || !Array.isArray(b.salesTaxRecords)) {
    throw new Error('โครงสร้างข้อมูลรายการภาษีในไฟล์ Backup ไม่ถูกต้อง');
  }

  const business = (b.businessSettings && b.businessSettings[0]) as BusinessSettings | undefined;

  const validData: BackupData = {
    backupFormatVersion: b.backupFormatVersion || '1.0',
    schemaVersion: b.schemaVersion || 1,
    appVersion: b.appVersion || '1.0.0',
    exportedAt: b.exportedAt || new Date().toISOString(),
    businessSettings: b.businessSettings || [],
    suppliers: b.suppliers || [],
    customers: b.customers || [],
    purchaseTaxRecords: b.purchaseTaxRecords || [],
    salesTaxRecords: b.salesTaxRecords || [],
  };

  const preview: BackupPreview = {
    businessName: business?.businessName || 'ไม่ได้ระบุ',
    supplierCount: validData.suppliers.length,
    customerCount: validData.customers.length,
    purchaseCount: validData.purchaseTaxRecords.length,
    salesCount: validData.salesTaxRecords.length,
    exportedAt: validData.exportedAt,
    schemaVersion: validData.schemaVersion,
    appVersion: validData.appVersion,
  };

  return { data: validData, preview };
}

/**
 * Restores data by replacing all existing data in IndexedDB using an atomic transaction
 */
export async function restoreReplaceAll(
  backupData: BackupData,
  createSafetyBackup = true
): Promise<void> {
  if (createSafetyBackup) {
    try {
      const current = await exportDatabaseToJson();
      // Only download safety backup if there was any real data currently
      if (
        current.suppliers.length > 0 ||
        current.customers.length > 0 ||
        current.purchaseTaxRecords.length > 0 ||
        current.salesTaxRecords.length > 0
      ) {
        downloadBackupFile(current, 'TaxRecord_PreRestore_SafetyBackup');
      }
    } catch (e) {
      console.warn('Could not create safety backup:', e);
    }
  }

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
      // Clear tables
      await db.businessSettings.clear();
      await db.suppliers.clear();
      await db.customers.clear();
      await db.purchaseTaxRecords.clear();
      await db.salesTaxRecords.clear();

      // Bulk add
      if (backupData.businessSettings && backupData.businessSettings.length > 0) {
        await db.businessSettings.bulkAdd(backupData.businessSettings);
      }
      if (backupData.suppliers.length > 0) {
        await db.suppliers.bulkAdd(backupData.suppliers);
      }
      if (backupData.customers.length > 0) {
        await db.customers.bulkAdd(backupData.customers);
      }
      if (backupData.purchaseTaxRecords.length > 0) {
        await db.purchaseTaxRecords.bulkAdd(backupData.purchaseTaxRecords);
      }
      if (backupData.salesTaxRecords.length > 0) {
        await db.salesTaxRecords.bulkAdd(backupData.salesTaxRecords);
      }
    }
  );
}

/**
 * Restores data by merging with existing data (avoiding duplicate IDs)
 */
export async function restoreMerge(backupData: BackupData): Promise<{
  addedSuppliers: number;
  addedCustomers: number;
  addedPurchases: number;
  addedSales: number;
}> {
  let addedSuppliers = 0;
  let addedCustomers = 0;
  let addedPurchases = 0;
  let addedSales = 0;

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
      // Merge business settings if current is empty
      if (backupData.businessSettings && backupData.businessSettings.length > 0) {
        const existingSettings = await db.businessSettings.toArray();
        if (existingSettings.length === 0) {
          await db.businessSettings.bulkAdd(backupData.businessSettings);
        }
      }

      // Merge suppliers
      for (const s of backupData.suppliers) {
        const exists = await db.suppliers.get(s.id);
        if (!exists) {
          await db.suppliers.add(s);
          addedSuppliers++;
        }
      }

      // Merge customers
      for (const c of backupData.customers) {
        const exists = await db.customers.get(c.id);
        if (!exists) {
          await db.customers.add(c);
          addedCustomers++;
        }
      }

      // Merge purchaseTaxRecords
      for (const p of backupData.purchaseTaxRecords) {
        const exists = await db.purchaseTaxRecords.get(p.id);
        if (!exists) {
          await db.purchaseTaxRecords.add(p);
          addedPurchases++;
        }
      }

      // Merge salesTaxRecords
      for (const s of backupData.salesTaxRecords) {
        const exists = await db.salesTaxRecords.get(s.id);
        if (!exists) {
          await db.salesTaxRecords.add(s);
          addedSales++;
        }
      }
    }
  );

  return { addedSuppliers, addedCustomers, addedPurchases, addedSales };
}

/**
 * Get record counts for all tables
 */
export async function getDatabaseStatistics(): Promise<{
  suppliers: number;
  customers: number;
  purchases: number;
  sales: number;
}> {
  const [suppliers, customers, purchases, sales] = await Promise.all([
    db.suppliers.count(),
    db.customers.count(),
    db.purchaseTaxRecords.count(),
    db.salesTaxRecords.count(),
  ]);
  return { suppliers, customers, purchases, sales };
}

