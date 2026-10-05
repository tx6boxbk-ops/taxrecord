import { db, generateId } from '../db/db';
import { Customer } from '../types';
import { sortPartners } from '../utils/partnerSort';

export async function getCustomers(): Promise<Customer[]> {
  const all = await db.customers.toArray();
  return sortPartners(all);
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  return await db.customers.get(id);
}

export async function checkDuplicateCustomer(
  taxpayerId: string,
  branchNumber: string,
  excludeId?: string
): Promise<boolean> {
  const cleanTaxId = taxpayerId.trim();
  const cleanBranch = branchNumber.trim();

  if (!cleanTaxId) return false;

  const matches = await db.customers
    .where('taxpayerId')
    .equals(cleanTaxId)
    .filter((c) => c.branchNumber.trim() === cleanBranch && c.id !== excludeId)
    .count();

  return matches > 0;
}

export async function createCustomer(
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Customer> {
  const now = new Date().toISOString();

  let sortOrder = data.sortOrder;
  if (sortOrder === undefined) {
    const existing = await db.customers.toArray();
    const maxOrder = existing.reduce((max, c) => {
      return typeof c.sortOrder === 'number' && c.sortOrder > max ? c.sortOrder : max;
    }, -1);
    sortOrder = maxOrder + 1;
  }

  const newCustomer: Customer = {
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

  await db.customers.add(newCustomer);
  return newCustomer;
}

export async function updateCustomer(
  id: string,
  data: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const existing = await db.customers.get(id);
  if (!existing) {
    throw new Error('ไม่พบข้อมูลผู้ซื้อที่ต้องการแก้ไข');
  }

  const updated: Partial<Customer> = {
    ...data,
    updatedAt: new Date().toISOString(),
  };

  if (data.displayName !== undefined) updated.displayName = data.displayName.trim();
  if (data.legalName !== undefined) updated.legalName = data.legalName.trim();
  if (data.taxpayerId !== undefined) updated.taxpayerId = String(data.taxpayerId).trim();
  if (data.branchNumber !== undefined) updated.branchNumber = String(data.branchNumber).trim();
  if (data.defaultVatRate !== undefined) updated.defaultVatRate = Number(data.defaultVatRate);
  if (data.sortOrder !== undefined) updated.sortOrder = Number(data.sortOrder);

  await db.customers.update(id, updated);
}

/**
 * Reorders all customers based on the provided ordered ID array
 */
export async function reorderCustomers(orderedIds: string[]): Promise<void> {
  await db.transaction('rw', db.customers, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.customers.update(orderedIds[i], { sortOrder: i });
    }
  });
}

/**
 * Moves a customer one step up or down in the custom order
 */
export async function moveCustomer(id: string, direction: 'up' | 'down'): Promise<void> {
  const all = sortPartners(await db.customers.toArray());
  const currentIndex = all.findIndex((c) => c.id === id);
  if (currentIndex === -1) return;

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= all.length) return;

  const [item] = all.splice(currentIndex, 1);
  all.splice(targetIndex, 0, item);

  await reorderCustomers(all.map((c) => c.id));
}

/**
 * Checks how many sales tax records currently reference this customerId
 */
export async function checkCustomerUsage(customerId: string): Promise<number> {
  return await db.salesTaxRecords.where('customerId').equals(customerId).count();
}

export async function deleteCustomer(id: string): Promise<void> {
  await db.customers.delete(id);
}
