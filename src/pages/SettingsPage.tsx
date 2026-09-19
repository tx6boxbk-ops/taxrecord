import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  Settings,
  Building2,
  Database,
  Download,
  Upload,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { resetDatabase } from '../db/db';
import {
  getBusinessSettings,
  saveBusinessSettings,
} from '../services/settingsService';
import {
  exportDatabaseToJson,
  downloadBackupFile,
  validateAndPreviewBackup,
  restoreReplaceAll,
  restoreMerge,
  getDatabaseStatistics,
} from '../services/backupService';
import { BackupData, BackupPreview } from '../types';
import { formatBranchNumber } from '../utils/validation';
import { ConfirmModal } from '../components/ConfirmModal';
import { seedSampleData } from '../utils/seedData';

interface SettingsPageProps {
  onShowToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onShowToast }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [businessName, setBusinessName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxpayerId, setTaxpayerId] = useState('');
  const [headOffice, setHeadOffice] = useState(true);
  const [branchNumber, setBranchNumber] = useState('00000');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [defaultVatRate, setDefaultVatRate] = useState(7);
  const [isSaving, setIsSaving] = useState(false);

  // Backup & Restore State
  const [stats, setStats] = useState<{
    suppliers: number;
    customers: number;
    purchases: number;
    sales: number;
  }>({ suppliers: 0, customers: 0, purchases: 0, sales: 0 });

  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [pendingRestoreData, setPendingRestoreData] = useState<{
    data: BackupData;
    preview: BackupPreview;
  } | null>(null);

  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [seedModalOpen, setSeedModalOpen] = useState(false);

  // Load existing business settings
  const currentSettings = useLiveQuery(() => getBusinessSettings());

  useEffect(() => {
    if (currentSettings) {
      setBusinessName(currentSettings.businessName);
      setLegalName(currentSettings.legalName || currentSettings.businessName);
      setTaxpayerId(currentSettings.taxpayerId);
      setHeadOffice(currentSettings.branchType === 'HEAD');
      setBranchNumber(currentSettings.branchNumber);
      setAddress(currentSettings.address || '');
      setPhone(currentSettings.phone || '');
      setDefaultVatRate(currentSettings.vatRate || 7);
    }
  }, [currentSettings]);

  // Refresh DB statistics
  const refreshStats = async () => {
    const s = await getDatabaseStatistics();
    setStats(s);
  };

  useEffect(() => {
    refreshStats();
  }, [currentSettings]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveBusinessSettings({
        businessName: businessName.trim(),
        legalName: legalName.trim() || businessName.trim(),
        taxpayerId: taxpayerId.trim(),
        branchType: headOffice ? 'HEAD' : 'BRANCH',
        branchNumber: headOffice ? '00000' : formatBranchNumber(branchNumber),
        address: address.trim(),
        phone: phone.trim(),
        vatRate: Number(defaultVatRate) || 7,
      });
      onShowToast('บันทึกข้อมูลกิจการเรียบร้อยแล้ว', 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล';
      onShowToast(message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportBackup = async () => {
    try {
      const data = await exportDatabaseToJson();
      const filename = downloadBackupFile(data);
      onShowToast(`สำรองข้อมูลเป็นไฟล์ ${filename} สำเร็จแล้ว`, 'success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'สำรองข้อมูลไม่สำเร็จ';
      onShowToast(message, 'error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = validateAndPreviewBackup(text);
        setPendingRestoreData(result);
        setRestoreModalOpen(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'ไฟล์ JSON ไม่ถูกต้อง';
        onShowToast(msg, 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeRestore = async (strategy: 'MERGE' | 'REPLACE') => {
    if (!pendingRestoreData) return;
    try {
      if (strategy === 'REPLACE') {
        await restoreReplaceAll(pendingRestoreData.data, true);
        onShowToast('กู้คืนข้อมูลทั้งหมดแบบแทนที่สำเร็จ', 'success');
      } else {
        const res = await restoreMerge(pendingRestoreData.data);
        onShowToast(
          `กู้คืนแบบรวมสำเร็จ: เพิ่ม ${res.addedPurchases} ภาษีซื้อ, ${res.addedSales} ภาษีขาย, ${res.addedSuppliers} ผู้ขาย, ${res.addedCustomers} ผู้ซื้อ`,
          'success'
        );
      }
      await refreshStats();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'การกู้คืนข้อมูลล้มเหลว';
      onShowToast(msg, 'error');
    } finally {
      setRestoreModalOpen(false);
      setPendingRestoreData(null);
    }
  };

  const handleResetDatabase = async () => {
    try {
      await resetDatabase();
      await refreshStats();
      onShowToast('ล้างข้อมูลในระบบและคืนค่าเริ่มต้นเรียบร้อยแล้ว', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ล้างข้อมูลไม่สำเร็จ';
      onShowToast(msg, 'error');
    } finally {
      setResetModalOpen(false);
    }
  };

  const handleSeedData = async () => {
    try {
      await seedSampleData();
      await refreshStats();
      onShowToast('สร้างข้อมูลตัวอย่างสำหรับการทดสอบระบบเรียบร้อยแล้ว', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'สร้างข้อมูลตัวอย่างไม่สำเร็จ';
      onShowToast(msg, 'error');
    } finally {
      setSeedModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-teal-700" />
          <h2 className="text-xl font-bold text-slate-900">การตั้งค่าระบบและฐานข้อมูล</h2>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          ตั้งค่าข้อมูลกิจการสำหรับหัวรายงานภาษี สำรองและกู้คืนข้อมูลฐานข้อมูลออฟไลน์
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Business Settings Form */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
          <div className="flex items-center gap-2 pb-4 mb-4 border-b border-slate-200">
            <Building2 className="w-4 h-4 text-teal-700" />
            <h3 className="text-base font-bold text-slate-900">
              ข้อมูลกิจการ (สำหรับรายงานภาษี ภ.พ.30)
            </h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อสถานประกอบการ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น บริษัท ตัวอย่าง เทรดดิ้ง จำกัด"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ชื่อนิติบุคคล / ผู้ประกอบการ (ตามแบบ ภ.พ.20)
              </label>
              <input
                type="text"
                placeholder="ชื่อนิติบุคคลตามแบบ ภ.พ.20"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                เลขประจำตัวผู้เสียภาษีอากร 13 หลัก <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={13}
                placeholder="เช่น 0105559000001"
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
                <label className="block font-semibold text-slate-700 mb-1">
                  สถานประกอบการ
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHeadOffice(true);
                      setBranchNumber('00000');
                    }}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                      headOffice
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    สำนักงานใหญ่
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeadOffice(false)}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg border cursor-pointer ${
                      !headOffice
                        ? 'bg-teal-700 text-white border-teal-700'
                        : 'bg-white text-slate-700 border-slate-300'
                    }`}
                  >
                    สาขา
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  เลขที่สาขา (เช่น 00001)
                </label>
                <input
                  type="text"
                  disabled={headOffice}
                  maxLength={5}
                  value={headOffice ? '00000' : branchNumber}
                  onChange={(e) => setBranchNumber(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono disabled:bg-slate-100 disabled:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ที่อยู่สถานประกอบการ
              </label>
              <textarea
                rows={2}
                placeholder="เลขที่ อาคาร ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-teal-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
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
                <label className="block font-semibold text-slate-700 mb-1">
                  อัตราภาษีมูลค่าเพิ่มเริ่มต้น (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={defaultVatRate}
                  onChange={(e) => setDefaultVatRate(Number(e.target.value))}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 disabled:bg-slate-300 text-white font-semibold rounded-lg shadow-xs transition cursor-pointer"
              >
                บันทึกการตั้งค่ากิจการ
              </button>
            </div>
          </form>
        </div>

        {/* Database & Backup Actions */}
        <div className="space-y-6">
          {/* Storage & Statistics Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200">
              <Database className="w-4 h-4 text-teal-700" />
              <h3 className="text-sm font-bold text-slate-900">
                สถานะฐานข้อมูลในเครื่อง (IndexedDB)
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center my-3">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-teal-800">{stats.purchases}</div>
                <div className="text-[11px] text-slate-500">ภาษีซื้อ</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-indigo-800">{stats.sales}</div>
                <div className="text-[11px] text-slate-500">ภาษีขาย</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-slate-800">{stats.suppliers}</div>
                <div className="text-[11px] text-slate-500">ผู้ขาย</div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <div className="text-base font-bold text-slate-800">{stats.customers}</div>
                <div className="text-[11px] text-slate-500">ผู้ซื้อ</div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              * ข้อมูลทั้งหมดถูกจัดเก็บแบบ Local-first ในเบราว์เซอร์ของคุณ ทำงานได้แม้ออฟไลน์
            </p>
          </div>

          {/* Backup & Restore Controls */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              สำรองและกู้คืนข้อมูล (Backup & Restore)
            </h3>

            <button
              onClick={handleExportBackup}
              className="w-full py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์สำรองข้อมูล (.json)</span>
            </button>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>กู้คืนข้อมูลจากไฟล์ JSON</span>
              </button>
            </div>
          </div>

          {/* Sample Data & Reset */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <h3 className="text-sm font-bold text-slate-900">
              เครื่องมือจำลองและล้างข้อมูล
            </h3>

            <button
              onClick={() => setSeedModalOpen(true)}
              className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>โหลดข้อมูลตัวอย่างสำหรับทดสอบ</span>
            </button>

            <button
              onClick={() => setResetModalOpen(true)}
              className="w-full py-2 px-3 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>ล้างข้อมูลทั้งหมดในระบบ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Restore Strategy Selection Modal */}
      {restoreModalOpen && pendingRestoreData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              เลือกวิธีการนำเข้าข้อมูลสำรอง
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              ตรวจพบไฟล์สำรองข้อมูล (ส่งออกเมื่อ:{' '}
              {new Date(pendingRestoreData.preview.exportedAt).toLocaleString('th-TH')})
              <br />
              มีข้อมูลภาษีซื้อ {pendingRestoreData.preview.purchaseCount} รายการ, ภาษีขาย{' '}
              {pendingRestoreData.preview.salesCount} รายการ
              <br />
              กรุณาเลือกรูปแบบที่ต้องการนำเข้า:
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => executeRestore('MERGE')}
                className="w-full p-3 text-left border border-teal-200 bg-teal-50/50 hover:bg-teal-50 rounded-lg transition cursor-pointer"
              >
                <div className="text-xs font-bold text-teal-900">
                  1. นำเข้าแบบรวม (Merge Strategy) - แนะนำ
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  รักษาข้อมูลปัจจุบันไว้ และเพิ่มรายการใหม่หรืออัปเดตรายการที่มีรหัสเดียวกัน
                </div>
              </button>

              <button
                onClick={() => executeRestore('REPLACE')}
                className="w-full p-3 text-left border border-rose-200 bg-rose-50/50 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              >
                <div className="text-xs font-bold text-rose-900">
                  2. นำเข้าแบบแทนที่ทั้งหมด (Replace Strategy)
                </div>
                <div className="text-[11px] text-slate-600 mt-1">
                  ลบข้อมูลที่มีอยู่เดิมทั้งหมด และเขียนทับด้วยข้อมูลจากไฟล์สำรอง
                </div>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setRestoreModalOpen(false);
                  setPendingRestoreData(null);
                }}
                className="px-4 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      <ConfirmModal
        isOpen={resetModalOpen}
        title="ยืนยันการล้างข้อมูลทั้งหมด"
        message="คุณต้องการลบข้อมูลภาษีซื้อ, ภาษีขาย, รายชื่อผู้ขาย และรายชื่อผู้ซื้อทั้งหมดออกจากเครื่องนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้ กรุณาดาวน์โหลดสำรองข้อมูลไว้ก่อนหากจำเป็น"
        confirmText="ยืนยันล้างข้อมูล"
        cancelText="ยกเลิก"
        isDestructive={true}
        onConfirm={handleResetDatabase}
        onCancel={() => setResetModalOpen(false)}
      />

      {/* Seed Data Confirmation Modal */}
      <ConfirmModal
        isOpen={seedModalOpen}
        title="โหลดข้อมูลตัวอย่างสำหรับทดสอบ"
        message="ระบบจะเพิ่มข้อมูลตัวอย่างผู้ขาย, ลูกค้า และรายการใบกำกับภาษีซื้อ/ขายของปี พ.ศ. 2569 เพื่อให้คุณสามารถทดสอบดูแดชบอร์ด รายงาน และการส่งออก Excel/PDF ได้ทันที"
        confirmText="โหลดข้อมูลตัวอย่าง"
        cancelText="ยกเลิก"
        isDestructive={false}
        onConfirm={handleSeedData}
        onCancel={() => setSeedModalOpen(false)}
      />
    </div>
  );
};
