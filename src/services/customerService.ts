import { db, generateId } from '../db/db';
import { Customer } from '../types';

export async function getCustomers(): Promise<Customer[]> {
  return await db.customers.orderBy('displayName').toArray();
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
  const newCustomer: Customer = {
    ...data,
    id: generateId(),
    displayName: data.displayName.trim(),
    legalName: data.legalName.trim() || data.displayName.trim(),
    taxpayerId: String(data.taxpayerId || '').trim(),
    branchNumber: String(data.branchNumber || '00000').trim(),
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

  await db.customers.update(id, updated);
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
