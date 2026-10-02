import { BusinessSettings } from './businessSettings';
import { Supplier } from './supplier';
import { Customer } from './customer';
import { PurchaseTaxRecord, SalesTaxRecord } from './tax';
import { InvoiceNumberConfig } from './invoiceConfig';

export interface BackupData {
  backupFormatVersion: string; // e.g. '1.0'
  schemaVersion: number; // e.g. 1
  appVersion: string; // e.g. '1.0.0'
  exportedAt: string; // ISO Date string
  businessSettings?: BusinessSettings[];
  suppliers: Supplier[];
  customers: Customer[];
  purchaseTaxRecords: PurchaseTaxRecord[];
  salesTaxRecords: SalesTaxRecord[];
  invoiceNumberConfigs?: InvoiceNumberConfig[];
}

export interface BackupPreview {
  businessName: string;
  supplierCount: number;
  customerCount: number;
  purchaseCount: number;
  salesCount: number;
  exportedAt: string;
  schemaVersion: number;
  appVersion: string;
}
