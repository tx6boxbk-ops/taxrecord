import React, { useState } from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  FileSpreadsheet,
  Building2,
  Users,
  FileBarChart,
  HardDriveDownload,
  Settings,
  ShieldCheck,
  Menu,
  X,
  Database,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export type NavSection =
  | 'dashboard'
  | 'purchase'
  | 'sales'
  | 'suppliers'
  | 'customers'
  | 'reports'
  | 'backup'
  | 'settings'
  | 'system-test';

interface LayoutProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({
  currentSection,
  onSelectSection,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOnline = useOnlineStatus();

  const navItems = [
    {
      id: 'dashboard' as NavSection,
      label: 'หน้าแรก',
      sublabel: 'แดชบอร์ดสรุปยอด',
      icon: LayoutDashboard,
    },
    {
      id: 'purchase' as NavSection,
      label: 'ภาษีซื้อ',
      sublabel: 'รายการและบันทึกภาษีซื้อ',
      icon: ReceiptText,
    },
    {
      id: 'sales' as NavSection,
      label: 'ภาษีขาย',
      sublabel: 'รายการและบันทึกภาษีขาย',
      icon: FileSpreadsheet,
    },
    {
      id: 'suppliers' as NavSection,
      label: 'ผู้ขาย / ผู้ให้บริการ',
      sublabel: 'ฐานข้อมูลคู่ค้าภาษีซื้อ',
      icon: Building2,
    },
    {
      id: 'customers' as NavSection,
      label: 'ผู้ซื้อ / ผู้รับบริการ',
      sublabel: 'ฐานข้อมูลคู่ค้าภาษีขาย',
      icon: Users,
    },
    {
      id: 'reports' as NavSection,
      label: 'ศูนย์รายงาน',
      sublabel: 'พิมพ์รายงาน / Excel / PDF',
      icon: FileBarChart,
    },
    {
      id: 'backup' as NavSection,
      label: 'สำรอง / นำเข้าข้อมูล',
      sublabel: 'Backup & Restore JSON',
      icon: HardDriveDownload,
    },
    {
      id: 'settings' as NavSection,
      label: 'ตั้งค่ากิจการ',
      sublabel: 'ชื่อสถานประกอบการ / Tax ID',
      icon: Settings,
    },
    {
      id: 'system-test' as NavSection,
      label: 'ทดสอบระบบ',
      sublabel: 'System & Integrity Test',
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar - Hidden on print */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              aria-label="Toggle Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => onSelectSection('dashboard')}
            >
              <div className="w-9 h-9 rounded-lg bg-teal-700 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                ฿
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Tax Record</h1>
                <p className="text-xs text-slate-500 font-medium">ระบบบันทึกภาษีซื้อและภาษีขาย</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Database Local indicator */}
            <div
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs text-slate-700"
              title="ข้อมูลถูกบันทึกบนเครื่องของคุณผ่าน IndexedDB โดยตรง ไม่ผ่านเซิร์ฟเวอร์ออนไลน์"
            >
              <Database className="w-3.5 h-3.5 text-teal-600" />
              <span>Local IndexedDB</span>
            </div>

            {/* Online / Offline status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span>Offline พร้อมใช้งาน</span>
                </>
              )}
            </div>

            {/* PWA Install Button */}
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        {/* Sidebar Navigation - Desktop */}
        <aside className="no-print hidden lg:block w-64 shrink-0 border-r border-slate-200 bg-white p-4">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-${item.id}`}
                  onClick={() => onSelectSection(item.id)}
                  className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition cursor-pointer ${
                    isActive
                      ? 'bg-teal-50 text-teal-900 font-semibold border-l-4 border-teal-700 pl-2'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 shrink-0 mt-0.5 ${
                      isActive ? 'text-teal-700' : 'text-slate-500'
                    }`}
                  />
                  <div>
                    <div className="text-sm leading-tight">{item.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-normal">
                      {item.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="mt-8 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-1">
            <div className="font-semibold text-slate-700">ความเป็นส่วนตัว 100%</div>
            <p className="leading-relaxed">
              ไม่มีการส่งข้อมูลออกนอกเครื่อง ใช้งานได้ออฟไลน์ ไม่ต้องต่อเน็ต
            </p>
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="no-print lg:hidden fixed inset-0 z-40 flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-72 max-w-xs bg-white h-full p-4 shadow-xl flex flex-col justify-between">
              <nav className="space-y-1 overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-2">
                  <span className="font-bold text-slate-800 text-sm">เมนูระบบ</span>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectSection(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition cursor-pointer ${
                        isActive
                          ? 'bg-teal-50 text-teal-800 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 shrink-0 ${
                          isActive ? 'text-teal-700' : 'text-slate-500'
                        }`}
                      />
                      <span className="text-sm">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              <div className="pt-4 border-t border-slate-200 text-xs text-slate-500 text-center">
                Local-First / Offline Thai VAT App
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
