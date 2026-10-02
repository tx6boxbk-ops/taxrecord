import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Hash,
  Save,
  Calendar,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Edit3,
  TrendingUp,
  ReceiptText,
} from 'lucide-react';
import { db } from '../db/db';
import { useMonth } from '../context/MonthContext';
import {
  THAI_MONTHS_FULL,
  getThaiMonthName,
  toBuddhistYear,
} from '../utils/thaiDate';
import {
  getInvoiceNumberConfig,
  saveInvoiceNumberConfig,
  parseInvoiceNumber,
  formatInvoiceNumber,
} from '../services/invoiceNumberService';

interface InvoiceNumberSettingsSectionProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const InvoiceNumberSettingsSection: React.FC<InvoiceNumberSettingsSectionProps> = ({
  onShowToast,
}) => {
  const { selectedMonthNumber, selectedYear, availableYears } = useMonth();

  const [invoiceType, setInvoiceType] = useState<'SALES' | 'PURCHASE'>('SALES');
  const [targetYear, setTargetYear] = useState<number>(selectedYear);
  const [targetMonthNum, setTargetMonthNum] = useState<number>(selectedMonthNumber);
  const [startNumber, setStartNumber] = useState('TK005');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Live query for existing configurations and records
  const allConfigs =
    useLiveQuery(
      () =>
        db.invoiceNumberConfigs
          .where('type')
          .equals(invoiceType)
          .filter((c) => c.year === targetYear)
          .toArray(),
      [invoiceType, targetYear]
    ) || [];

  const salesRecords =
    useLiveQuery(
      () => db.salesTaxRecords.where('taxYear').equals(targetYear).toArray(),
      [targetYear]
    ) || [];

  const purchaseRecords =
    useLiveQuery(
      () => db.purchaseTaxRecords.where('taxYear').equals(targetYear).toArray(),
      [targetYear]
    ) || [];

  // When targetYear, targetMonthNum, or invoiceType changes, load config into input
  useEffect(() => {
    let isMounted = true;
    async function loadCurrent() {
      const cfg = await getInvoiceNumberConfig(invoiceType, targetYear, targetMonthNum);
      if (isMounted) {
        if (cfg && cfg.startNumber) {
          setStartNumber(cfg.startNumber);
        } else {
          setStartNumber(invoiceType === 'SALES' ? 'TK005' : 'INV001');
        }
        setMessage(null);
      }
    }
    loadCurrent();
    return () => {
      isMounted = false;
    };
  }, [invoiceType, targetYear, targetMonthNum]);

  // Preview generated sequence
  const parsed = parseInvoiceNumber(startNumber);
  const previewItems: string[] = [];
  if (parsed.hasDigits) {
    for (let i = 0; i < 4; i++) {
      previewItems.push(formatInvoiceNumber(parsed.prefix, parsed.num + i, parsed.padLength));
    }
  } else if (startNumber.trim()) {
    previewItems.push(
      `${startNumber.trim()}001`,
      `${startNumber.trim()}002`,
      `${startNumber.trim()}003`
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStart = startNumber.trim();
    if (!cleanStart) {
      setMessage({ text: 'กรุณาระบุเลขที่ใบกำกับภาษีเริ่มต้น', type: 'error' });
      return;
    }

    setIsSaving(true);
    try {
      await saveInvoiceNumberConfig({
        type: invoiceType,
        year: targetYear,
        month: targetMonthNum,
        startNumber: cleanStart,
      });

      const successMsg = `บันทึกการตั้งค่าเลขเริ่มต้น "${cleanStart}" ประจำเดือน${getThaiMonthName(
        targetMonthNum
      )} พ.ศ. ${toBuddhistYear(targetYear)} เรียบร้อยแล้ว`;
      setMessage({ text: successMsg, type: 'success' });
      onShowToast(successMsg, 'success');
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'ไม่สามารถบันทึกการตั้งค่าได้';
      setMessage({ text: errText, type: 'error' });
      onShowToast(errText, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectMonthRow = (monthNum: number) => {
    setTargetMonthNum(monthNum);
    const existing = allConfigs.find((c) => c.month === monthNum);
    if (existing && existing.startNumber) {
      setStartNumber(existing.startNumber);
    } else {
      setStartNumber(invoiceType === 'SALES' ? 'TK005' : 'INV001');
    }
    setMessage(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Configuration Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                กำหนดเลขที่ใบกำกับภาษีเริ่มต้น แยกตามเดือน
              </h3>
              <p className="text-xs text-slate-500">
                ระบบจะสร้างเลขที่ใบกำกับภาษีให้อัตโนมัติตามเดือนที่เลือก โดยแยกอิสระจากกันทุกเดือน
              </p>
            </div>
          </div>

          {/* Type Toggle: Sales or Purchase */}
          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setInvoiceType('SALES')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                invoiceType === 'SALES'
                  ? 'bg-indigo-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ภาษีขาย (Sales Tax)</span>
            </button>
            <button
              type="button"
              onClick={() => setInvoiceType('PURCHASE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition cursor-pointer ${
                invoiceType === 'PURCHASE'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ReceiptText className="w-3.5 h-3.5" />
              <span>ภาษีซื้อ (Purchase Tax)</span>
            </button>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {message && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Year Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ปีภาษี (พ.ศ.)
              </label>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-300">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value))}
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

            {/* Month Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                เดือนภาษี
              </label>
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-300">
                <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />
                <select
                  value={targetMonthNum}
                  onChange={(e) => setTargetMonthNum(Number(e.target.value))}
                  className="w-full bg-transparent font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                >
                  {THAI_MONTHS_FULL.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Start Number Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  เลขที่ใบกำกับภาษีเริ่มต้น <span className="text-rose-500">*</span>
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  เช่น TK005, INV001
                </span>
              </div>
              <input
                type="text"
                required
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                placeholder="เช่น TK005 หรือ INV001"
                className="w-full text-sm font-bold font-mono px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 text-slate-900 transition"
              />
            </div>
          </div>

          {/* Sequence Preview Box */}
          {previewItems.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-[11px] font-semibold text-slate-700">
                  ตัวอย่างลำดับเลขที่ระบบจะสร้างอัตโนมัติสำหรับเดือน{getThaiMonthName(targetMonthNum)}:
                </div>
                <div className="text-[10px] text-slate-500">
                  รักษารูปแบบ Prefix ({parsed.prefix || 'ไม่มี'}) และจำนวนหลักตัวเลข ({parsed.padLength} หลัก)
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {previewItems.map((item, idx) => (
                  <React.Fragment key={item}>
                    <span
                      className={`font-mono px-2 py-1 rounded-md text-xs font-semibold ${
                        idx === 0
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200'
                      }`}
                    >
                      {item}
                    </span>
                    {idx < previewItems.length - 1 && (
                      <span className="text-slate-400 font-bold">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-lg shadow-xs transition flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 12-Month Configuration Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              ตารางสรุปเลขที่ใบกำกับภาษี 12 เดือน (พ.ศ. {toBuddhistYear(targetYear)})
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              คลิกที่แถวของแต่ละเดือนเพื่อเลือกและแก้ไขเลขเริ่มต้นได้ทันที
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            {invoiceType === 'SALES' ? 'ประเภท: ภาษีขาย' : 'ประเภท: ภาษีซื้อ'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-[11px] text-slate-600 bg-slate-100/80 border-b border-slate-200 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">เดือน</th>
                <th className="px-4 py-3">เลขเริ่มต้น (Start Number)</th>
                <th className="px-4 py-3">เลขล่าสุดที่ใช้งาน (Last Used)</th>
                <th className="px-4 py-3 text-center">จำนวนเอกสารที่มีอยู่</th>
                <th className="px-4 py-3 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {THAI_MONTHS_FULL.map((monthName, idx) => {
                const monthNum = idx + 1;
                const cfg = allConfigs.find((c) => c.month === monthNum);
                const isSelected = targetMonthNum === monthNum;
                const recordCount =
                  invoiceType === 'SALES'
                    ? salesRecords.filter((r) => r.taxMonth === monthNum).length
                    : purchaseRecords.filter((r) => r.taxMonth === monthNum).length;

                return (
                  <tr
                    key={monthName}
                    onClick={() => handleSelectMonthRow(monthNum)}
                    className={`hover:bg-slate-50 transition cursor-pointer ${
                      isSelected ? 'bg-indigo-50/70 font-semibold' : ''
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-slate-900 flex items-center gap-2">
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block shrink-0" />
                      )}
                      <span>
                        {monthName} (เดือน {String(monthNum).padStart(2, '0')})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {cfg?.startNumber ? (
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50/60 px-2 py-0.5 rounded border border-indigo-200">
                          {cfg.startNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono italic">
                          ค่าเริ่มต้น (INV001)
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {cfg?.lastUsedNumber || cfg?.highestNumber ? (
                        <span className="font-mono font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {cfg.lastUsedNumber || cfg.highestNumber}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-mono ${
                          recordCount > 0
                            ? 'bg-slate-200 text-slate-800 font-bold'
                            : 'text-slate-400'
                        }`}
                      >
                        {recordCount} ใบ
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectMonthRow(monthNum);
                        }}
                        className="px-2.5 py-1 text-indigo-700 hover:bg-indigo-100 rounded-md font-semibold text-xs inline-flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไขเลข</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
