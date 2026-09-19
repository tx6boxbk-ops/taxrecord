import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Calendar,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';
import { db } from '../db/db';
import {
  calculateSummary,
  getYearlyTaxOverview,
} from '../services/taxService';
import { formatCurrency } from '../utils/calculation';
import {
  getThaiMonthName,
  getThaiMonthShortName,
  toBuddhistYear,
} from '../utils/thaiDate';
import { NavSection } from '../components/Layout';

interface DashboardPageProps {
  onNavigate: (section: NavSection) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(currentMonth);

  // Reactive queries via Dexie useLiveQuery
  const purchaseRecords = useLiveQuery(
    () => db.purchaseTaxRecords.where('taxYear').equals(selectedYear).toArray(),
    [selectedYear]
  );

  const salesRecords = useLiveQuery(
    () => db.salesTaxRecords.where('taxYear').equals(selectedYear).toArray(),
    [selectedYear]
  );

  const yearlyOverview = useLiveQuery(
    () => getYearlyTaxOverview(selectedYear),
    [selectedYear]
  );

  // Filter records based on selected month
  const filteredPurchases =
    purchaseRecords?.filter((r) =>
      selectedMonth === 'ALL' ? true : r.taxMonth === selectedMonth
    ) || [];

  const filteredSales =
    salesRecords?.filter((r) =>
      selectedMonth === 'ALL' ? true : r.taxMonth === selectedMonth
    ) || [];

  const purchaseSummary = calculateSummary(filteredPurchases);
  const salesSummary = calculateSummary(filteredSales);

  // คำนวณยอดภาษีที่ต้องชำระตามสูตรที่กำหนด
  const purchaseTotal = purchaseSummary.totalAmount;
  const salesTotal = salesSummary.totalAmount;

  const taxableSales = salesTotal * 0.8418;
  const outputVat = taxableSales * 0.08315;
  const inputVat = purchaseTotal * 0.07;
  const taxPayable = outputVat - inputVat;

  // Available years list (e.g. 2024 to 2030)
  const availableYears = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">แดชบอร์ดสรุปภาษี</h2>
          <p className="text-xs text-slate-500 mt-1">
            ภาพรวมภาษีซื้อและภาษีขาย คำนวณจากฐานข้อมูล IndexedDB ในเครื่อง
          </p>
        </div>

        {/* Year and Month Selectors */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">ปีภาษี:</span>
            <select
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {toBuddhistYear(y)} ({y})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
            <span className="text-xs font-medium text-slate-600">เดือน:</span>
            <select
              id="month-select"
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">ทั้งปี (12 เดือน)</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getThaiMonthName(m)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Purchase Tax Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-teal-300 transition">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                ภาษีซื้อ (Purchase Tax)
              </span>
              <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                ฿ {formatCurrency(purchaseSummary.vatAmount)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ภาษีซื้อรวม (VAT {purchaseSummary.count} รายการ)
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>มูลค่าก่อน VAT:</span>
            <span className="font-semibold text-slate-800">
              ฿ {formatCurrency(purchaseSummary.taxableAmount)}
            </span>
          </div>
          <div className="pt-1.5 flex items-center justify-between text-xs text-slate-600">
            <span>ยอดรวมทั้งสิ้น:</span>
            <span className="font-semibold text-slate-800">
              ฿ {formatCurrency(purchaseSummary.totalAmount)}
            </span>
          </div>

          <button
            onClick={() => onNavigate('purchase')}
            className="mt-4 w-full py-1.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>ดูรายการภาษีซื้อ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sales Tax Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-indigo-300 transition">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                ภาษีขาย (Sales Tax)
              </span>
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-bold text-slate-900">
                ฿ {formatCurrency(salesSummary.vatAmount)}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                ภาษีขายรวม (VAT {salesSummary.count} รายการ)
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>มูลค่าก่อน VAT:</span>
            <span className="font-semibold text-slate-800">
              ฿ {formatCurrency(salesSummary.taxableAmount)}
            </span>
          </div>
          <div className="pt-1.5 flex items-center justify-between text-xs text-slate-600">
            <span>ยอดรวมทั้งสิ้น:</span>
            <span className="font-semibold text-slate-800">
              ฿ {formatCurrency(salesSummary.totalAmount)}
            </span>
          </div>

          <button
            onClick={() => onNavigate('sales')}
            className="mt-4 w-full py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>ดูรายการภาษีขาย</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tax Payable Summary Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:border-amber-300 transition">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                สรุปยอดที่ต้องชำระภาษี
              </span>
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  taxPayable >= 0
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <Scale className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div
                className={`text-2xl font-bold ${
                  taxPayable >= 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                ฿ {formatCurrency(taxPayable)}
              </div>
              <p className="text-xs font-medium mt-0.5 text-slate-600">
                {taxPayable >= 0 ? 'ยอดภาษีที่ต้องชำระ' : 'ภาษีซื้อมากกว่าภาษีขาย'}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex items-center justify-between">
              <span>ยอดขายทั้งสิ้น:</span>
              <span className="font-semibold text-slate-800">
                ฿ {formatCurrency(salesTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>ยอดขายที่ต้องเสียภาษี (84.18%):</span>
              <span className="font-mono text-slate-700">
                ฿ {formatCurrency(taxableSales)}
              </span>
            </div>
            <div className="flex items-center justify-between text-indigo-700">
              <span>ภาษีขาย (8.315%):</span>
              <span className="font-semibold font-mono">
                ฿ {formatCurrency(outputVat)}
              </span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
              <span>ยอดรวมทั้งสิ้น (ภาษีซื้อ):</span>
              <span className="font-semibold text-slate-800">
                ฿ {formatCurrency(purchaseTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between text-teal-700">
              <span>ภาษีซื้อ (7%):</span>
              <span className="font-semibold font-mono">
                ฿ {formatCurrency(inputVat)}
              </span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between font-bold text-slate-900">
              <span>ยอดภาษีที่ต้องชำระ:</span>
              <span
                className={`font-mono ${
                  taxPayable >= 0 ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                ฿ {formatCurrency(taxPayable)}
              </span>
            </div>
          </div>

          <button
            onClick={() => onNavigate('reports')}
            className="mt-4 w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>เปิดศูนย์รายงานภาษี</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Shortcuts */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => onNavigate('purchase')}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>บันทึกภาษีซื้อ</span>
        </button>

        <button
          onClick={() => onNavigate('sales')}
          className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>บันทึกภาษีขาย</span>
        </button>
      </div>

      {/* Yearly 12-Month Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              ตารางเปรียบเทียบภาษี 12 เดือน (พ.ศ. {toBuddhistYear(selectedYear)})
            </h3>
            <p className="text-xs text-slate-500">
              คำนวณแบบแยกรายเดือนตามรายการที่ถูกบันทึกจริง
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-600 bg-slate-50 border-y border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">เดือน</th>
                <th className="px-4 py-3 font-semibold text-right">มูลค่าซื้อ</th>
                <th className="px-4 py-3 font-semibold text-right text-teal-800">VAT ซื้อ</th>
                <th className="px-4 py-3 font-semibold text-right">มูลค่าขาย</th>
                <th className="px-4 py-3 font-semibold text-right text-indigo-800">VAT ขาย</th>
                <th className="px-4 py-3 font-semibold text-right">ส่วนต่าง VAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {yearlyOverview?.map((item) => {
                const isSelected = selectedMonth === item.month;
                return (
                  <tr
                    key={item.month}
                    className={`hover:bg-slate-50 transition ${
                      isSelected ? 'bg-teal-50/50 font-medium' : ''
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium text-slate-900">
                      {getThaiMonthName(item.month)} ({getThaiMonthShortName(item.month)})
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {formatCurrency(item.purchaseTaxable)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-teal-800">
                      {formatCurrency(item.purchaseVat)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-slate-700">
                      {formatCurrency(item.salesTaxable)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-indigo-800">
                      {formatCurrency(item.salesVat)}
                    </td>
                    <td
                      className={`px-4 py-2.5 text-right font-semibold ${
                        item.vatDifference > 0
                          ? 'text-amber-700'
                          : item.vatDifference < 0
                          ? 'text-emerald-700'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.vatDifference !== 0
                        ? `${item.vatDifference > 0 ? '+' : ''}${formatCurrency(
                            item.vatDifference
                          )}`
                        : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Total Row */}
            <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
              <tr>
                <td className="px-4 py-3">รวมทั้งปี (12 เดือน)</td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(
                    yearlyOverview?.reduce((sum, i) => sum + i.purchaseTaxable, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right text-teal-800">
                  {formatCurrency(
                    yearlyOverview?.reduce((sum, i) => sum + i.purchaseVat, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(
                    yearlyOverview?.reduce((sum, i) => sum + i.salesTaxable, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right text-indigo-800">
                  {formatCurrency(
                    yearlyOverview?.reduce((sum, i) => sum + i.salesVat, 0)
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {formatCurrency(
                    yearlyOverview?.reduce((sum, i) => sum + i.vatDifference, 0)
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
