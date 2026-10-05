import { db, generateId } from '../db/db';
import { Supplier } from '../types';
import { sortPartners } from '../utils/partnerSort';

export async function getSuppliers(): Promise<Supplier[]> {
  const all = await db.suppliers.toArray();
  return sortPartners(all);
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

  let sortOrder = data.sortOrder;
  if (sortOrder === undefined) {
    const existing = await db.suppliers.toArray();
    const maxOrder = existing.reduce((max, s) => {
      return typeof s.sortOrder === 'number' && s.sortOrder > max ? s.sortOrder : max;
    }, -1);
    sortOrder = maxOrder + 1;
  }

  const newSupplier: Supplier = {
    ...data,
    id: generateId(),
    displayName: data.displayName.trim(),
    legalName: data.legalName.trim() || data.displayName.trim(),
    taxpayerId: String(data.taxpayerId || '').trim(),
    branchNumber: String(data.branchNumber || '00000').trim(),
    defaultVatRate: data.defaultVatRate !== undefined ? Number(data.defaultVatRate) : 7,
    sortOrder,
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
  if (data.defaultVatRate !== undefined) updated.defaultVatRate = Number(data.defaultVatRate);
  if (data.sortOrder !== undefined) updated.sortOrder = Number(data.sortOrder);

  await db.suppliers.update(id, updated);
}

/**
 * Reorders all suppliers based on the provided ordered ID array
 */
export async function reorderSuppliers(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.suppliers, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.suppliers.update(orderedIds[i], { sortOrder: i });
    }
  });
}

/**
 * Moves a supplier one step up or down in the custom order
 */
export async function moveSupplier(id: string, direction: 'up' | 'down'): Promise<void> {
  const all = sortPartners(await db.suppliers.toArray());
  const currentIndex = all.findIndex((s) => s.id === id);
  if (currentIndex === -1) return;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= all.length) return;

  const [item] = all.splice(currentIndex, 1);
  all.splice(targetIndex, 0, item);

  await reorderSuppliers(all.map((s) => s.id));
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
