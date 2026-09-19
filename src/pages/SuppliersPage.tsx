import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Building2,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Phone,
  MapPin,
  FileText,
} from 'lucide-react';
import { db } from '../db/db';
import {
  createSupplier,
  updateSupplier,
  deleteSupplier,
  checkSupplierUsage,
  checkDuplicateSupplier,
} from '../services/supplierService';
import { Supplier } from '../types';
import { formatBranchNumber } from '../utils/validation';
import { ConfirmModal } from '../components/ConfirmModal';

interface SuppliersPageProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SuppliersPage: React.FC<SuppliersPageProps> = ({ onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [usageCount, setUsageCount] = useState<number>(0);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxpayerId, setTaxpayerId] = useState('');
  const [headOffice, setHeadOffice] = useState(true);
  const [branchNumber, setBranchNumber] = useState('00000');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');

  // Live query from IndexedDB
  const suppliers = useLiveQuery(() => db.suppliers.toArray()) || [];

  const filteredSuppliers = suppliers.filter((s) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.displayName.toLowerCase().includes(q) ||
      s.legalName.toLowerCase().includes(q) ||
      s.taxpayerId.includes(q) ||
      s.branchNumber.includes(q)
    );
  });

  const openAddModal = () => {
    setEditingSupplier(null);
    setDisplayName('');
    setLegalName('');
    setTaxpayerId('');
    setHeadOffice(true);
    setBranchNumber('00000');
    setAddress('');
    setPhone('');
    setNote('');
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setDisplayName(supplier.displayName);
    setLegalName(supplier.legalName);
    setTaxpayerId(supplier.taxpayerId);
    setHeadOffice(supplier.headOffice);
    setBranchNumber(supplier.branchNumber);
    setAddress(supplier.address || '');
    setPhone(supplier.phone || '');
    setNote(supplier.note || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanDisplay = displayName.trim();
    if (!cleanDisplay) {
      setFormError('กรุณากรอกชื่อผู้ขาย / ผู้ให้บริการ');
      return;
    }

    const cleanTaxId = taxpayerId.trim();
    if (cleanTaxId && cleanTaxId.length !== 13) {
      setFormError('เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก');
      return;
    }

    const cleanBranch = headOffice ? '00000' : formatBranchNumber(branchNumber);

    // Duplicate check
    if (cleanTaxId) {
      const isDuplicate = await checkDuplicateSupplier(
        cleanTaxId,
        cleanBranch,
        editingSupplier ? editingSupplier.id : undefined
      );
      if (isDuplicate) {
        setFormError(
          `มีผู้ขายที่ใช้เลขผู้เสียภาษี ${cleanTaxId} สาขา ${cleanBranch} ในระบบแล้ว`
        );
        return;
      }
    }

    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, {
          displayName: cleanDisplay,
          legalName: legalName.trim() || cleanDisplay,
          taxpayerId: cleanTaxId,
          headOffice,
          branchNumber: cleanBranch,
          address: address.trim(),
          phone: phone.trim(),
          note: note.trim(),
        });
        onShowToast('แก้ไขข้อมูลผู้ขายเรียบร้อยแล้ว', 'success');
      } else {
        await createSupplier({
          displayName: cleanDisplay,
          legalName: legalName.trim() || cleanDisplay,
          taxpayerId: cleanTaxId,
          headOffice,
          branchNumber: cleanBranch,
          address: address.trim(),
          phone: phone.trim(),
          note: note.trim(),
        });
        onShowToast('บันทึกผู้ขายรายใหม่เรียบร้อยแล้ว', 'success');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setFormError(message);
    }
  };

  const handleDeletePrompt = async (supplier: Supplier) => {
    const count = await checkSupplierUsage(supplier.id);
    setUsageCount(count);
    setDeleteTarget(supplier);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSupplier(deleteTarget.id);
      onShowToast('ลบรายการผู้ขายเรียบร้อยแล้ว', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'ไม่สามารถลบข้อมูลได้';
      onShowToast(message, 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-700" />
            <h2 className="text-xl font-bold text-slate-900">ผู้ขาย / ผู้ให้บริการ (Suppliers)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            สมุดรายชื่อคู่ค้าสำหรับดึงข้อมูลลงในแบบฟอร์มภาษีซื้อ
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-teal-700 hover:bg-teal-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มผู้ขายรายใหม่</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาตามชื่อผู้ขาย, เลขประจำตัวผู้เสียภาษี 13 หลัก, สาขา..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-sm bg-transparent border-none focus:outline-hidden text-slate-800 placeholder:text-slate-400"
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

      {/* Suppliers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            พบทั้งหมด {filteredSuppliers.length} รายการ
          </span>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>ไม่พบข้อมูลผู้ขาย / ผู้ให้บริการ</p>
            <button
              onClick={openAddModal}
              className="mt-3 text-xs text-teal-700 hover:underline font-medium cursor-pointer"
            >
              + คลิกที่นี่เพื่อเพิ่มผู้ขายรายแรก
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12 text-center">ลำดับ</th>
                  <th className="px-4 py-3 font-semibold">ชื่อผู้ขาย / นิติบุคคล</th>
                  <th className="px-4 py-3 font-semibold">เลขประจำตัวผู้เสียภาษี</th>
                  <th className="px-4 py-3 font-semibold">สถานประกอบการ</th>
                  <th className="px-4 py-3 font-semibold">เบอร์โทรศัพท์</th>
                  <th className="px-4 py-3 font-semibold text-right">การทำงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map((s, idx) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-center text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>{s.displayName}</div>
                      {s.legalName && s.legalName !== s.displayName && (
                        <div className="text-xs text-slate-500 font-normal">
                          {s.legalName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {s.taxpayerId || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-medium ${
                          s.headOffice
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {s.headOffice ? 'สำนักงานใหญ่' : `สาขา ${s.branchNumber}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                      {s.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(s)}
                          className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(s)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingSupplier ? 'แก้ไขข้อมูลผู้ขาย' : 'เพิ่มผู้ขายรายใหม่'}
              </h3>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อที่แสดง / ชื่อทางการค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น บริษัท สยามเทรดดิ้ง จำกัด"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อนิติบุคคล / ชื่อตามใบกำกับภาษี
                </label>
                <input
                  type="text"
                  placeholder="หากเหมือนชื่อที่แสดง สามารถเว้นว่างไว้ได้"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขประจำตัวผู้เสียภาษี (13 หลัก)
                </label>
                <input
                  type="text"
                  maxLength={13}
                  placeholder="เช่น 0105551234567"
                  value={taxpayerId}
                  onChange={(e) => setTaxpayerId(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  จำนวน {taxpayerId.length} / 13 หลัก
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    สถานประกอบการ
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHeadOffice(true);
                        setBranchNumber('00000');
                      }}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                        headOffice
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      สำนักงานใหญ่
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeadOffice(false)}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                        !headOffice
                          ? 'bg-teal-700 text-white border-teal-700'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      สาขา
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    เลขที่สาขา (เช่น 00001)
                  </label>
                  <input
                    type="text"
                    disabled={headOffice}
                    maxLength={5}
                    placeholder="00000"
                    value={branchNumber}
                    onChange={(e) => setBranchNumber(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <MapPin className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  ที่อยู่
                </label>
                <textarea
                  rows={2}
                  placeholder="ที่อยู่สถานประกอบการ"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="text"
                  placeholder="เช่น 02-123-4567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <FileText className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  หมายเหตุ
                </label>
                <input
                  type="text"
                  placeholder="บันทึกช่วยจำเกี่ยวกับคู่ค้ารายนี้"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition cursor-pointer"
                >
                  {editingSupplier ? 'บันทึกการแก้ไข' : 'บันทึกผู้ขาย'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="ยืนยันการลบข้อมูลผู้ขาย"
        message={
          usageCount > 0
            ? `ผู้ขาย "${deleteTarget?.displayName}" มีรายการภาษีซื้อที่อ้างอิงอยู่จำนวน ${usageCount} รายการ\n\nการลบผู้ขายจะนำชื่อออกจากสมุดรายชื่อ แต่รายการภาษีซื้อเก่าที่เคยบันทึกไว้จะยังคงแสดงชื่อและเลขประจำตัวตาม Snapshot เดิมอย่างถูกต้องโดยไม่เสียหาย\n\nคุณต้องการลบหรือไม่?`
            : `คุณต้องการลบข้อมูลผู้ขาย "${deleteTarget?.displayName}" หรือไม่?`
        }
        confirmText="ลบข้อมูล"
        cancelText="ยกเลิก"
        isDestructive={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
