import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  AlertCircle,
} from 'lucide-react';
import { db } from '../db/db';
import { getBusinessSettings } from '../services/settingsService';
import { calculateSummary } from '../services/taxService';
import {
  exportPurchaseTaxToExcel,
  exportSalesTaxToExcel,
} from '../services/exportExcel';
import {
  exportPurchaseTaxToPdf,
  exportSalesTaxToPdf,
} from '../services/exportPdf';
import {
  formatThaiDateShort,
  getThaiMonthName,
  toBuddhistYear,
} from '../utils/thaiDate';
import { formatCurrency } from '../utils/calculation';

interface ReportsPageProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onShowToast }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [reportType, setReportType] = useState<'PURCHASE' | 'SALES'>('PURCHASE');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [isExporting, setIsExporting] = useState(false);

  // Live queries
  const settings = useLiveQuery(() => getBusinessSettings());

  const purchaseRecords = useLiveQuery(
    () =>
      db.purchaseTaxRecords
        .where('taxYear')
        .equals(selectedYear)
        .filter((r) => r.taxMonth === selectedMonth)
        .toArray(),
    [selectedYear, selectedMonth]
  ) || [];

  const salesRecords = useLiveQuery(
    () =>
      db.salesTaxRecords
        .where('taxYear')
        .equals(selectedYear)
        .filter((r) => r.taxMonth === selectedMonth)
        .toArray(),
    [selectedYear, selectedMonth]
  ) || [];

  const activeRecords = reportType === 'PURCHASE' ? purchaseRecords : salesRecords;

  // Sort ascending by date and invoice number
  const sortedRecords = [...activeRecords].sort((a, b) => {
    const d = a.taxDate.localeCompare(b.taxDate);
    if (d !== 0) return d;
    return a.invoiceNumber.localeCompare(b.invoiceNumber);
  });

  const summary = calculateSummary(sortedRecords);

  const availableYears = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  const handleExportExcel = async () => {
    if (!settings) {
      onShowToast('กรุณาตั้งค่าข้อมูลกิจการก่อนส่งออกรายงาน', 'error');
      return;
    }
    try {
      setIsExporting(true);
      if (reportType === 'PURCHASE') {
        exportPurchaseTaxToExcel(purchaseRecords, settings, selectedYear, selectedMonth);
      } else {
        exportSalesTaxToExcel(salesRecords, settings, selectedYear, selectedMonth);
      }
      onShowToast('ส่งออกไฟล์ Excel สำเร็จแล้ว', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ส่งออกไฟล์ Excel ไม่สำเร็จ';
      onShowToast(message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPdf = async () => {
    if (!settings) {
      onShowToast('กรุณาตั้งค่าข้อมูลกิจการก่อนส่งออกรายงาน', 'error');
      return;
    }
    try {
      setIsExporting(true);
      if (reportType === 'PURCHASE') {
        await exportPurchaseTaxToPdf(purchaseRecords, settings, selectedYear, selectedMonth);
      } else {
        await exportSalesTaxToPdf(salesRecords, settings, selectedYear, selectedMonth);
      }
      onShowToast('ดาวน์โหลดเอกสาร PDF สำเร็จแล้ว', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ส่งออก PDF ไม่สำเร็จ';
      onShowToast(message, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Configuration & Action Bar (Hidden on Print) */}
      <div className="no-print space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-700" />
              <h2 className="text-xl font-bold text-slate-900">
                รายงานภาษี (Tax Reports)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              สร้างและส่งออกรายงานภาษีซื้อ/ภาษีขาย ตามแบบกรมสรรพากร (ภ.พ.30)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              disabled={isExporting || sortedRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={isExporting || sortedRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด PDF</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={sortedRecords.length === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงาน</span>
            </button>
          </div>
        </div>

        {/* Filter Selection Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ประเภทรายงานภาษี
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportType('PURCHASE')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                  reportType === 'PURCHASE'
                    ? 'bg-teal-700 text-white border-teal-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                รายงานภาษีซื้อ
              </button>
              <button
                type="button"
                onClick={() => setReportType('SALES')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg border transition cursor-pointer ${
                  reportType === 'SALES'
                    ? 'bg-indigo-700 text-white border-indigo-700'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                รายงานภาษีขาย
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ปีภาษี (พ.ศ.)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
              <Calendar className="w-4 h-4 text-slate-500" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    พ.ศ. {toBuddhistYear(y)} ({y})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เดือนภาษี
            </label>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
              <Filter className="w-4 h-4 text-slate-500" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="w-full bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {getThaiMonthName(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Business Settings Notice */}
        {(!settings?.taxpayerId || settings.taxpayerId.length !== 13) && (
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center gap-2.5 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              ข้อมูลหัวกระดาษของกิจการยังไม่สมบูรณ์ กรุณาไปที่เมนู <strong>ตั้งค่ากิจการ</strong>{' '}
              เพื่อระบุเลขประจำตัวผู้เสียภาษี 13 หลักและชื่อกิจการให้ถูกต้องตามแบบสรรพากร
            </span>
          </div>
        )}
      </div>

      {/* Official Tax Report Printable Document Canvas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 md:p-8 print:border-none print:shadow-none print:p-0">
        {/* Report Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-4 text-slate-900">
          <div className="text-center">
            <h1 className="text-lg md:text-xl font-bold tracking-tight">
              {reportType === 'PURCHASE' ? 'รายงานภาษีซื้อ' : 'รายงานภาษีขาย'}
            </h1>
            <p className="text-xs font-medium text-slate-600 mt-1">
              เดือนภาษี {getThaiMonthName(selectedMonth)} พ.ศ. {toBuddhistYear(selectedYear)}
            </p>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div>
              <span className="font-semibold text-slate-700">ชื่อผู้ประกอบการ: </span>
              <span className="font-bold text-slate-900">
                {settings?.businessName || 'ยังไม่ได้ระบุชื่อกิจการ'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">เลขประจำตัวผู้เสียภาษีอากร: </span>
              <span className="font-mono font-bold text-slate-900">
                {settings?.taxpayerId || 'ยังไม่ได้ระบุ'}
              </span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">ชื่อสถานประกอบการ: </span>
              <span>{settings?.businessName || '-'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-700">สถานประกอบการ: </span>
              <span>
                {settings?.branchType === 'HEAD'
                  ? 'สำนักงานใหญ่'
                  : `สาขาที่ ${settings?.branchNumber || '00000'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Report Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border border-slate-300 border-collapse">
            <thead className="bg-slate-100 font-semibold text-slate-800 border-b border-slate-300 text-center">
              <tr>
                <th className="border border-slate-300 px-2 py-2 w-10" rowSpan={2}>
                  ลำดับ
                </th>
                <th className="border border-slate-300 px-2 py-2 w-20" rowSpan={2}>
                  วัน เดือน ปี
                </th>
                <th className="border border-slate-300 px-2 py-1" colSpan={2}>
                  ใบกำกับภาษี
                </th>
                <th className="border border-slate-300 px-2 py-2" rowSpan={2}>
                  {reportType === 'PURCHASE'
                    ? 'ชื่อผู้ขายสินค้า / ผู้ให้บริการ'
                    : 'ชื่อผู้ซื้อสินค้า / ผู้รับบริการ'}
                </th>
                <th className="border border-slate-300 px-2 py-2 w-28" rowSpan={2}>
                  เลขประจำตัวผู้เสียภาษี
                </th>
                <th className="border border-slate-300 px-2 py-1" colSpan={2}>
                  สถานประกอบการ
                </th>
                <th className="border border-slate-300 px-2 py-2 text-right w-24" rowSpan={2}>
                  มูลค่าสินค้า/บริการ
                </th>
                <th className="border border-slate-300 px-2 py-2 text-right w-20" rowSpan={2}>
                  จำนวนภาษีมูลค่าเพิ่ม
                </th>
                <th className="border border-slate-300 px-2 py-2 text-right w-24" rowSpan={2}>
                  จำนวนเงินรวม
                </th>
              </tr>
              <tr>
                <th className="border border-slate-300 px-2 py-1 w-14 font-medium text-[11px]">
                  เล่มที่
                </th>
                <th className="border border-slate-300 px-2 py-1 w-24 font-medium text-[11px]">
                  เลขที่
                </th>
                <th className="border border-slate-300 px-1 py-1 w-12 font-medium text-[11px]">
                  สนญ.
                </th>
                <th className="border border-slate-300 px-1 py-1 w-14 font-medium text-[11px]">
                  สาขาที่
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRecords.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="border border-slate-300 px-4 py-8 text-center text-slate-400"
                  >
                    ไม่มีรายการภาษีสำหรับเดือนนี้
                  </td>
                </tr>
              ) : (
                sortedRecords.map((r, idx) => {
                  const partyName =
                    'supplierNameSnapshot' in r
                      ? r.supplierNameSnapshot
                      : r.customerNameSnapshot;
                  const partyTaxId =
                    'supplierTaxpayerIdSnapshot' in r
                      ? r.supplierTaxpayerIdSnapshot
                      : r.customerTaxpayerIdSnapshot;
                  const isHead =
                    'supplierBranchTypeSnapshot' in r
                      ? r.supplierBranchTypeSnapshot === 'HEAD'
                      : r.customerBranchTypeSnapshot === 'HEAD';
                  const branchNum =
                    'supplierBranchNumberSnapshot' in r
                      ? r.supplierBranchNumberSnapshot
                      : r.customerBranchNumberSnapshot;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500 font-mono">
                        {idx + 1}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">
                        {formatThaiDateShort(r.taxDate)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-center font-mono text-slate-600">
                        {r.invoiceBookNumber || '-'}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 font-mono font-medium text-slate-800">
                        {r.invoiceNumber}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-slate-900">
                        {partyName}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 font-mono text-center text-slate-700">
                        {partyTaxId || '-'}
                      </td>
                      <td className="border border-slate-300 px-1 py-1.5 text-center">
                        {isHead ? '✓' : ''}
                      </td>
                      <td className="border border-slate-300 px-1 py-1.5 text-center font-mono">
                        {!isHead ? branchNum || '00000' : ''}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-slate-800">
                        {formatCurrency(r.taxableAmount)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-medium text-slate-900">
                        {formatCurrency(r.vatAmount)}
                      </td>
                      <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-slate-900 font-semibold">
                        {formatCurrency(r.totalAmount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer with Totals */}
            <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
              <tr>
                <td
                  colSpan={8}
                  className="border border-slate-300 px-3 py-2 text-right"
                >
                  รวมยอดทั้งสิ้น ({summary.count} รายการ)
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right font-mono">
                  {formatCurrency(summary.taxableAmount)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right font-mono">
                  {formatCurrency(summary.vatAmount)}
                </td>
                <td className="border border-slate-300 px-2 py-2 text-right font-mono">
                  {formatCurrency(summary.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Official Revenue Department Footer Note */}
        <div className="mt-6 pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
          <div>
            * รายงานภาษีนี้จัดทำตามข้อกำหนดของประมวลรัษฎากร กรมสรรพากรแห่งประเทศไทย
          </div>
          <div>พิมพ์เมื่อ: {new Date().toLocaleDateString('th-TH')}</div>
        </div>
      </div>
    </div>
  );
};
