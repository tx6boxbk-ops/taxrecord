import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed standalone PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop Edge/Chrome flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-button"
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-teal-800 transition cursor-pointer"
        title="ติดตั้งแอปพลิเคชันลงบนคอมพิวเตอร์เพื่อเปิดใช้งานได้รวดเร็วและออฟไลน์"
      >
        <Download className="w-3.5 h-3.5" />
        <span>ติดตั้งแอป (PWA)</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-ios-install-button"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>ติดตั้งบน iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl text-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold">วิธีติดตั้งบน iPhone / iPad</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">
                1. แตะปุ่ม <strong>แชร์ (Share)</strong> ที่แถบเครื่องมือ Safari<br />
                2. เลื่อนลงแล้วเลือก <strong>เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</strong>
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-lg bg-teal-700 py-2 text-sm font-medium text-white hover:bg-teal-800 cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
