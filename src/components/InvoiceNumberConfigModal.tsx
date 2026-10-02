import React, { useState, useEffect } from 'react';
import { Hash, Save, X, Calendar, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { useMonth } from '../context/MonthContext';
import {
  THAI_MONTHS_FULL,
  getMonthNumberFromName,
  getThaiMonthName,
  toBuddhistYear,
} from '../utils/thaiDate';
import {
  getInvoiceNumberConfig,
  saveInvoiceNumberConfig,
  parseInvoiceNumber,
  formatInvoiceNumber,
} from '../services/invoiceNumberService';
import { db } from '../db/db';

interface InvoiceNumberConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (savedConfig: { year: number; month: number; startNumber: string }) => void;
  type?: 'SALES' | 'PURCHASE';
}

export const InvoiceNumberConfigModal: React.FC<InvoiceNumberConfigModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  type = 'SALES',
}) => {
  const { selectedMonth, selectedMonthNumber, selectedYear, availableYears } = useMonth();

  const [targetYear, setTargetYear] = useState<number>(selectedYear);
  const [targetMonthNum, setTargetMonthNum] = useState<number>(selectedMonthNumber);
  const [startNumber, setStartNumber] = useState('TK005');
  const [isLoading, setIsLoading] = useState(false);
  const [existingCount, setExistingCount] = useState<number>(0);
  const [lastUsed, setLastUsed] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Sync with global month when modal opens
  useEffect(() => {
    if (isOpen) {
      setTargetYear(selectedYear);
      setTargetMonthNum(selectedMonthNumber);
      setMessage(null);
    }
  }, [isOpen, selectedYear, selectedMonthNumber]);

  // Load existing config & record stats for the selected targetYear and targetMonthNum
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        const config = await getInvoiceNumberConfig(type, targetYear, targetMonthNum);
        if (isMounted) {
          if (config && config.startNumber) {
            setStartNumber(config.startNumber);
            setLastUsed(config.lastUsedNumber || config.highestNumber || null);
          } else {
            // Default suggestion for this type
            setStartNumber(type === 'SALES' ? 'TK005' : 'INV001');
            setLastUsed(null);
          }
        }

        // Count existing records in this month
        const records =
          type === 'SALES'
            ? await db.salesTaxRecords
                .where('taxYear')
                .equals(targetYear)
                .filter((r) => r.taxMonth === targetMonthNum)
                .toArray()
            : await db.purchaseTaxRecords
                .where('taxYear')
                .equals(targetYear)
                .filter((r) => r.taxMonth === targetMonthNum)
                .toArray();

        if (isMounted) {
          setExistingCount(records.length);
        }
      } catch (err) {
        console.error('Failed to load invoice config:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetYear, targetMonthNum, type]);

  if (!isOpen) return null;

  const parsed = parseInvoiceNumber(startNumber);
  const previewItems: string[] = [];
  if (parsed.hasDigits) {
    for (let i = 0; i < 4; i++) {
      previewItems.push(formatInvoiceNumber(parsed.prefix, parsed.num + i, parsed.padLength));
    }
  } else if (startNumber.trim()) {
    previewItems.push(`${startNumber.trim()}001`, `${startNumber.trim()}002`, `${startNumber.trim()}003`);
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanStart = startNumber.trim();
    if (!cleanStart) {
      setMessage({ text: 'กรุณาระบุเลขที่ใบกำกับภาษีเริ่มต้น', type: 'error' });
      return;
    }

    try {
      await saveInvoiceNumberConfig({
        type,
        year: targetYear,
        month: targetMonthNum,
        startNumber: cleanStart,
      });

      setMessage({
        text: `บันทึกการตั้งค่าเลขเริ่มต้น "${cleanStart}" ประจำเดือน${getThaiMonthName(
          targetMonthNum
        )} ${toBuddhistYear(targetYear)} เรียบร้อยแล้ว`,
        type: 'success',
      });

      if (onSaved) {
        onSaved({
          year: targetYear,
          month: targetMonthNum,
          startNumber: cleanStart,
        });
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถบันทึกการตั้งค่าได้';
      setMessage({ text: msg, type: 'error' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-linear-to-r from-slate-50 to-indigo-50/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Hash className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                ตั้งค่าเลขที่ใบกำกับภาษีอัตโนมัติ
              </h3>
              <p className="text-xs text-slate-500">
                กำหนดเลขเริ่มต้นแยกตามเดือนและปี
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
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

          {/* Period Selector: Year & Month */}
          <div className="grid grid-cols-2 gap-3">
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
          </div>

          {/* Start Number Input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">
                เลขที่ใบกำกับภาษีเริ่มต้น <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">
                ตัวอย่าง: TK005, INV001, 2026-001
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                required
                value={startNumber}
                onChange={(e) => setStartNumber(e.target.value)}
                placeholder="เช่น TK005 หรือ INV001"
                className="w-full text-base font-bold font-mono px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 text-slate-900 transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              ระบบจะรักษาคำนำหน้า (Prefix) และจำนวนหลักของตัวเลข เช่น <span className="font-mono text-indigo-700 font-semibold">TK005</span> จะรันเป็น <span className="font-mono text-indigo-700 font-semibold">TK006, TK007...</span>
            </p>
          </div>

          {/* Sequence Preview Box */}
          {previewItems.length > 0 && (
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                <span>ลำดับตัวเลขที่ระบบจะสร้างอัตโนมัติ:</span>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  แยกตามเดือน
                </span>
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

          {/* Current Month Status Notice */}
          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-900 space-y-1">
            <div className="font-semibold flex items-center gap-1.5">
              <span>สถานะเดือน {getThaiMonthName(targetMonthNum)} พ.ศ. {toBuddhistYear(targetYear)}:</span>
            </div>
            <div className="text-amber-800">
              • มีรายการที่บันทึกแล้วในเดือนนี้: <span className="font-bold">{existingCount}</span> รายการ
              {lastUsed && (
                <span> (เลขที่ล่าสุดที่เคยใช้: <span className="font-mono font-bold">{lastUsed}</span>)</span>
              )}
            </div>
            <div className="text-slate-500 text-[10px] leading-relaxed">
              * ข้อมูลเลขที่ใบกำกับภาษีจะแยกขาดจากเดือนอื่นอย่างสมบูรณ์ ไม่กระทบประวัติของเดือนอื่น
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-xl transition cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>บันทึกการตั้งค่า</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
