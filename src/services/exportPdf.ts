import { jsPDF } from 'jspdf';
import { BusinessSettings, PurchaseTaxRecord, SalesTaxRecord } from '../types';
import { formatCurrency } from '../utils/calculation';
import { formatThaiDateShort, getThaiMonthName, toBuddhistYear } from '../utils/thaiDate';
import { calculateSummary } from './taxService';

interface TableRowData {
  seq: number;
  date: string;
  bookNo: string;
  invNo: string;
  partnerName: string;
  taxId: string;
  branch: string;
  taxable: string;
  vat: string;
  total: string;
  note: string;
}

function renderReportPageToCanvas(
  title: string,
  settings: BusinessSettings,
  monthName: string,
  beYear: number,
  gregorianYear: number,
  partnerColumnTitle: string,
  rows: TableRowData[],
  pageNumber: number,
  totalPages: number,
  isLastPage: boolean,
  summaryTotals?: { count: number; taxable: string; vat: string; total: string }
): HTMLCanvasElement {
  // A4 Landscape at 2x scale: 297mm x 210mm -> 1188 x 840 px @ ~100dpi, scaled 2x = 2376 x 1680
  const canvasWidth = 2376;
  const canvasHeight = 1680;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Setup font
  const fontFamily = "'Sarabun', 'Leelawadee UI', 'Tahoma', sans-serif";

  // Margins
  const marginX = 80;
  let currentY = 70;

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold 38px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(title, canvasWidth / 2, currentY);

  currentY += 45;
  ctx.font = `22px ${fontFamily}`;
  ctx.fillStyle = '#334155';
  ctx.fillText(
    `สำหรับเดือนภาษี ${monthName} พ.ศ. ${beYear} (ค.ศ. ${gregorianYear})`,
    canvasWidth / 2,
    currentY
  );

  // Business Information Bar
  currentY += 50;
  ctx.textAlign = 'left';
  ctx.font = `bold 22px ${fontFamily}`;
  ctx.fillText(`ชื่อผู้ประกอบการ: `, marginX, currentY);
  ctx.font = `22px ${fontFamily}`;
  ctx.fillText(settings.businessName || '-', marginX + 170, currentY);

  ctx.textAlign = 'right';
  ctx.font = `bold 22px ${fontFamily}`;
  ctx.fillText(
    `เลขประจำตัวผู้เสียภาษี: `,
    canvasWidth - marginX - 250,
    currentY
  );
  ctx.font = `22px ${fontFamily}`;
  ctx.fillText(settings.taxpayerId || '-', canvasWidth - marginX, currentY);

  currentY += 34;
  ctx.textAlign = 'left';
  ctx.font = `bold 22px ${fontFamily}`;
  ctx.fillText(`สถานประกอบการ: `, marginX, currentY);
  ctx.font = `22px ${fontFamily}`;
  const branchLabel =
    settings.branchType === 'HEAD'
      ? 'สำนักงานใหญ่'
      : `สาขาที่ ${settings.branchNumber || '00000'}`;
  ctx.fillText(branchLabel, marginX + 170, currentY);

  ctx.textAlign = 'right';
  ctx.font = `20px ${fontFamily}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText(`หน้า ${pageNumber} / ${totalPages}`, canvasWidth - marginX, currentY);

  // Table setup
  currentY += 30;
  const tableX = marginX;
  const tableWidth = canvasWidth - marginX * 2;
  const colWidths = [
    70, // ลำดับ
    140, // วันที่
    110, // เล่มที่
    170, // เลขที่
    560, // ผู้ขาย/ผู้ซื้อ
    240, // Tax ID
    140, // สาขา
    240, // มูลค่า
    210, // VAT
    240, // รวม
    96, // Note
  ];

  const colHeaders = [
    'ลำดับ',
    'วันที่',
    'เล่มที่',
    'เลขที่ใบกำกับ',
    partnerColumnTitle,
    'เลขผู้เสียภาษี',
    'สาขา',
    'มูลค่าก่อน VAT',
    'ภาษีมูลค่าเพิ่ม',
    'รวมทั้งสิ้น',
    'หมายเหตุ',
  ];

  // Header row
  const headerHeight = 50;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(tableX, currentY, tableWidth, headerHeight);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(tableX, currentY, tableWidth, headerHeight);

  ctx.fillStyle = '#0f172a';
  ctx.font = `bold 20px ${fontFamily}`;

  let colX = tableX;
  for (let c = 0; c < colHeaders.length; c++) {
    const w = colWidths[c];
    ctx.textAlign = 'center';
    ctx.fillText(colHeaders[c], colX + w / 2, currentY + 32);
    if (c > 0) {
      ctx.beginPath();
      ctx.moveTo(colX, currentY);
      ctx.lineTo(colX, currentY + headerHeight);
      ctx.stroke();
    }
    colX += w;
  }

  currentY += headerHeight;

  // Data rows
  const rowHeight = 44;
  ctx.font = `19px ${fontFamily}`;

  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    ctx.fillStyle = r % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(tableX, currentY, tableWidth, rowHeight);
    ctx.strokeRect(tableX, currentY, tableWidth, rowHeight);

    const cells = [
      { text: String(row.seq), align: 'center' },
      { text: row.date, align: 'center' },
      { text: row.bookNo, align: 'center' },
      { text: row.invNo, align: 'center' },
      { text: row.partnerName, align: 'left' },
      { text: row.taxId, align: 'center' },
      { text: row.branch, align: 'center' },
      { text: row.taxable, align: 'right' },
      { text: row.vat, align: 'right' },
      { text: row.total, align: 'right' },
      { text: row.note, align: 'left' },
    ];

    let cx = tableX;
    ctx.fillStyle = '#1e293b';

    for (let c = 0; c < cells.length; c++) {
      const w = colWidths[c];
      const cell = cells[c];
      let textX = cx + w / 2;
      if (cell.align === 'left') textX = cx + 12;
      if (cell.align === 'right') textX = cx + w - 12;

      ctx.textAlign = cell.align as CanvasTextAlign;
      // Truncate if partner name is very long
      let printText = cell.text;
      if (c === 4 && printText.length > 36) {
        printText = printText.substring(0, 34) + '...';
      }
      ctx.fillText(printText, textX, currentY + 28);

      if (c > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, currentY);
        ctx.lineTo(cx, currentY + rowHeight);
        ctx.stroke();
      }
      cx += w;
    }

    currentY += rowHeight;
  }

  // Summary Row on Last Page
  if (isLastPage && summaryTotals) {
    const summaryHeight = 52;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(tableX, currentY, tableWidth, summaryHeight);
    ctx.strokeRect(tableX, currentY, tableWidth, summaryHeight);

    ctx.font = `bold 21px ${fontFamily}`;
    ctx.fillStyle = '#0f172a';

    // Left label
    ctx.textAlign = 'left';
    ctx.fillText(
      `รวมทั้งสิ้น (${summaryTotals.count} รายการ)`,
      tableX + 20,
      currentY + 33
    );

    // Sum taxable
    let taxableColX = tableX;
    for (let i = 0; i < 7; i++) taxableColX += colWidths[i];
    ctx.textAlign = 'right';
    ctx.fillText(summaryTotals.taxable, taxableColX + colWidths[7] - 12, currentY + 33);

    // Sum VAT
    const vatColX = taxableColX + colWidths[7];
    ctx.fillText(summaryTotals.vat, vatColX + colWidths[8] - 12, currentY + 33);

    // Sum Total
    const totalColX = vatColX + colWidths[8];
    ctx.fillText(summaryTotals.total, totalColX + colWidths[9] - 12, currentY + 33);

    currentY += summaryHeight;
  }

  // Footer note
  currentY += 45;
  ctx.textAlign = 'left';
  ctx.font = `18px ${fontFamily}`;
  ctx.fillStyle = '#64748b';
  const nowStr = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  ctx.fillText(`พิมพ์เมื่อวันที่: ${nowStr} (สร้างรายงานแบบออฟไลน์ด้วย Tax Record)`, marginX, currentY);

  return canvas;
}

export async function exportPurchaseTaxToPdf(
  records: PurchaseTaxRecord[],
  settings: BusinessSettings,
  year: number,
  month: number
): Promise<string> {
  const beYear = toBuddhistYear(year);
  const monthName = getThaiMonthName(month);
  const filename = `PurchaseTax_${year}_${String(month).padStart(2, '0')}.pdf`;

  const summary = calculateSummary(records);
  const summaryTotals = {
    count: summary.count,
    taxable: formatCurrency(summary.taxableAmount),
    vat: formatCurrency(summary.vatAmount),
    total: formatCurrency(summary.totalAmount),
  };

  const allRows: TableRowData[] = records.map((r, i) => ({
    seq: i + 1,
    date: formatThaiDateShort(r.taxDate),
    bookNo: r.invoiceBookNumber || '-',
    invNo: r.invoiceNumber,
    partnerName: r.supplierNameSnapshot,
    taxId: r.supplierTaxpayerIdSnapshot,
    branch:
      r.supplierBranchTypeSnapshot === 'HEAD'
        ? 'สนญ.'
        : r.supplierBranchNumberSnapshot || '00000',
    taxable: formatCurrency(r.taxableAmount),
    vat: formatCurrency(r.vatAmount),
    total: formatCurrency(r.totalAmount),
    note: r.note || '',
  }));

  // Chunk rows per page (18 rows per page fit nicely in A4 landscape)
  const rowsPerPage = 18;
  const pagesData: TableRowData[][] = [];
  if (allRows.length === 0) {
    pagesData.push([]);
  } else {
    for (let i = 0; i < allRows.length; i += rowsPerPage) {
      pagesData.push(allRows.slice(i, i + rowsPerPage));
    }
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const totalPages = pagesData.length;

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) pdf.addPage('a4', 'landscape');
    const isLastPage = p === totalPages - 1;
    const canvas = renderReportPageToCanvas(
      'รายงานภาษีซื้อ (Purchase Tax Report)',
      settings,
      monthName,
      beYear,
      year,
      'ชื่อผู้ขายสินค้า / ผู้ให้บริการ',
      pagesData[p],
      p + 1,
      totalPages,
      isLastPage,
      summaryTotals
    );

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
  }

  pdf.save(filename);
  return filename;
}

export async function exportSalesTaxToPdf(
  records: SalesTaxRecord[],
  settings: BusinessSettings,
  year: number,
  month: number
): Promise<string> {
  const beYear = toBuddhistYear(year);
  const monthName = getThaiMonthName(month);
  const filename = `SalesTax_${year}_${String(month).padStart(2, '0')}.pdf`;

  const summary = calculateSummary(records);
  const summaryTotals = {
    count: summary.count,
    taxable: formatCurrency(summary.taxableAmount),
    vat: formatCurrency(summary.vatAmount),
    total: formatCurrency(summary.totalAmount),
  };

  const allRows: TableRowData[] = records.map((r, i) => ({
    seq: i + 1,
    date: formatThaiDateShort(r.taxDate),
    bookNo: r.invoiceBookNumber || '-',
    invNo: r.invoiceNumber,
    partnerName: r.customerNameSnapshot,
    taxId: r.customerTaxpayerIdSnapshot,
    branch:
      r.customerBranchTypeSnapshot === 'HEAD'
        ? 'สนญ.'
        : r.customerBranchNumberSnapshot || '00000',
    taxable: formatCurrency(r.taxableAmount),
    vat: formatCurrency(r.vatAmount),
    total: formatCurrency(r.totalAmount),
    note: r.note || '',
  }));

  const rowsPerPage = 18;
  const pagesData: TableRowData[][] = [];
  if (allRows.length === 0) {
    pagesData.push([]);
  } else {
    for (let i = 0; i < allRows.length; i += rowsPerPage) {
      pagesData.push(allRows.slice(i, i + rowsPerPage));
    }
  }

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const totalPages = pagesData.length;

  for (let p = 0; p < totalPages; p++) {
    if (p > 0) pdf.addPage('a4', 'landscape');
    const isLastPage = p === totalPages - 1;
    const canvas = renderReportPageToCanvas(
      'รายงานภาษีขาย (Sales Tax Report)',
      settings,
      monthName,
      beYear,
      year,
      'ชื่อผู้ซื้อสินค้า / ผู้รับบริการ',
      pagesData[p],
      p + 1,
      totalPages,
      isLastPage,
      summaryTotals
    );

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
  }

  pdf.save(filename);
  return filename;
}

export async function exportTaxPayableToPdf(
  purchaseRecords: PurchaseTaxRecord[],
  salesRecords: SalesTaxRecord[],
  settings: BusinessSettings,
  year: number,
  month: number
): Promise<string> {
  const beYear = toBuddhistYear(year);
  const monthName = getThaiMonthName(month);
  const filename = `TaxPayable_${year}_${String(month).padStart(2, '0')}.pdf`;

  const purchaseSummary = calculateSummary(purchaseRecords);
  const salesSummary = calculateSummary(salesRecords);
  const netTax = Number((salesSummary.vatAmount - purchaseSummary.vatAmount).toFixed(2));

  const canvasWidth = 2376;
  const canvasHeight = 1680;
  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  const fontFamily = "'Sarabun', 'Leelawadee UI', 'Tahoma', sans-serif";
  const marginX = 120;
  let currentY = 90;

  // Header Title
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold 42px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText('รายงานสรุปภาษีที่ต้องจ่าย (คำนวณภาษีมูลค่าเพิ่ม ภ.พ.30)', canvasWidth / 2, currentY);

  currentY += 45;
  ctx.font = `24px ${fontFamily}`;
  ctx.fillStyle = '#475569';
  ctx.fillText(`สำหรับเดือนภาษี ${monthName} พ.ศ. ${beYear} (ค.ศ. ${year})`, canvasWidth / 2, currentY);

  // Business Information Bar
  currentY += 60;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(marginX, currentY, canvasWidth - marginX * 2, 110);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(marginX, currentY, canvasWidth - marginX * 2, 110);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#1e293b';
  ctx.font = `bold 24px ${fontFamily}`;
  ctx.fillText(`ชื่อผู้ประกอบการ: ${settings.businessName || '-'}`, marginX + 30, currentY + 45);
  ctx.font = `22px ${fontFamily}`;
  const branchLabel = settings.branchType === 'HEAD' ? 'สำนักงานใหญ่' : `สาขาที่ ${settings.branchNumber || '00000'}`;
  ctx.fillText(`สถานประกอบการ: ${branchLabel}`, marginX + 30, currentY + 85);

  ctx.textAlign = 'right';
  ctx.font = `bold 24px ${fontFamily}`;
  ctx.fillText(`เลขประจำตัวผู้เสียภาษี: ${settings.taxpayerId || '-'}`, canvasWidth - marginX - 30, currentY + 45);

  // Visual Boxes
  currentY += 160;

  // Left Box: ยอดขาย & ยอดซื้อ
  const box1X = marginX + 150;
  const box1W = 750;
  const box1H = 260;

  const monthYearLabel = `${monthName} พ.ศ. ${beYear}`;

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = `bold 32px ${fontFamily}`;
  ctx.fillText(monthYearLabel, box1X + box1W / 2, currentY - 20);

  // Outer border box 1
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 3;
  ctx.strokeRect(box1X, currentY, box1W, box1H);

  // Headers
  ctx.fillStyle = '#a9d18e';
  ctx.fillRect(box1X, currentY, box1W / 2 - 4, 90);
  ctx.fillStyle = '#ffc000';
  ctx.fillRect(box1X + box1W / 2 + 4, currentY, box1W / 2 - 4, 90);

  // Red separator in box 1
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(box1X + box1W / 2 - 4, currentY, 8, box1H);
  ctx.fillRect(box1X, currentY + box1H - 12, box1W, 12);

  // Values background
  ctx.fillStyle = '#f2f8ee';
  ctx.fillRect(box1X, currentY + 90, box1W / 2 - 4, box1H - 102);
  ctx.fillStyle = '#fffdf0';
  ctx.fillRect(box1X + box1W / 2 + 4, currentY + 90, box1W / 2 - 4, box1H - 102);

  // Box 1 text
  ctx.fillStyle = '#000000';
  ctx.font = `bold 28px ${fontFamily}`;
  ctx.fillText('ยอดขาย', box1X + box1W / 4, currentY + 55);
  ctx.fillText('ยอดซื้อ', box1X + (box1W * 3) / 4, currentY + 55);

  ctx.font = `bold 36px 'Courier New', monospace`;
  ctx.fillText(formatCurrency(salesSummary.taxableAmount), box1X + box1W / 4, currentY + 180);
  ctx.fillText(formatCurrency(purchaseSummary.taxableAmount), box1X + (box1W * 3) / 4, currentY + 180);

  // Right Box: ภาษีขาย, ภาษีซื้อ, ยอดเสียภาษี (Thick black frame)
  const box2X = box1X + box1W + 120;
  const box2W = 850;
  const box2H = 340;

  // Outer black frame
  ctx.fillStyle = '#000000';
  ctx.fillRect(box2X - 16, currentY - 16, box2W + 32, box2H + 32);

  const rowH = 105;
  // Row 1: ภาษีขาย
  ctx.fillStyle = '#a9d18e';
  ctx.fillRect(box2X, currentY, box2W / 2, rowH);
  ctx.fillStyle = '#e2efda';
  ctx.fillRect(box2X + box2W / 2, currentY, box2W / 2, rowH);

  // Row 2: ภาษีซื้อ
  ctx.fillStyle = '#ffc000';
  ctx.fillRect(box2X, currentY + rowH, box2W / 2, rowH);
  ctx.fillStyle = '#fff2cc';
  ctx.fillRect(box2X + box2W / 2, currentY + rowH, box2W / 2, rowH);

  // Cyan divider
  ctx.fillStyle = '#00b0f0';
  ctx.fillRect(box2X, currentY + rowH * 2, box2W, 14);

  // Row 3: ยอดเสียภาษี
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(box2X, currentY + rowH * 2 + 14, box2W / 2, rowH + 6);
  ctx.fillStyle = '#fce4d6';
  ctx.fillRect(box2X + box2W / 2, currentY + rowH * 2 + 14, box2W / 2, rowH + 6);

  // Text in Right Box
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.font = `bold 28px ${fontFamily}`;
  ctx.fillText('ภาษีขาย เดือนนี้', box2X + 30, currentY + 65);
  ctx.fillText('ภาษีซื้อ เดือนนี้', box2X + 30, currentY + rowH + 65);

  ctx.font = `bold 32px ${fontFamily}`;
  ctx.fillText('ยอดเสียภาษี', box2X + 30, currentY + rowH * 2 + 14 + 75);

  ctx.textAlign = 'right';
  ctx.font = `bold 34px 'Courier New', monospace`;
  ctx.fillText(formatCurrency(salesSummary.vatAmount), box2X + box2W - 30, currentY + 65);
  ctx.fillText(formatCurrency(purchaseSummary.vatAmount), box2X + box2W - 30, currentY + rowH + 65);

  ctx.font = `bold 44px 'Courier New', monospace`;
  ctx.fillText(formatCurrency(Math.abs(netTax)), box2X + box2W - 30, currentY + rowH * 2 + 14 + 78);

  // Summary Table Below
  currentY = currentY + box2H + 80;

  ctx.fillStyle = '#0f172a';
  ctx.font = `bold 28px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.fillText('รายละเอียดผลการคำนวณภาษีมูลค่าเพิ่ม (ภ.พ.30)', marginX, currentY);

  currentY += 25;
  // Summary table headers
  const thY = currentY;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(marginX, thY, canvasWidth - marginX * 2, 55);
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.strokeRect(marginX, thY, canvasWidth - marginX * 2, 55);

  ctx.fillStyle = '#0f172a';
  ctx.font = `bold 22px ${fontFamily}`;
  ctx.fillText('รายการ', marginX + 30, thY + 36);
  ctx.textAlign = 'right';
  ctx.fillText('มูลค่าก่อน VAT (บาท)', marginX + 850, thY + 36);
  ctx.fillText('ภาษีมูลค่าเพิ่ม (บาท)', marginX + 1350, thY + 36);
  ctx.fillText('สถานะ / ข้อกำหนด', canvasWidth - marginX - 30, thY + 36);

  // Row 1
  let rY = thY + 55;
  ctx.strokeRect(marginX, rY, canvasWidth - marginX * 2, 55);
  ctx.textAlign = 'left';
  ctx.font = `22px ${fontFamily}`;
  ctx.fillText(`1. ยอดขายและภาษีขาย (${salesSummary.count} รายการ)`, marginX + 30, rY + 36);
  ctx.textAlign = 'right';
  ctx.font = `22px 'Courier New', monospace`;
  ctx.fillText(formatCurrency(salesSummary.taxableAmount), marginX + 850, rY + 36);
  ctx.fillText(formatCurrency(salesSummary.vatAmount), marginX + 1350, rY + 36);
  ctx.font = `20px ${fontFamily}`;
  ctx.fillText('ภาษีขายที่ต้องนำส่ง (Output Tax)', canvasWidth - marginX - 30, rY + 36);

  // Row 2
  rY += 55;
  ctx.strokeRect(marginX, rY, canvasWidth - marginX * 2, 55);
  ctx.textAlign = 'left';
  ctx.font = `22px ${fontFamily}`;
  ctx.fillText(`2. ยอดซื้อและภาษีซื้อ (${purchaseSummary.count} รายการ)`, marginX + 30, rY + 36);
  ctx.textAlign = 'right';
  ctx.font = `22px 'Courier New', monospace`;
  ctx.fillText(formatCurrency(purchaseSummary.taxableAmount), marginX + 850, rY + 36);
  ctx.fillText(formatCurrency(purchaseSummary.vatAmount), marginX + 1350, rY + 36);
  ctx.font = `20px ${fontFamily}`;
  ctx.fillText('ภาษีซื้อที่นำมาหัก (Input Tax)', canvasWidth - marginX - 30, rY + 36);

  // Row 3 Totals
  rY += 55;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(marginX, rY, canvasWidth - marginX * 2, 65);
  ctx.strokeRect(marginX, rY, canvasWidth - marginX * 2, 65);
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.font = `bold 24px ${fontFamily}`;
  ctx.fillText(netTax >= 0 ? 'สรุป: ภาษีที่ต้องชำระ (ยอดเสียภาษี)' : 'สรุป: ภาษีชำระเกิน (เครดิตยกไป)', marginX + 30, rY + 42);
  ctx.textAlign = 'right';
  ctx.font = `bold 28px 'Courier New', monospace`;
  ctx.fillText(formatCurrency(Math.abs(netTax)), marginX + 1350, rY + 42);
  ctx.font = `bold 20px ${fontFamily}`;
  ctx.fillText(netTax >= 0 ? 'ยื่นแบบ ภ.พ.30 พร้อมชำระภาษี' : 'ขอคืนเงินภาษีหรือยกยอดไปเดือนหน้า', canvasWidth - marginX - 30, rY + 42);

  // Footer
  ctx.textAlign = 'left';
  ctx.font = `18px ${fontFamily}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('* จัดทำตามหลักเกณฑ์ภาษีมูลค่าเพิ่ม กรมสรรพากรแห่งประเทศไทย', marginX, canvasHeight - 60);
  ctx.textAlign = 'right';
  ctx.fillText(`พิมพ์เมื่อ: ${new Date().toLocaleDateString('th-TH')}`, canvasWidth - marginX, canvasHeight - 60);

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);

  pdf.save(filename);
  return filename;
}
