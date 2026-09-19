/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useCallback } from 'react';
import { Layout, NavSection } from './components/Layout';
import { DashboardPage } from './pages/DashboardPage';
import { PurchaseTaxPage } from './pages/PurchaseTaxPage';
import { SalesTaxPage } from './pages/SalesTaxPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { CustomersPage } from './pages/CustomersPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { SystemTestPage } from './pages/SystemTestPage';
import { NotificationToast, ToastMessage } from './components/NotificationToast';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('dashboard');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      const newToast: ToastMessage = {
        id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        message,
      };
      setToasts((prev) => [...prev, newToast]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <Layout currentSection={currentSection} onSelectSection={setCurrentSection}>
      {currentSection === 'dashboard' && (
        <DashboardPage onNavigate={setCurrentSection} />
      )}
      {currentSection === 'purchase' && (
        <PurchaseTaxPage onShowToast={showToast} />
      )}
      {currentSection === 'sales' && (
        <SalesTaxPage onShowToast={showToast} />
      )}
      {currentSection === 'suppliers' && (
        <SuppliersPage onShowToast={showToast} />
      )}
      {currentSection === 'customers' && (
        <CustomersPage onShowToast={showToast} />
      )}
      {currentSection === 'reports' && (
        <ReportsPage onShowToast={showToast} />
      )}
      {(currentSection === 'settings' || currentSection === 'backup') && (
        <SettingsPage onShowToast={showToast} />
      )}
      {currentSection === 'system-test' && <SystemTestPage />}

      <NotificationToast toasts={toasts} onDismiss={dismissToast} />
    </Layout>
  );
}
