export interface PurchaseTaxRecord {
  id: string;
  taxDate: string; // YYYY-MM-DD
  taxYear: number; // ปี ค.ศ. (Gregorian e.g. 2026)
  taxMonth: number; // เดือน (1-12)
  invoiceBookNumber: string; // เล่มที่
  invoiceNumber: string; // เลขที่ใบกำกับภาษี

  // Supplier reference & snapshot
  supplierId: string;
  supplierNameSnapshot: string;
  supplierTaxpayerIdSnapshot: string;
  supplierBranchTypeSnapshot: 'HEAD' | 'BRANCH';
  supplierBranchNumberSnapshot: string;

  // Amounts
  taxableAmount: number; // มูลค่าสินค้าหรือบริการ
  vatRate: number; // อัตรา VAT (เช่น 7)
  vatAmount: number; // จำนวนเงินภาษีมูลค่าเพิ่ม
  totalAmount: number; // รวมทั้งสิ้น

  note: string; // หมายเหตุ
  createdAt: string;
  updatedAt: string;
}

export interface SalesTaxRecord {
  id: string;
  taxDate: string; // YYYY-MM-DD
  taxYear: number; // ปี ค.ศ. (Gregorian e.g. 2026)
  taxMonth: number; // เดือน (1-12)
  invoiceBookNumber: string; // เล่มที่
  invoiceNumber: string; // เลขที่ใบกำกับภาษี

  // Customer reference & snapshot
  customerId: string;
  customerNameSnapshot: string;
  customerTaxpayerIdSnapshot: string;
  customerBranchTypeSnapshot: 'HEAD' | 'BRANCH';
  customerBranchNumberSnapshot: string;

  // Amounts
  taxableAmount: number; // มูลค่าสินค้าหรือบริการ
  vatRate: number; // อัตรา VAT (เช่น 7)
  vatAmount: number; // จำนวนเงินภาษีมูลค่าเพิ่ม
  totalAmount: number; // รวมทั้งสิ้น

  note: string; // หมายเหตุ
  createdAt: string;
  updatedAt: string;
}

export interface TaxSummary {
  count: number;
  taxableAmount: number;
  vatAmount: number;
  totalAmount: number;
}
