import { db } from '../db/db';
import { BusinessSettings } from '../types';

const DEFAULT_SETTINGS_ID = 'default_business_settings';

export const DEFAULT_SETTINGS: BusinessSettings = {
  id: DEFAULT_SETTINGS_ID,
  businessName: '',
  taxpayerId: '',
  branchType: 'HEAD',
  branchNumber: '00000',
  address: '',
  phone: '',
  vatRate: 7,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const settings = await db.businessSettings.get(DEFAULT_SETTINGS_ID);
  if (!settings) {
    return DEFAULT_SETTINGS;
  }
  return settings;
}

export async function saveBusinessSettings(
  data: Partial<Omit<BusinessSettings, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<BusinessSettings> {
  const existing = await db.businessSettings.get(DEFAULT_SETTINGS_ID);
  const now = new Date().toISOString();

  const updated: BusinessSettings = {
    ...(existing || DEFAULT_SETTINGS),
    ...data,
    id: DEFAULT_SETTINGS_ID,
    updatedAt: now,
  };

  await db.businessSettings.put(updated);
  return updated;
}
