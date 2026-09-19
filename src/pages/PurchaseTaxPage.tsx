import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ReceiptText,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Calendar,
  Building2,
  Calculator,
  UserPlus,
} from 'lucide-react';
import { db } from '../db/db';
import {
  createPurchaseTaxRecord,
  updatePurchaseTaxRecord,
  deletePurchaseTaxRecord,
  calculateSummary,
} from '../services/taxService';
import { createSupplier } from '../services/supplierService';
import { PurchaseTaxRecord, Supplier } from '../types';
import {
  calculateVatExclusive,
  calculateVatInclusive,
  formatCurrency,
  parseAmount,
  roundToTwoDecimals,
} from '../utils/calculation';
import {
  formatThaiDateShort,
  getThaiMonthName,
  getTodayDateString,
  toBuddhistYear,
} from '../utils/thaiDate';
import { ConfirmModal } from '../components/ConfirmModal';

interface PurchaseTaxPageProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PurchaseTaxPage: React.FC<PurchaseTaxPageProps> = ({ onShowToast }) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number | 'ALL'>(currentMonth);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PurchaseTaxRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PurchaseTaxRecord | null>(null);

  // Quick Add Supplier Modal State
  const [isQuickSupplierOpen, setIsQuickSupplierOpen] = useState(false);
  const [quickSupplierName, setQuickSupplierName] = useState('');
  const [quickSupplierTaxId, setQuickSupplierTaxId] = useState('');
  const [quickSupplierBranch, setQuickSupplierBranch] = useState('00000');
  const [quickSupplierHead, setQuickSupplierHead] = useState(true);

  // Form State
  const [taxDate, setTaxDate] = useState(getTodayDateString());
  const [invoiceBookNumber, setInvoiceBookNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [supplierTaxId, setSupplierTaxId] = useState('');
  const [supplierBranchType, setSupplierBranchType] = useState<'HEAD' | 'BRANCH'>('HEAD');
  const [supplierBranchNumber, setSupplierBranchNumber] = useState('00000');

  const [taxableAmountStr, setTaxableAmountStr] = useState('1000.00');
  const [vatRateStr, setVatRateStr] = useState('7');
  const [vatAmountStr, setVatAmountStr] = useState('70.00');
  const [totalAmountStr, setTotalAmountStr] = useState('1070.00');
  const [calcMode, setCalcMode] = useState<'EXCLUSIVE' | 'INCLUSIVE'>('EXCLUSIVE');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  // Live Queries
  const allPurchases = useLiveQuery(() => db.purchaseTaxRecords.toArray()) || [];
  const suppliers = useLiveQuery(() => db.suppliers.orderBy('displayName').toArray()) || [];

  // Filter records
  const filteredRecords = allPurchases.filter((r) => {
    if (selectedYear !== undefined && r.taxYear !== selectedYear) return false;
    if (selectedMonth !== 'ALL' && r.taxMonth !== selectedMonth) return false;
    if (selectedSupplierId !== 'ALL' && r.supplierId !== selectedSupplierId) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const match =
        r.supplierNameSnapshot.toLowerCase().includes(q) ||
        r.supplierTaxpayerIdSnapshot.includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q) ||
        r.invoiceBookNumber.toLowerCase().includes(q) ||
        r.taxDate.includes(q);
      if (!match) return false;
    }

    return true;
  });

  // Sort by date ascending, then invoice number
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const d = a.taxDate.localeCompare(b.taxDate);
    if (d !== 0) return d;
    return a.invoiceNumber.localeCompare(b.invoiceNumber);
  });

  const summary = calculateSummary(sortedRecords);

  // Auto-calculation handlers
  const handleTaxableChange = (valStr: string) => {
    setTaxableAmountStr(valStr);
    const taxable = parseAmount(valStr);
    const rate = parseAmount(vatRateStr);
    const calc = calculateVatExclusive(taxable, rate);
    setVatAmountStr(calc.vatAmount.toFixed(2));
    setTotalAmountStr(calc.totalAmount.toFixed(2));
  };

  const handleTotalChange = (valStr: string) => {
    setTotalAmountStr(valStr);
    const total = parseAmount(valStr);
    const rate = parseAmount(vatRateStr);
    const calc = calculateVatInclusive(total, rate);
    setTaxableAmountStr(calc.taxableAmount.toFixed(2));
    setVatAmountStr(calc.vatAmount.toFixed(2));
  };

  const handleVatRateChange = (rateStr: string) => {
    setVatRateStr(rateStr);
    const rate = parseAmount(rateStr);
    if (calcMode === 'EXCLUSIVE') {
      const taxable = parseAmount(taxableAmountStr);
      const calc = calculateVatExclusive(taxable, rate);
      setVatAmountStr(calc.vatAmount.toFixed(2));
      setTotalAmountStr(calc.totalAmount.toFixed(2));
    } else {
      const total = parseAmount(totalAmountStr);
      const calc = calculateVatInclusive(total, rate);
      setTaxableAmountStr(calc.taxableAmount.toFixed(2));
      setVatAmountStr(calc.vatAmount.toFixed(2));
    }
  };

  const handleSupplierSelect = (id: string) => {
    setSupplierId(id);
    const selected = suppliers.find((s) => s.id === id);
    if (selected) {
      setSupplierName(selected.legalName || selected.displayName);
      setSupplierTaxId(selected.taxpayerId);
      setSupplierBranchType(selected.headOffice ? 'HEAD' : 'BRANCH');
      setSupplierBranchNumber(selected.branchNumber || '00000');
    }
  };

  const openAddModal = () => {
    setEditingRecord(null);
    setTaxDate(getTodayDateString());
    setInvoiceBookNumber('');
    setInvoiceNumber('');
    setSupplierId('');
    setSupplierName('');
    setSupplierTaxId('');
    setSupplierBranchType('HEAD');
    setSupplierBranchNumber('00000');

    setTaxableAmountStr('1000.00');
    setVatRateStr('7');
    setVatAmountStr('70.00');
    setTotalAmountStr('1070.00');
    setCalcMode('EXCLUSIVE');
    setNote('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (record: PurchaseTaxRecord) => {
    setEditingRecord(record);
    setTaxDate(record.taxDate);
    setInvoiceBookNumber(record.invoiceBookNumber || '');
    setInvoiceNumber(record.invoiceNumber);
    setSupplierId(record.supplierId);
    setSupplierName(record.supplierNameSnapshot);
    setSupplierTaxId(record.supplierTaxpayerIdSnapshot);
    setSupplierBranchType(record.supplierBranchTypeSnapshot);
    setSupplierBranchNumber(record.supplierBranchNumberSnapshot);

    setTaxableAmountStr(record.taxableAmount.toFixed(2));
    setVatRateStr(record.vatRate.toString());
    setVatAmountStr(record.vatAmount.toFixed(2));
    setTotalAmountStr(record.totalAmount.toFixed(2));
    setCalcMode('EXCLUSIVE');
    setNote(record.note || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!taxDate) {
      setFormError('กรุณาระบุวันที่ใบกำกับภาษี');
      return;
    }

    if (!invoiceNumber.trim()) {
      setFormError('กรุณาระบุเลขที่ใบกำกับภาษี');
      return;
    }

    if (!supplierName.trim()) {
      setFormError('กรุณาเลือกหรือกรอกชื่อผู้ขาย / ผู้ให้บริการ');
      return;
    }

    const taxable = parseAmount(taxableAmountStr);
    const vat = parseAmount(vatAmountStr);
    const total = parseAmount(totalAmountStr);
    const vatRate = parseAmount(vatRateStr);

    if (taxable < 0) {
      setFormError('มูลค่าสินค้าหรือบริการต้องไม่ติดลบ');
      return;
    }

    try {
      if (editingRecord) {
        await updatePurchaseTaxRecord(editingRecord.id, {
          taxDate,
          invoiceBookNumber: invoiceBookNumber.trim(),
          invoiceNumber: invoiceNumber.trim(),
          supplierId: supplierId || 'CUSTOM',
          supplierNameSnapshot: supplierName.trim(),
          supplierTaxpayerIdSnapshot: supplierTaxId.trim(),
          supplierBranchTypeSnapshot: supplierBranchType,
          supplierBranchNumberSnapshot: supplierBranchNumber.trim(),
          taxableAmount: taxable,
          vatRate,
          customVatAmount: vat,
          customTotalAmount: total,
          note: note.trim(),
        });
        onShowToast('แก้ไขรายการภาษีซื้อเรียบร้อยแล้ว', 'success');
      } else {
        await createPurchaseTaxRecord({
          taxDate,
          invoiceBookNumber: invoiceBookNumber.trim(),
          invoiceNumber: invoiceNumber.trim(),
          supplierId: supplierId || 'CUSTOM',
          supplierNameSnapshot: supplierName.trim(),
          supplierTaxpayerIdSnapshot: supplierTaxId.trim(),
          supplierBranchTypeSnapshot: supplierBranchType,
          supplierBranchNumberSnapshot: supplierBranchNumber.trim(),
          taxableAmount: taxable,
          vatRate,
          customVatAmount: vat,
          customTotalAmount: total,
          note: note.trim(),
        });
        onShowToast('บันทึกรายการภาษีซื้อเรียบร้อยแล้ว', 'success');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกรายการภาษีซื้อ';
      setFormError(message);
    }
  };

  const handleQuickSupplierSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSupplierName.trim()) return;

    try {
      const newSup = await createSupplier({
        displayName: quickSupplierName.trim(),
        legalName: quickSupplierName.trim(),
        taxpayerId: quickSupplierTaxId.trim(),
        headOffice: quickSupplierHead,
        branchNumber: quickSupplierHead ? '00000' : quickSupplierBranch.trim(),
        address: '',
        phone: '',
        note: 'เพิ่มด่วนจากหน้าภาษีซื้อ',
      });

      handleSupplierSelect(newSup.id);
      setIsQuickSupplierOpen(false);
      onShowToast(`เพิ่มผู้ขาย "${newSup.displayName}" เรียบร้อยแล้ว`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถบันทึกผู้ขายได้';
      setFormError(message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePurchaseTaxRecord(deleteTarget.id);
      onShowToast('ลบรายการภาษีซื้อเรียบร้อยแล้ว', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถลบรายการได้';
      onShowToast(message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const availableYears = [
    currentYear - 2,
    currentYear - 1,
    currentYear,
    currentYear + 1,
    currentYear + 2,
  ];

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-teal-700" />
            <h2 className="text-xl font-bold text-slate-900">บันทึกภาษีซื้อ (Purchase Tax)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            บันทึกรายการใบกำกับภาษีซื้อ คำนวณ VAT 7% พร้อมบันทึก Snapshot ผู้ขาย
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ เพิ่มรายการภาษีซื้อ</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Year Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-medium text-slate-600">ปี:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden w-full cursor-pointer"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {toBuddhistYear(y)} ({y})
                </option>
              ))}
            </select>
          </div>

          {/* Month Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
            <span className="font-medium text-slate-600">เดือน:</span>
            <select
              value={selectedMonth}
              onChange={(e) =>
                setSelectedMonth(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))
              }
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden w-full cursor-pointer"
            >
              <option value="ALL">ทุกเดือนในรอบปี</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getThaiMonthName(m)}
                </option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
            <Building2 className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="font-medium text-slate-600">ผู้ขาย:</span>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-hidden w-full cursor-pointer truncate"
            >
              <option value="ALL">ผู้ขายทั้งหมด</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.displayName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-xs">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="ค้นหาตามชื่อผู้ขาย, เลขประจำตัวผู้เสียภาษี, เลขที่ใบกำกับภาษี, เล่มที่, วันที่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none focus:outline-hidden text-slate-800 placeholder:text-slate-400 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs text-teal-950">
        <div>
          <span className="font-medium text-teal-800">ช่วงเวลาที่แสดง: </span>
          <span className="font-bold">
            {selectedMonth === 'ALL' ? 'ทั้งปี' : getThaiMonthName(selectedMonth)}{' '}
            พ.ศ. {toBuddhistYear(selectedYear)}
          </span>
          <span className="mx-2 text-teal-300">|</span>
          <span>จำนวนรายการ: </span>
          <span className="font-bold">{summary.count}</span> รายการ
        </div>

        <div className="flex items-center gap-4 flex-wrap font-mono">
          <div>
            <span className="text-teal-700">มูลค่าก่อน VAT: </span>
            <span className="font-bold">฿ {formatCurrency(summary.taxableAmount)}</span>
          </div>
          <div>
            <span className="text-teal-700">ภาษีซื้อ (VAT): </span>
            <span className="font-bold text-teal-900 bg-teal-100 px-2 py-0.5 rounded">
              ฿ {formatCurrency(summary.vatAmount)}
            </span>
          </div>
          <div>
            <span className="text-teal-700">รวมทั้งสิ้น: </span>
            <span className="font-bold">฿ {formatCurrency(summary.totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Purchase Tax Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {sortedRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <ReceiptText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>ไม่พบรายการภาษีซื้อในช่วงเวลาหรือเงื่อนไขที่เลือก</p>
            <button
              onClick={openAddModal}
              className="mt-3 text-xs text-teal-700 hover:underline font-medium cursor-pointer"
            >
              + คลิกที่นี่เพื่อบันทึกรายการภาษีซื้อ
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="text-slate-600 bg-slate-50 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="px-3 py-3 w-10 text-center">ลำดับ</th>
                  <th className="px-3 py-3">วันที่</th>
                  <th className="px-3 py-3">เล่มที่</th>
                  <th className="px-3 py-3">เลขที่ใบกำกับ</th>
                  <th className="px-3 py-3">ผู้ขาย / ผู้ให้บริการ</th>
                  <th className="px-3 py-3">เลขประจำตัวผู้เสียภาษี</th>
                  <th className="px-3 py-3 text-center">สาขา</th>
                  <th className="px-3 py-3 text-right">มูลค่าก่อน VAT</th>
                  <th className="px-3 py-3 text-right text-teal-800">VAT ({sortedRecords[0]?.vatRate || 7}%)</th>
                  <th className="px-3 py-3 text-right">รวมทั้งสิ้น</th>
                  <th className="px-3 py-3 text-right">การทำงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition">
                    <td className="px-3 py-2.5 text-center text-slate-400">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-slate-700 whitespace-nowrap">
                      {formatThaiDateShort(r.taxDate)}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 font-mono">
                      {r.invoiceBookNumber || '-'}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-slate-800 font-mono">
                      {r.invoiceNumber}
                    </td>
                    <td className="px-3 py-2.5 text-slate-900 font-medium">
                      <div>{r.supplierNameSnapshot}</div>
                      {r.note && (
                        <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                          {r.note}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 font-mono">
                      {r.supplierTaxpayerIdSnapshot || '-'}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-600">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-[11px]">
                        {r.supplierBranchTypeSnapshot === 'HEAD'
                          ? 'สนญ.'
                          : r.supplierBranchNumberSnapshot || '00000'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-700 font-mono">
                      {formatCurrency(r.taxableAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-teal-800 font-mono">
                      {formatCurrency(r.vatAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-900 font-mono">
                      {formatCurrency(r.totalAmount)}
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="p-1 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded transition cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={7} className="px-3 py-2.5 text-right">
                    รวมทั้งสิ้น ({summary.count} รายการ)
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {formatCurrency(summary.taxableAmount)}
                  </td>
                  <td className="px-3 py-2.5 text-right text-teal-800 font-mono">
                    {formatCurrency(summary.vatAmount)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {formatCurrency(summary.totalAmount)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Purchase Tax Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ReceiptText className="w-5 h-5 text-teal-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingRecord ? 'แก้ไขรายการภาษีซื้อ' : 'บันทึกรายการภาษีซื้อใหม่'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                  {formError}
                </div>
              )}

              {/* Section 1: Invoice Data */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  1. ข้อมูลใบกำกับภาษี
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      วันที่ตามใบกำกับภาษี <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={taxDate}
                      onChange={(e) => setTaxDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      {formatThaiDateShort(taxDate)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เล่มที่ (Book No.)
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 001"
                      value={invoiceBookNumber}
                      onChange={(e) => setInvoiceBookNumber(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เลขที่ใบกำกับภาษี <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น IV-2026-001"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Supplier Data & Snapshot */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    2. ข้อมูลผู้ขาย / ผู้ให้บริการ (Snapshot)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickSupplierName('');
                      setQuickSupplierTaxId('');
                      setQuickSupplierHead(true);
                      setQuickSupplierBranch('00000');
                      setIsQuickSupplierOpen(true);
                    }}
                    className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ เพิ่มผู้ขายรายใหม่</span>
                  </button>
                </div>

                <div className="space-y-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      เลือกจากสมุดรายชื่อผู้ขาย
                    </label>
                    <select
                      value={supplierId}
                      onChange={(e) => handleSupplierSelect(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600 cursor-pointer"
                    >
                      <option value="">-- เลือกผู้ขาย หรือ กรอกเองด้านล่าง --</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.displayName} (เลขผู้เสียภาษี: {s.taxpayerId || '-'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ชื่อผู้ขายตามใบกำกับภาษี <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="ชื่อนิติบุคคล / ผู้ขาย"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        เลขประจำตัวผู้เสียภาษี 13 หลัก
                      </label>
                      <input
                        type="text"
                        maxLength={13}
                        placeholder="เช่น 0105551234567"
                        value={supplierTaxId}
                        onChange={(e) => setSupplierTaxId(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        สถานประกอบการ
                      </label>
                      <select
                        value={supplierBranchType}
                        onChange={(e) =>
                          setSupplierBranchType(e.target.value as 'HEAD' | 'BRANCH')
                        }
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600 cursor-pointer"
                      >
                        <option value="HEAD">สำนักงานใหญ่</option>
                        <option value="BRANCH">สาขา</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        เลขที่สาขา
                      </label>
                      <input
                        type="text"
                        disabled={supplierBranchType === 'HEAD'}
                        maxLength={5}
                        placeholder="00000"
                        value={supplierBranchType === 'HEAD' ? '00000' : supplierBranchNumber}
                        onChange={(e) => setSupplierBranchNumber(e.target.value)}
                        className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Amount and Real-time VAT Calculation */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    3. จำนวนเงินและภาษีมูลค่าเพิ่ม
                  </h4>
                  <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-[11px]">
                    <button
                      type="button"
                      onClick={() => setCalcMode('EXCLUSIVE')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        calcMode === 'EXCLUSIVE'
                          ? 'bg-white font-semibold shadow-2xs text-teal-800'
                          : 'text-slate-600'
                      }`}
                    >
                      กรอกยอดก่อน VAT
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalcMode('INCLUSIVE')}
                      className={`px-2 py-0.5 rounded cursor-pointer ${
                        calcMode === 'INCLUSIVE'
                          ? 'bg-white font-semibold shadow-2xs text-teal-800'
                          : 'text-slate-600'
                      }`}
                    >
                      กรอกยอดรวม (ถอด VAT)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      มูลค่าสินค้า/บริการ <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={taxableAmountStr}
                      onChange={(e) => handleTaxableChange(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-right focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      อัตรา VAT (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={vatRateStr}
                      onChange={(e) => handleVatRateChange(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-center focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ภาษีมูลค่าเพิ่ม (VAT)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={vatAmountStr}
                      onChange={(e) => setVatAmountStr(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-teal-50 border border-teal-300 text-teal-900 rounded-lg font-mono text-right font-bold focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      รวมทั้งสิ้น (Total)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={totalAmountStr}
                      onChange={(e) => handleTotalChange(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-right font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Note */}
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  หมายเหตุ (Note)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ค่าอุปกรณ์สำนักงาน, ค่าบริการอินเทอร์เน็ต"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition cursor-pointer"
                >
                  {editingRecord ? 'บันทึกการแก้ไข' : 'บันทึกรายการภาษีซื้อ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Supplier Modal */}
      {isQuickSupplierOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h4 className="text-sm font-bold text-slate-900">เพิ่มผู้ขายด่วน</h4>
              <button
                onClick={() => setIsQuickSupplierOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickSupplierSave} className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อผู้ขาย <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="บริษัท..."
                  value={quickSupplierName}
                  onChange={(e) => setQuickSupplierName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขผู้เสียภาษี 13 หลัก
                </label>
                <input
                  type="text"
                  maxLength={13}
                  placeholder="010..."
                  value={quickSupplierTaxId}
                  onChange={(e) => setQuickSupplierTaxId(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuickSupplierHead(true)}
                  className={`flex-1 py-1.5 text-xs rounded border cursor-pointer ${
                    quickSupplierHead ? 'bg-teal-700 text-white' : 'bg-slate-50'
                  }`}
                >
                  สำนักงานใหญ่
                </button>
                <button
                  type="button"
                  onClick={() => setQuickSupplierHead(false)}
                  className={`flex-1 py-1.5 text-xs rounded border cursor-pointer ${
                    !quickSupplierHead ? 'bg-teal-700 text-white' : 'bg-slate-50'
                  }`}
                >
                  สาขา
                </button>
              </div>

              {!quickSupplierHead && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขที่สาขา
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={quickSupplierBranch}
                    onChange={(e) => setQuickSupplierBranch(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickSupplierOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-teal-700 text-white font-semibold rounded-lg cursor-pointer"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="ยืนยันการลบรายการภาษีซื้อ"
        message={`ต้องการลบรายการใบกำกับภาษีเลขที่ "${deleteTarget?.invoiceNumber}" ของผู้ขาย "${deleteTarget?.supplierNameSnapshot}" หรือไม่?`}
        confirmText="ลบรายการ"
        cancelText="ยกเลิก"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
