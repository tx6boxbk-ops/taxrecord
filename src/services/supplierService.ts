import { db, generateId } from '../db/db';
import { Supplier } from '../types';

export async function getSuppliers(): Promise<Supplier[]> {
  return await db.suppliers.orderBy('displayName').toArray();
}

export async function getSupplier(id: string): Promise<Supplier | undefined> {
  return await db.suppliers.get(id);
}

export async function checkDuplicateSupplier(
  taxpayerId: string,
  branchNumber: string,
  excludeId?: string
): Promise<boolean> {
  const cleanTaxId = taxpayerId.trim();
  const cleanBranch = branchNumber.trim();

  if (!cleanTaxId) return false;

  const matches = await db.suppliers
    .where('taxpayerId')
    .equals(cleanTaxId)
    .filter((s) => s.branchNumber.trim() === cleanBranch && s.id !== excludeId)
    .count();

  return matches > 0;
}

export async function createSupplier(
  data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Supplier> {
  const now = new Date().toISOString();
  const newSupplier: Supplier = {
    ...data,
    id: generateId(),
    displayName: data.displayName.trim(),
    legalName: data.legalName.trim() || data.displayName.trim(),
    taxpayerId: String(data.taxpayerId || '').trim(),
    branchNumber: String(data.branchNumber || '00000').trim(),
    createdAt: now,
    updatedAt: now,
  };

  await db.suppliers.add(newSupplier);
  return newSupplier;
}

export async function updateSupplier(
  id: string,
  data: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const existing = await db.suppliers.get(id);
  if (!existing) {
    throw new Error('ไม่พบข้อมูลผู้ขายที่ต้องการแก้ไข');
  }

  const updated: Partial<Supplier> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (data.displayName !== undefined) updated.displayName = data.displayName.trim();
  if (data.legalName !== undefined) updated.legalName = data.legalName.trim();
  if (data.taxpayerId !== undefined) updated.taxpayerId = String(data.taxpayerId).trim();
  if (data.branchNumber !== undefined) updated.branchNumber = String(data.branchNumber).trim();

  await db.suppliers.update(id, updated);
}

/**
 * Checks how many purchase tax records currently reference this supplierId
 */
export async function checkSupplierUsage(supplierId: string): Promise<number> {
  return await db.purchaseTaxRecords.where('supplierId').equals(supplierId).count();
}

/**
 * Safe delete: check if used, can still proceed if user explicitly confirmed because historical records have snapshot!
 */
export async function deleteSupplier(id: string): Promise<void> {
  await db.suppliers.delete(id);
}
