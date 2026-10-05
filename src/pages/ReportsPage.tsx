import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  AlertCircle,
  FileSpreadsheet,
  Coins,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from 'lucide-react';
import { db } from '../db/db';
import { getBusinessSettings } from '../services/settingsService';
import { calculateSummary } from '../services/taxService';
import {
  exportPurchaseTaxToExcel,
  exportSalesTaxToExcel,
  exportTaxPayableToExcel,
} from '../services/exportExcel';
import {
  exportPurchaseTaxToPdf,
  exportSalesTaxToPdf,
  exportTaxPayableToPdf,
} from '../services/exportPdf';
import {
  formatThaiDateShort,
  getThaiMonthName,
  toBuddhistYear,
} from '../utils/thaiDate';
import { formatCurrency, roundToTwoDecimals } from '../utils/calculation';
import { useMonth } from '../context/MonthContext';

interface ReportsPageProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onShowToast }) => {
  const {
    selectedMonth,
    selectedMonthNumber,
    selectedYear,
    setSelectedYear,
    buddhistYear,
    availableYears,
  } = useMonth();

  const [reportType, setReportType] = useState<'PURCHASE' | 'SALES' | 'TAX_PAYABLE'>('PURCHASE');
  const [taxPayableSubTab, setTaxPayableSubTab] = useState<'OVERVIEW' | 'SALES_ITEMS' | 'PURCHASE_ITEMS'>('OVERVIEW');
  const [isExporting, setIsExporting] = useState(false);

  // Live queries strictly filtered by global selected year and month
  const settings = useLiveQuery(() => getBusinessSettings());

  const purchaseRecords = useLiveQuery(
    () =>
      db.purchaseTaxRecords
        .where('taxYear')
        .equals(selectedYear)
        .filter((r) => r.taxMonth === selectedMonthNumber)
        .toArray(),
    [selectedYear, selectedMonthNumber]
  ) || [];

  const salesRecords = useLiveQuery(
    () =>
      db.salesTaxRecords
        .where('taxYear')
        .equals(selectedYear)
        .filter((r) => r.taxMonth === selectedMonthNumber)
        .toArray(),
    [selectedYear, selectedMonthNumber]
  ) || [];

  const purchaseSummary = calculateSummary(purchaseRecords);
  const salesSummary = calculateSummary(salesRecords);

  const activeRecords = reportType === 'PURCHASE' ? purchaseRecords : salesRecords;

  // Sort ascending by date and invoice number
  const sortedRecords = [...activeRecords].sort((a, b) => {
    const d = a.taxDate.localeCompare(b.taxDate);
    if (d !== 0) return d;
    return a.invoiceNumber.localeCompare(b.invoiceNumber);
  });

  const summary = reportType === 'PURCHASE' ? purchaseSummary : salesSummary;

  // Calculations for Tax Payable (ภ.พ.30)
  const salesTaxable = salesSummary.taxableAmount;
  const purchaseTaxable = purchaseSummary.taxableAmount;
  const salesVat = salesSummary.vatAmount;
  const purchaseVat = purchaseSummary.vatAmount;
  const netTaxPayable = roundToTwoDecimals(salesVat - purchaseVat);

  const monthYearLabel = `${selectedMonth} พ.ศ. ${buddhistYear}`;

  const handleExportExcel = async () => {
    if (!settings) {
      onShowToast('กรุณาตั้งค่าข้อมูลกิจการก่อนส่งออกรายงาน', 'error');
      return;
    }
    try {
      setIsExporting(true);
      if (reportType === 'PURCHASE') {
        exportPurchaseTaxToExcel(purchaseRecords, settings, selectedYear, selectedMonthNumber);
      } else if (reportType === 'SALES') {
        exportSalesTaxToExcel(salesRecords, settings, selectedYear, selectedMonthNumber);
      } else {
        exportTaxPayableToExcel(purchaseRecords, salesRecords, settings, selectedYear, selectedMonthNumber);
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
        await exportPurchaseTaxToPdf(purchaseRecords, settings, selectedYear, selectedMonthNumber);
      } else if (reportType === 'SALES') {
        await exportSalesTaxToPdf(salesRecords, settings, selectedYear, selectedMonthNumber);
      } else {
        await exportTaxPayableToPdf(purchaseRecords, salesRecords, settings, selectedYear, selectedMonthNumber);
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
    <div className="space-y-3">
      {/* Configuration & Action Bar (Hidden on Print) */}
      <div className="no-print space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-teal-700" />
              <h2 className="text-lg font-bold text-slate-900">
                รายงานภาษี (Tax Reports)
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              สร้างและส่งออกรายงานภาษีซื้อ/ภาษีขาย ตามแบบกรมสรรพากร (ภ.พ.30)
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleExportExcel}
              disabled={
                isExporting ||
                (reportType === 'TAX_PAYABLE'
                  ? purchaseRecords.length === 0 && salesRecords.length === 0
                  : sortedRecords.length === 0)
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออก Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportPdf}
              disabled={
                isExporting ||
                (reportType === 'TAX_PAYABLE'
                  ? purchaseRecords.length === 0 && salesRecords.length === 0
                  : sortedRecords.length === 0)
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ดาวน์โหลด PDF</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={
                reportType === 'TAX_PAYABLE'
                  ? purchaseRecords.length === 0 && salesRecords.length === 0
                  : sortedRecords.length === 0
              }
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>พิมพ์รายงาน</span>
            </button>
          </div>
        </div>

        {/* Filter Selection Bar */}
        <div className="bg-white px-4 py-2.5 sm:px-5 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          <div className="lg:col-span-6">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ประเภทรายงานภาษี
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setReportType('PURCHASE')}
                className={`flex-1 py-1.5 px-2 sm:px-3 text-xs font-semibold rounded-lg border transition cursor-pointer whitespace-nowrap text-center ${
                  reportType === 'PURCHASE'
                    ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                รายงานภาษีซื้อ
              </button>
              <button
                type="button"
                onClick={() => setReportType('SALES')}
                className={`flex-1 py-1.5 px-2 sm:px-3 text-xs font-semibold rounded-lg border transition cursor-pointer whitespace-nowrap text-center ${
                  reportType === 'SALES'
                    ? 'bg-indigo-700 text-white border-indigo-700 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                รายงานภาษีขาย
              </button>
              <button
                type="button"
                onClick={() => setReportType('TAX_PAYABLE')}
                className={`flex-1 py-1.5 px-2 sm:px-3 text-xs font-semibold rounded-lg border transition cursor-pointer whitespace-nowrap text-center ${
                  reportType === 'TAX_PAYABLE'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                ภาษีที่ต้องจ่าย
              </button>
            </div>
          </div>

          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              ปีภาษี (พ.ศ.)
            </label>
            <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
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

          <div className="lg:col-span-3">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รอบเดือนภาษี (จากชีตด้านล่าง)
            </label>
            <div className="flex items-center gap-2 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="font-bold text-emerald-900 font-mono">
                {selectedMonth} พ.ศ. {buddhistYear}
              </span>
            </div>
          </div>
        </div>

        {/* Business Settings Notice */}
        {(!settings?.taxpayerId || settings.taxpayerId.length !== 13) && (
          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center gap-2 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              ข้อมูลหัวกระดาษของกิจการยังไม่สมบูรณ์ กรุณาไปที่เมนู <strong>ตั้งค่ากิจการ</strong>{' '}
              เพื่อระบุเลขประจำตัวผู้เสียภาษี 13 หลักและชื่อกิจการให้ถูกต้องตามแบบสรรพากร
            </span>
          </div>
        )}
      </div>

      {/* Official Tax Report Printable Document Canvas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-3.5 sm:p-5 print:border-none print:shadow-none print:p-0">
        {/* Compact Space-Efficient Report Header */}
        <div className="border-b border-slate-400 pb-2 mb-2 text-slate-900">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 border-b border-slate-200 pb-1 mb-1.5">
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900">
              {reportType === 'PURCHASE'
                ? 'รายงานภาษีซื้อ'
                : reportType === 'SALES'
                ? 'รายงานภาษีขาย'
                : 'รายงานสรุปภาษีที่ต้องจ่าย (คำนวณภาษีมูลค่าเพิ่ม ภ.พ.30)'}
            </h1>
            <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              เดือนภาษี {selectedMonth} พ.ศ. {buddhistYear}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-1 text-xs">
            <div className="truncate">
              <span className="text-slate-500">ชื่อผู้ประกอบการ: </span>
              <span className="font-bold text-slate-900" title={settings?.businessName}>
                {settings?.businessName || 'ยังไม่ได้ระบุ'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">เลขประจำตัวผู้เสียภาษี: </span>
              <span className="font-mono font-bold text-slate-900">
                {settings?.taxpayerId || 'ยังไม่ได้ระบุ'}
              </span>
            </div>
            <div className="truncate">
              <span className="text-slate-500">ชื่อสถานประกอบการ: </span>
              <span className="text-slate-800" title={settings?.businessName}>
                {settings?.businessName || '-'}
              </span>
            </div>
            <div>
              <span className="text-slate-500">สถานประกอบการ: </span>
              <span className="text-slate-800 font-medium">
                {settings?.branchType === 'HEAD'
                  ? 'สำนักงานใหญ่'
                  : `สาขาที่ ${settings?.branchNumber || '00000'}`}
              </span>
            </div>
          </div>
        </div>

        {/* Content based on Report Type */}
        {reportType === 'TAX_PAYABLE' ? (
          <div className="space-y-6">
            {/* Visual Graphic Matching Uploaded Spreadsheet */}
            <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 sm:p-10 flex flex-col items-center justify-center relative overflow-hidden shadow-2xs">
              <div className="relative z-10 flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 sm:gap-14 w-full py-2">
                {/* Left Card: Month title & Sales/Purchase amounts */}
                <div className="flex flex-col items-center">
                  <div className="text-xl sm:text-2xl font-bold text-slate-800 mb-3 tracking-wide font-sans">
                    {monthYearLabel}
                  </div>

                  <div className="border border-slate-700 bg-white shadow-md inline-block">
                    {/* Header Row */}
                    <div className="flex items-stretch">
                      <div className="w-36 sm:w-48 bg-[#a9d18e] text-slate-900 font-bold text-center py-2.5 text-base sm:text-lg border-b border-slate-400">
                        ยอดขาย
                      </div>
                      <div className="w-2 bg-red-600 shrink-0"></div>
                      <div className="w-36 sm:w-48 bg-[#ffc000] text-slate-900 font-bold text-center py-2.5 text-base sm:text-lg border-b border-slate-400">
                        ยอดซื้อ
                      </div>
                    </div>

                    {/* Data Row */}
                    <div className="flex items-stretch border-b-6 border-red-600">
                      <div className="w-36 sm:w-48 bg-[#f2f8ee] text-slate-950 font-bold text-center py-4 px-2 text-xl sm:text-2xl font-mono">
                        {formatCurrency(salesTaxable)}
                      </div>
                      <div className="w-2 bg-red-600 shrink-0"></div>
                      <div className="w-36 sm:w-48 bg-[#fffdf0] text-slate-950 font-bold text-center py-4 px-2 text-xl sm:text-2xl font-mono">
                        {formatCurrency(purchaseTaxable)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Card: VAT and Net Tax Payable with Heavy Black Frame */}
                <div className="border-[8px] sm:border-[10px] border-black bg-black shadow-xl rounded-xs overflow-hidden w-full max-w-sm sm:max-w-md">
                  <table className="w-full border-collapse">
                    <tbody>
                      {/* Row 1: Sales Tax */}
                      <tr className="border-b border-black">
                        <td className="w-1/2 bg-[#a9d18e] text-slate-900 font-bold text-sm sm:text-base px-5 py-3 border-r border-slate-400">
                          ภาษีขาย เดือนนี้
                        </td>
                        <td className="w-1/2 bg-[#e2efda] text-slate-950 font-mono font-bold text-lg sm:text-xl px-5 py-3 text-right">
                          {formatCurrency(salesVat)}
                        </td>
                      </tr>

                      {/* Row 2: Purchase Tax */}
                      <tr>
                        <td className="w-1/2 bg-[#ffc000] text-slate-900 font-bold text-sm sm:text-base px-5 py-3 border-r border-slate-400">
                          ภาษีซื้อ เดือนนี้
                        </td>
                        <td className="w-1/2 bg-[#fff2cc] text-slate-950 font-mono font-bold text-lg sm:text-xl px-5 py-3 text-right">
                          {formatCurrency(purchaseVat)}
                        </td>
                      </tr>

                      {/* Cyan Divider Bar */}
                      <tr>
                        <td colSpan={2} className="h-2 bg-[#00b0f0] p-0"></td>
                      </tr>

                      {/* Row 3: Tax Payable */}
                      <tr>
                        <td className="w-1/2 bg-[#ffff00] text-slate-950 font-extrabold text-sm sm:text-base px-5 py-4 border-r border-slate-400">
                          ยอดเสียภาษี
                        </td>
                        <td className="w-1/2 bg-[#fce4d6] text-slate-950 font-mono font-black text-xl sm:text-2xl px-5 py-4 text-right">
                          {formatCurrency(Math.abs(netTaxPayable))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Tax Result Explanation Banner */}
            <div
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm ${
                netTaxPayable > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : netTaxPayable < 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="font-bold text-base shrink-0 mt-0.5">
                {netTaxPayable > 0 ? '📌' : netTaxPayable < 0 ? '✅' : 'ℹ️'}
              </div>
              <div className="space-y-1">
                <div className="font-bold text-sm">
                  {netTaxPayable > 0
                    ? `ภาษีขาย (${formatCurrency(salesVat)}) มากกว่า ภาษีซื้อ (${formatCurrency(purchaseVat)}) = มียอดภาษีที่ต้องชำระ (ยอดเสียภาษี) ทั้งสิ้น ${formatCurrency(netTaxPayable)} บาท`
                    : netTaxPayable < 0
                    ? `ภาษีซื้อ (${formatCurrency(purchaseVat)}) มากกว่า ภาษีขาย (${formatCurrency(salesVat)}) = มีภาษีชำระเกิน (เครดิตยกไป) จำนวน ${formatCurrency(Math.abs(netTaxPayable))} บาท`
                    : `ภาษีขายเท่ากับภาษีซื้อ (${formatCurrency(salesVat)} บาท) = ไม่มียอดภาษีต้องชำระเพิ่มเติม`}
                </div>
                <div className="text-xs text-slate-600">
                  {netTaxPayable > 0
                    ? '* ต้องยื่นแบบแสดงรายการภาษีมูลค่าเพิ่ม (ภ.พ.30) และนำส่งเงินภาษีต่อกรมสรรพากรภายในวันที่ 15 ของเดือนถัดไป (หรือวันที่ 23 หากยื่นผ่านอินเทอร์เน็ต)'
                    : netTaxPayable < 0
                    ? '* สามารถเลือกขอคืนเงินภาษีมูลค่าเพิ่ม หรือนำยอดภาษีชำระเกินนี้ไปหักกลบเป็นเครดิตภาษีในเดือนถัดไปได้ตามแบบ ภ.พ.30'
                    : '* ยื่นแบบ ภ.พ.30 ตามปกติโดยไม่ต้องชำระเงินภาษีเพิ่ม'}
                </div>
              </div>
            </div>

            {/* Sub-tab Navigation */}
            <div className="no-print flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTaxPayableSubTab('OVERVIEW')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    taxPayableSubTab === 'OVERVIEW'
                      ? 'bg-slate-800 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ตารางสรุปคำนวณภาษี
                </button>
                <button
                  type="button"
                  onClick={() => setTaxPayableSubTab('SALES_ITEMS')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    taxPayableSubTab === 'SALES_ITEMS'
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  รายการภาษีขาย ({salesRecords.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTaxPayableSubTab('PURCHASE_ITEMS')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
                    taxPayableSubTab === 'PURCHASE_ITEMS'
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  รายการภาษีซื้อ ({purchaseRecords.length})
                </button>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                ยอดขาย {formatCurrency(salesTaxable)} / ยอดซื้อ {formatCurrency(purchaseTaxable)}
              </span>
            </div>

            {taxPayableSubTab === 'OVERVIEW' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 font-semibold text-slate-800 border-b border-slate-300">
                    <tr>
                      <th className="border border-slate-300 px-3 py-2.5">รายการคำนวณภาษี</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-center w-28">จำนวนรายการ</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-right w-44">มูลค่าสินค้า/บริการ (ก่อน VAT)</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-right w-40">ภาษีมูลค่าเพิ่ม (VAT 7%)</th>
                      <th className="border border-slate-300 px-3 py-2.5 text-right w-44">จำนวนเงินรวมทั้งสิ้น</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-3 py-2.5 font-medium text-slate-900">
                        1. ยอดขายและภาษีขาย (Output Tax)
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-slate-600">
                        {salesSummary.count} รายการ
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(salesTaxable)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono font-bold text-indigo-800 bg-indigo-50/40">
                        {formatCurrency(salesVat)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(salesSummary.totalAmount)}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-3 py-2.5 font-medium text-slate-900">
                        2. ยอดซื้อและภาษีซื้อ (Input Tax)
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-slate-600">
                        {purchaseSummary.count} รายการ
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono font-semibold text-slate-900">
                        {formatCurrency(purchaseTaxable)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono font-bold text-teal-800 bg-teal-50/40">
                        {formatCurrency(purchaseVat)}
                      </td>
                      <td className="border border-slate-300 px-3 py-2.5 text-right font-mono text-slate-700">
                        {formatCurrency(purchaseSummary.totalAmount)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                    <tr>
                      <td colSpan={2} className="border border-slate-300 px-3 py-3 text-slate-900 font-bold text-sm">
                        {netTaxPayable >= 0 ? 'ภาษีที่ต้องชำระ (ยอดเสียภาษี = ภาษีขาย - ภาษีซื้อ)' : 'ภาษีชำระเกิน (เครดิตยกไป = ภาษีซื้อ - ภาษีขาย)'}
                      </td>
                      <td className="border border-slate-300 px-3 py-3 text-right font-mono text-slate-700">
                        ส่วนต่าง {formatCurrency(Math.abs(salesTaxable - purchaseTaxable))}
                      </td>
                      <td className="border border-slate-300 px-3 py-3 text-right font-mono text-base font-black text-rose-700 bg-rose-50">
                        {formatCurrency(Math.abs(netTaxPayable))}
                      </td>
                      <td className="border border-slate-300 px-3 py-3 text-right font-mono text-xs text-slate-600 font-medium">
                        {netTaxPayable >= 0 ? 'นำส่งกรมสรรพากร' : 'เครดิตยกไปเดือนถัดไป'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {taxPayableSubTab === 'SALES_ITEMS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 font-semibold text-slate-800 border-b border-slate-300 text-center">
                    <tr>
                      <th className="border border-slate-300 px-2 py-2 w-10">ลำดับ</th>
                      <th className="border border-slate-300 px-2 py-2 w-20">วันที่</th>
                      <th className="border border-slate-300 px-2 py-2 w-24">เลขที่ใบกำกับ</th>
                      <th className="border border-slate-300 px-2 py-2">ชื่อผู้ซื้อ</th>
                      <th className="border border-slate-300 px-2 py-2 text-right w-28">มูลค่าก่อน VAT</th>
                      <th className="border border-slate-300 px-2 py-2 text-right w-24">ภาษีขาย (VAT)</th>
                      <th className="border border-slate-300 px-2 py-2 text-right w-28">รวมทั้งสิ้น</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-slate-300 px-4 py-6 text-center text-slate-400">
                          ไม่มีรายการภาษีขายในเดือนนี้
                        </td>
                      </tr>
                    ) : (
                      salesRecords.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">{formatThaiDateShort(r.taxDate)}</td>
                          <td className="border border-slate-300 px-2 py-1.5 font-mono font-medium text-slate-800">{r.invoiceNumber}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-slate-900">{r.customerNameSnapshot}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-slate-800">{formatCurrency(r.taxableAmount)}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-medium text-indigo-800">{formatCurrency(r.vatAmount)}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-slate-900">{formatCurrency(r.totalAmount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                    <tr>
                      <td colSpan={4} className="border border-slate-300 px-3 py-2 text-right">รวมภาษีขาย ({salesSummary.count} รายการ)</td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-mono">{formatCurrency(salesSummary.taxableAmount)}</td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-mono text-indigo-800">{formatCurrency(salesSummary.vatAmount)}</td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-mono">{formatCurrency(salesSummary.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {taxPayableSubTab === 'PURCHASE_ITEMS' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 font-semibold text-slate-800 border-b border-slate-300 text-center">
                    <tr>
                      <th className="border border-slate-300 px-2 py-2 w-10">ลำดับ</th>
                      <th className="border border-slate-300 px-2 py-2 w-20">วันที่</th>
                      <th className="border border-slate-300 px-2 py-2 w-24">เลขที่ใบกำกับ</th>
                      <th className="border border-slate-300 px-2 py-2">ชื่อผู้ขาย</th>
                      <th className="border border-slate-300 px-2 py-2 text-right w-28">มูลค่าก่อน VAT</th>
                      <th className="border border-slate-300 px-2 py-2 text-right w-24">ภาษีซื้อ (VAT)</th>
                      <th className="border border-slate-300 px-2 py-2 text-right w-28">รวมทั้งสิ้น</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseRecords.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="border border-slate-300 px-4 py-6 text-center text-slate-400">
                          ไม่มีรายการภาษีซื้อในเดือนนี้
                        </td>
                      </tr>
                    ) : (
                      purchaseRecords.map((r, idx) => (
                        <tr key={r.id} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-center text-slate-700 whitespace-nowrap">{formatThaiDateShort(r.taxDate)}</td>
                          <td className="border border-slate-300 px-2 py-1.5 font-mono font-medium text-slate-800">{r.invoiceNumber}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-slate-900">{r.supplierNameSnapshot}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-slate-800">{formatCurrency(r.taxableAmount)}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right font-mono font-medium text-teal-800">{formatCurrency(r.vatAmount)}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-right font-mono text-slate-900">{formatCurrency(r.totalAmount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
                    <tr>
                      <td colSpan={4} className="border border-slate-300 px-3 py-2 text-right">รวมภาษีซื้อ ({purchaseSummary.count} รายการ)</td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-mono">{formatCurrency(purchaseSummary.taxableAmount)}</td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-mono text-teal-800">{formatCurrency(purchaseSummary.vatAmount)}</td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-mono">{formatCurrency(purchaseSummary.totalAmount)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* Report Data Table for PURCHASE / SALES */
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
                  <th className="border border-slate-300 px-2 py-2 text-right w-24" rowSpan={2}>
                    จำนวนภาษีมูลค่าเพิ่ม
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
                      colSpan={10}
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
                </tr>
              </tfoot>
            </table>
          </div>
        )}

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
