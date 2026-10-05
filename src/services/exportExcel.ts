import * as XLSX from 'xlsx';
import { BusinessSettings, PurchaseTaxRecord, SalesTaxRecord } from '../types';
import { formatThaiDateShort, getThaiMonthName, toBuddhistYear } from '../utils/thaiDate';
import { calculateSummary } from './taxService';

/**
 * Helper to ensure a value is written as text in SheetJS (preserving leading zeros like '0101234567890', '00000')
 */
function toTextCell(val: string | number | undefined | null): XLSX.CellObject {
  return {
    t: 's',
    v: String(val ?? ''),
  };
}

function toNumberCell(val: number | undefined | null): XLSX.CellObject {
  return {
    t: 'n',
    v: Number(val ?? 0),
    z: '#,##0.00',
  };
}

export function exportPurchaseTaxToExcel(
  records: PurchaseTaxRecord[],
  settings: BusinessSettings,
  year: number,
  month: number
): string {
  const beYear = toBuddhistYear(year);
  const monthName = getThaiMonthName(month);
  const filename = `PurchaseTax_${year}_${String(month).padStart(2, '0')}.xlsx`;

  const wb = XLSX.utils.book_new();

  // Header information lines
  const data: Array<Array<XLSX.CellObject | string>> = [
    ['รายงานภาษีซื้อ (Purchase Tax Report)'],
    [
      `ชื่อผู้ประกอบการ: ${settings.businessName || '-'}`,
      '',
      `เลขประจำตัวผู้เสียภาษี: ${settings.taxpayerId || '-'}`,
    ],
    [
      `สถานประกอบการ: ${
        settings.branchType === 'HEAD'
          ? 'สำนักงานใหญ่'
          : `สาขาที่ ${settings.branchNumber || '00000'}`
      }`,
      '',
      `เดือนภาษี: ${monthName} พ.ศ. ${beYear} (ค.ศ. ${year})`,
    ],
    [], // Blank line
    // Table Headers
    [
      'ลำดับ',
      'วันที่',
      'เล่มที่',
      'เลขที่ใบกำกับภาษี',
      'ชื่อผู้ขายสินค้า / ผู้ให้บริการ',
      'เลขประจำตัวผู้เสียภาษี',
      'สถานประกอบการ',
      'สาขาที่',
      'มูลค่าสินค้าหรือบริการ',
      'อัตรา VAT (%)',
      'จำนวนเงินภาษีมูลค่าเพิ่ม',
      'จำนวนเงินรวมทั้งสิ้น',
      'หมายเหตุ',
    ],
  ];

  // Rows
  records.forEach((r, idx) => {
    data.push([
      String(idx + 1),
      toTextCell(formatThaiDateShort(r.taxDate)),
      toTextCell(r.invoiceBookNumber || '-'),
      toTextCell(r.invoiceNumber),
      toTextCell(r.supplierNameSnapshot),
      toTextCell(r.supplierTaxpayerIdSnapshot),
      toTextCell(r.supplierBranchTypeSnapshot === 'HEAD' ? 'สำนักงานใหญ่' : 'สาขา'),
      toTextCell(r.supplierBranchNumberSnapshot || '00000'),
      toNumberCell(r.taxableAmount),
      toNumberCell(r.vatRate),
      toNumberCell(r.vatAmount),
      toNumberCell(r.totalAmount),
      toTextCell(r.note || ''),
    ]);
  });

  // Summary row
  const summary = calculateSummary(records);
  data.push([]);
  data.push([
    'รวมทั้งสิ้น',
    `จำนวน ${summary.count} รายการ`,
    '',
    '',
    '',
    '',
    '',
    '',
    toNumberCell(summary.taxableAmount),
    '',
    toNumberCell(summary.vatAmount),
    toNumberCell(summary.totalAmount),
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths for optimal reading
  ws['!cols'] = [
    { wch: 8 }, // ลำดับ
    { wch: 14 }, // วันที่
    { wch: 12 }, // เล่มที่
    { wch: 18 }, // เลขที่
    { wch: 32 }, // ชื่อผู้ขาย
    { wch: 20 }, // Tax ID
    { wch: 16 }, // สถานประกอบการ
    { wch: 10 }, // สาขาที่
    { wch: 20 }, // มูลค่า
    { wch: 12 }, // VAT%
    { wch: 20 }, // VAT
    { wch: 20 }, // รวม
    { wch: 24 }, // หมายเหตุ
  ];

  XLSX.utils.book_append_sheet(wb, ws, `ภาษีซื้อ ${monthName} ${beYear}`);
  XLSX.writeFile(wb, filename);

  return filename;
}

export function exportSalesTaxToExcel(
  records: SalesTaxRecord[],
  settings: BusinessSettings,
  year: number,
  month: number
): string {
  const beYear = toBuddhistYear(year);
  const monthName = getThaiMonthName(month);
  const filename = `SalesTax_${year}_${String(month).padStart(2, '0')}.xlsx`;

  const wb = XLSX.utils.book_new();

  // Header information lines
  const data: Array<Array<XLSX.CellObject | string>> = [
    ['รายงานภาษีขาย (Sales Tax Report)'],
    [
      `ชื่อผู้ประกอบการ: ${settings.businessName || '-'}`,
      '',
      `เลขประจำตัวผู้เสียภาษี: ${settings.taxpayerId || '-'}`,
    ],
    [
      `สถานประกอบการ: ${
        settings.branchType === 'HEAD'
          ? 'สำนักงานใหญ่'
          : `สาขาที่ ${settings.branchNumber || '00000'}`
      }`,
      '',
      `เดือนภาษี: ${monthName} พ.ศ. ${beYear} (ค.ศ. ${year})`,
    ],
    [], // Blank line
    // Table Headers
    [
      'ลำดับ',
      'วันที่',
      'เล่มที่',
      'เลขที่ใบกำกับภาษี',
      'ชื่อผู้ซื้อสินค้า / ผู้รับบริการ',
      'เลขประจำตัวผู้เสียภาษี',
      'สถานประกอบการ',
      'สาขาที่',
      'มูลค่าสินค้าหรือบริการ',
      'อัตรา VAT (%)',
      'จำนวนเงินภาษีมูลค่าเพิ่ม',
      'จำนวนเงินรวมทั้งสิ้น',
      'หมายเหตุ',
    ],
  ];

  // Rows
  records.forEach((r, idx) => {
    data.push([
      String(idx + 1),
      toTextCell(formatThaiDateShort(r.taxDate)),
      toTextCell(r.invoiceBookNumber || '-'),
      toTextCell(r.invoiceNumber),
      toTextCell(r.customerNameSnapshot),
      toTextCell(r.customerTaxpayerIdSnapshot),
      toTextCell(r.customerBranchTypeSnapshot === 'HEAD' ? 'สำนักงานใหญ่' : 'สาขา'),
      toTextCell(r.customerBranchNumberSnapshot || '00000'),
      toNumberCell(r.taxableAmount),
      toNumberCell(r.vatRate),
      toNumberCell(r.vatAmount),
      toNumberCell(r.totalAmount),
      toTextCell(r.note || ''),
    ]);
  });

  // Summary row
  const summary = calculateSummary(records);
  data.push([]);
  data.push([
    'รวมทั้งสิ้น',
    `จำนวน ${summary.count} รายการ`,
    '',
    '',
    '',
    '',
    '',
    '',
    toNumberCell(summary.taxableAmount),
    '',
    toNumberCell(summary.vatAmount),
    toNumberCell(summary.totalAmount),
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Set column widths
  ws['!cols'] = [
    { wch: 8 }, // ลำดับ
    { wch: 14 }, // วันที่
    { wch: 12 }, // เล่มที่
    { wch: 18 }, // เลขที่
    { wch: 32 }, // ชื่อผู้ซื้อ
    { wch: 20 }, // Tax ID
    { wch: 16 }, // สถานประกอบการ
    { wch: 10 }, // สาขาที่
    { wch: 20 }, // มูลค่า
    { wch: 12 }, // VAT%
    { wch: 20 }, // VAT
    { wch: 20 }, // รวม
    { wch: 24 }, // หมายเหตุ
  ];

  XLSX.utils.book_append_sheet(wb, ws, `ภาษีขาย ${monthName} ${beYear}`);
  XLSX.writeFile(wb, filename);

  return filename;
}

export function exportTaxPayableToExcel(
  purchaseRecords: PurchaseTaxRecord[],
  salesRecords: SalesTaxRecord[],
  settings: BusinessSettings,
  year: number,
  month: number
): string {
  const beYear = toBuddhistYear(year);
  const monthName = getThaiMonthName(month);
  const filename = `TaxPayable_${year}_${String(month).padStart(2, '0')}.xlsx`;

  const wb = XLSX.utils.book_new();

  const purchaseSummary = calculateSummary(purchaseRecords);
  const salesSummary = calculateSummary(salesRecords);
  const netTax = Number((salesSummary.vatAmount - purchaseSummary.vatAmount).toFixed(2));

  // Sheet 1: สรุปภาษีที่ต้องจ่าย
  const summaryData: Array<Array<XLSX.CellObject | string>> = [
    ['รายงานสรุปภาษีที่ต้องจ่าย (คำนวณภาษีมูลค่าเพิ่ม ภ.พ.30)'],
    [`ชื่อผู้ประกอบการ: ${settings.businessName || '-'}`, '', `เลขประจำตัวผู้เสียภาษี: ${settings.taxpayerId || '-'}`],
    [`สถานประกอบการ: ${settings.branchType === 'HEAD' ? 'สำนักงานใหญ่' : 'สาขาที่ ' + (settings.branchNumber || '00000')}`],
    [`ประจำเดือนภาษี: ${monthName} พ.ศ. ${beYear}`],
    [],
    ['รายการคำนวณภาษี', 'มูลค่าสินค้า/บริการ (ก่อน VAT)', 'ภาษีมูลค่าเพิ่ม (VAT)', 'จำนวนรายการ'],
    ['1. ยอดขายและภาษีขาย (Output Tax)', toNumberCell(salesSummary.taxableAmount), toNumberCell(salesSummary.vatAmount), `${salesSummary.count} รายการ`],
    ['2. ยอดซื้อและภาษีซื้อ (Input Tax)', toNumberCell(purchaseSummary.taxableAmount), toNumberCell(purchaseSummary.vatAmount), `${purchaseSummary.count} รายการ`],
    [],
    [
      netTax >= 0 ? 'สรุป: ยอดเสียภาษี (ภาษีที่ต้องชำระ)' : 'สรุป: ภาษีชำระเกิน (เครดิตยกไป)',
      '',
      toNumberCell(Math.abs(netTax)),
      netTax >= 0 ? 'ภาษีขายมากกว่าภาษีซื้อ (นำส่งกรมสรรพากร)' : 'ภาษีซื้อมากกว่าภาษีขาย (ขอคืน/เครดิตยกไป)',
    ],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  wsSummary['!cols'] = [
    { wch: 36 },
    { wch: 28 },
    { wch: 24 },
    { wch: 40 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุปภาษีที่ต้องจ่าย');

  XLSX.writeFile(wb, filename);
  return filename;
}
