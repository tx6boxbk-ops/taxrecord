export interface InvoiceNumberConfig {
  id: string; // e.g. "sales_2026_8"
  type: 'SALES' | 'PURCHASE';
  year: number; // Gregorian year e.g. 2026
  month: number; // 1-12
  startNumber: string; // e.g. "TK005"
  lastUsedNumber?: string; // e.g. "TK020"
  highestNumber?: string; // highest number ever used in this period
  prefix?: string; // e.g. "TK"
  padLength?: number; // e.g. 3
  updatedAt: string;
}

export interface ParsedInvoiceNumber {
  raw: string;
  prefix: string;
  num: number;
  padLength: number;
  hasDigits: boolean;
}
