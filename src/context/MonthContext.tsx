import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  THAI_MONTHS_FULL,
  getMonthNumberFromName,
  getThaiMonthName,
  getDaysInMonth,
  constructIsoDate,
  toBuddhistYear,
} from '../utils/thaiDate';

const STORAGE_KEY_MONTH = 'tax_app_selected_month_name';
const STORAGE_KEY_YEAR = 'tax_app_selected_year';

export interface MonthContextValue {
  selectedMonth: string; // "มกราคม" ... "ธันวาคม"
  selectedMonthNumber: number; // 1 ... 12
  selectedYear: number; // Gregorian year e.g. 2026
  buddhistYear: number; // BE year e.g. 2569
  setSelectedMonth: (month: string) => void;
  setSelectedMonthNumber: (monthNumber: number) => void;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
  daysInSelectedMonth: number;
  constructDateForSelectedMonth: (day: number | string) => string;
}

const MonthContext = createContext<MonthContextValue | undefined>(undefined);

export const MonthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const currentRealYear = new Date().getFullYear();
  const currentRealMonthName = THAI_MONTHS_FULL[new Date().getMonth()];

  // Initialize selectedMonth from localStorage or current real month
  const [selectedMonth, setSelectedMonthState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MONTH);
      if (saved && THAI_MONTHS_FULL.includes(saved.trim())) {
        return saved.trim();
      }
    } catch {
      // ignore
    }
    return currentRealMonthName;
  });

  // Initialize selectedYear from localStorage or current real year
  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_YEAR);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 2000 && parsed <= 2100) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return currentRealYear;
  });

  // Save to localStorage whenever month or year changes
  const setSelectedMonth = useCallback((month: string) => {
    const cleanMonth = month.trim();
    if (THAI_MONTHS_FULL.includes(cleanMonth)) {
      setSelectedMonthState(cleanMonth);
      try {
        localStorage.setItem(STORAGE_KEY_MONTH, cleanMonth);
      } catch {
        // ignore
      }
    }
  }, []);

  const setSelectedMonthNumber = useCallback((monthNumber: number) => {
    if (monthNumber >= 1 && monthNumber <= 12) {
      const monthName = getThaiMonthName(monthNumber);
      setSelectedMonth(monthName);
    }
  }, [setSelectedMonth]);

  const setSelectedYear = useCallback((year: number) => {
    if (!isNaN(year) && year >= 2000 && year <= 2100) {
      setSelectedYearState(year);
      try {
        localStorage.setItem(STORAGE_KEY_YEAR, year.toString());
      } catch {
        // ignore
      }
    }
  }, []);

  const selectedMonthNumber = useMemo(() => {
    return getMonthNumberFromName(selectedMonth);
  }, [selectedMonth]);

  const daysInSelectedMonth = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonthNumber);
  }, [selectedYear, selectedMonthNumber]);

  const availableYears = useMemo(() => {
    return [
      currentRealYear - 2,
      currentRealYear - 1,
      currentRealYear,
      currentRealYear + 1,
      currentRealYear + 2,
    ];
  }, [currentRealYear]);

  const constructDateForSelectedMonth = useCallback(
    (day: number | string) => {
      return constructIsoDate(selectedYear, selectedMonthNumber, day);
    },
    [selectedYear, selectedMonthNumber]
  );

  const value = useMemo(
    () => ({
      selectedMonth,
      selectedMonthNumber,
      selectedYear,
      buddhistYear: toBuddhistYear(selectedYear),
      setSelectedMonth,
      setSelectedMonthNumber,
      setSelectedYear,
      availableYears,
      daysInSelectedMonth,
      constructDateForSelectedMonth,
    }),
    [
      selectedMonth,
      selectedMonthNumber,
      selectedYear,
      setSelectedMonth,
      setSelectedMonthNumber,
      setSelectedYear,
      availableYears,
      daysInSelectedMonth,
      constructDateForSelectedMonth,
    ]
  );

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
};

export function useMonth(): MonthContextValue {
  const context = useContext(MonthContext);
  if (!context) {
    throw new Error('useMonth must be used within a MonthProvider');
  }
  return context;
}
