import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Users,
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
  createCustomer,
  updateCustomer,
  deleteCustomer,
  checkCustomerUsage,
  checkDuplicateCustomer,
} from '../services/customerService';
import { Customer } from '../types';
import { formatBranchNumber } from '../utils/validation';
import { ConfirmModal } from '../components/ConfirmModal';

interface CustomersPageProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({ onShowToast }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
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

  const customers = useLiveQuery(() => db.customers.toArray()) || [];

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.displayName.toLowerCase().includes(q) ||
      c.legalName.toLowerCase().includes(q) ||
      c.taxpayerId.includes(q) ||
      c.branchNumber.includes(q)
    );
  });

  const openAddModal = () => {
    setEditingCustomer(null);
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

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setDisplayName(customer.displayName);
    setLegalName(customer.legalName);
    setTaxpayerId(customer.taxpayerId);
    setHeadOffice(customer.headOffice);
    setBranchNumber(customer.branchNumber);
    setAddress(customer.address || '');
    setPhone(customer.phone || '');
    setNote(customer.note || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanDisplay = displayName.trim();
    if (!cleanDisplay) {
      setFormError('กรุณากรอกชื่อผู้ซื้อ / ผู้รับบริการ');
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
      const isDuplicate = await checkDuplicateCustomer(
        cleanTaxId,
        cleanBranch,
        editingCustomer ? editingCustomer.id : undefined
      );
      if (isDuplicate) {
        setFormError(
          `มีผู้ซื้อที่ใช้เลขผู้เสียภาษี ${cleanTaxId} สาขา ${cleanBranch} ในระบบแล้ว`
        );
        return;
      }
    }

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          displayName: cleanDisplay,
          legalName: legalName.trim() || cleanDisplay,
          taxpayerId: cleanTaxId,
          headOffice,
          branchNumber: cleanBranch,
          address: address.trim(),
          phone: phone.trim(),
          note: note.trim(),
        });
        onShowToast('แก้ไขข้อมูลผู้ซื้อเรียบร้อยแล้ว', 'success');
      } else {
        await createCustomer({
          displayName: cleanDisplay,
          legalName: legalName.trim() || cleanDisplay,
          taxpayerId: cleanTaxId,
          headOffice,
          branchNumber: cleanBranch,
          address: address.trim(),
          phone: phone.trim(),
          note: note.trim(),
        });
        onShowToast('บันทึกผู้ซื้อรายใหม่เรียบร้อยแล้ว', 'success');
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      setFormError(message);
    }
  };

  const handleDeletePrompt = async (customer: Customer) => {
    const count = await checkCustomerUsage(customer.id);
    setUsageCount(count);
    setDeleteTarget(customer);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteCustomer(deleteTarget.id);
      onShowToast('ลบรายการผู้ซื้อเรียบร้อยแล้ว', 'success');
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
            <Users className="w-5 h-5 text-indigo-700" />
            <h2 className="text-xl font-bold text-slate-900">ผู้ซื้อ / ผู้รับบริการ (Customers)</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            สมุดรายชื่อลูกค้าสำหรับดึงข้อมูลลงในแบบฟอร์มภาษีขาย
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มผู้ซื้อรายใหม่</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="ค้นหาตามชื่อผู้ซื้อ, เลขประจำตัวผู้เสียภาษี 13 หลัก, สาขา..."
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

      {/* Customers Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-600">
            พบทั้งหมด {filteredCustomers.length} รายการ
          </span>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>ไม่พบข้อมูลผู้ซื้อ / ผู้รับบริการ</p>
            <button
              onClick={openAddModal}
              className="mt-3 text-xs text-indigo-700 hover:underline font-medium cursor-pointer"
            >
              + คลิกที่นี่เพื่อเพิ่มผู้ซื้อรายแรก
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-600 bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12 text-center">ลำดับ</th>
                  <th className="px-4 py-3 font-semibold">ชื่อผู้ซื้อ / ลูกค้า</th>
                  <th className="px-4 py-3 font-semibold">เลขประจำตัวผู้เสียภาษี</th>
                  <th className="px-4 py-3 font-semibold">สถานประกอบการ</th>
                  <th className="px-4 py-3 font-semibold">เบอร์โทรศัพท์</th>
                  <th className="px-4 py-3 font-semibold text-right">การทำงาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 text-center text-slate-400 text-xs">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div>{c.displayName}</div>
                      {c.legalName && c.legalName !== c.displayName && (
                        <div className="text-xs text-slate-500 font-normal">
                          {c.legalName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-700">
                      {c.taxpayerId || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700 text-xs">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md font-medium ${
                          c.headOffice
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {c.headOffice ? 'สำนักงานใหญ่' : `สาขา ${c.branchNumber}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs font-mono">
                      {c.phone || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 text-slate-500 hover:text-indigo-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePrompt(c)}
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

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? 'แก้ไขข้อมูลผู้ซื้อ' : 'เพิ่มผู้ซื้อรายใหม่'}
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
                  ชื่อที่แสดง / ชื่อลูกค้า <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น บริษัท สหพาณิชย์ จำกัด หรือ นายสมชาย ใจดี"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
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
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เลขประจำตัวผู้เสียภาษี (13 หลัก)
                </label>
                <input
                  type="text"
                  maxLength={13}
                  placeholder="เช่น 0105559876543"
                  value={taxpayerId}
                  onChange={(e) => setTaxpayerId(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
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
                          ? 'bg-indigo-700 text-white border-indigo-700'
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
                          ? 'bg-indigo-700 text-white border-indigo-700'
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
                    className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
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
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <Phone className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  เบอร์โทรศัพท์
                </label>
                <input
                  type="text"
                  placeholder="เช่น 02-987-6543"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  <FileText className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                  หมายเหตุ
                </label>
                <input
                  type="text"
                  placeholder="บันทึกช่วยจำเกี่ยวกับลูกค้ารายนี้"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
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
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs transition cursor-pointer"
                >
                  {editingCustomer ? 'บันทึกการแก้ไข' : 'บันทึกผู้ซื้อ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Safe Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="ยืนยันการลบข้อมูลผู้ซื้อ"
        message={
          usageCount > 0
            ? `ผู้ซื้อ "${deleteTarget?.displayName}" มีรายการภาษีขายที่อ้างอิงอยู่จำนวน ${usageCount} รายการ\n\nการลบผู้ซื้อจะนำชื่อออกจากสมุดรายชื่อ แต่รายการภาษีขายเก่าที่เคยบันทึกไว้จะยังคงแสดงชื่อและเลขประจำตัวตาม Snapshot เดิมอย่างถูกต้องโดยไม่เสียหาย\n\nคุณต้องการลบหรือไม่?`
            : `คุณต้องการลบข้อมูลผู้ซื้อ "${deleteTarget?.displayName}" หรือไม่?`
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
