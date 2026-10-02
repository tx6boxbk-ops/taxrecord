import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Calendar } from 'lucide-react';
import { useMonth } from '../context/MonthContext';
import { THAI_MONTHS_FULL, toBuddhistYear } from '../utils/thaiDate';

export const MonthTabBar: React.FC = () => {
  const {
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
    availableYears,
    buddhistYear,
  } = useMonth();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -200, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 200, behavior: 'smooth' });
    }
  };

  return (
    <div className="no-print sticky bottom-0 z-30 bg-slate-100 border-t border-slate-300 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] select-none">
      <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center justify-between h-11">
        {/* Left: Excel Sheet Icon & Year Selector */}
        <div className="flex items-center gap-2 shrink-0 pr-2 border-r border-slate-300">
          <div className="flex items-center gap-1 text-emerald-800 font-bold text-xs bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span className="hidden sm:inline">ชีตเดือน</span>
          </div>

          {/* Global Year Switcher */}
          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-300 text-xs shadow-2xs">
            <Calendar className="w-3 h-3 text-slate-500" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent font-semibold text-slate-800 text-xs focus:outline-hidden cursor-pointer"
              title="เปลี่ยนปีภาษีที่ใช้งานสำหรับทุกหน้า"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {toBuddhistYear(y)} ({y})
                </option>
              ))}
            </select>
          </div>

          {/* Scroll navigation arrows for tabs */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={scrollLeft}
              className="p-1 rounded hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              title="เลื่อนแท็บไปทางซ้าย"
              aria-label="Scroll Tabs Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={scrollRight}
              className="p-1 rounded hover:bg-slate-200 text-slate-600 transition cursor-pointer"
              title="เลื่อนแท็บไปทางขวา"
              aria-label="Scroll Tabs Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Excel Sheet Tabs (12 Months) */}
        <div
          ref={scrollContainerRef}
          className="flex-1 flex items-end overflow-x-auto scrollbar-none px-2 space-x-1 h-full pt-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {THAI_MONTHS_FULL.map((monthName, idx) => {
            const isActive = selectedMonth === monthName;
            return (
              <button
                key={monthName}
                type="button"
                onClick={() => setSelectedMonth(monthName)}
                className={`group shrink-0 h-9 px-3.5 rounded-t-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border border-b-0 ${
                  isActive
                    ? 'bg-white text-emerald-900 font-bold border-slate-300 border-t-3 border-t-emerald-600 shadow-xs relative -bottom-px z-10'
                    : 'bg-slate-200/90 text-slate-700 border-slate-300/80 hover:bg-slate-200 hover:text-slate-900'
                }`}
                title={`เลือกเดือน ${monthName}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full transition ${
                    isActive ? 'bg-emerald-600' : 'bg-transparent group-hover:bg-slate-400'
                  }`}
                />
                <span className="whitespace-nowrap">{monthName}</span>
                <span
                  className={`text-[10px] font-mono px-1 rounded ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right: Active Context Indicator */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0 pl-3 border-l border-slate-300 text-xs">
          <span className="text-slate-500">ข้อมูลปัจจุบัน:</span>
          <span className="font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs font-mono">
            {selectedMonth} {buddhistYear}
          </span>
        </div>
      </div>
    </div>
  );
};
