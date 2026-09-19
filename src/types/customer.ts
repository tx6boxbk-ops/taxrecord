export interface Customer {
  id: string;
  displayName: string; // ชื่อที่แสดง
  legalName: string; // ชื่อนิติบุคคล / ชื่อผู้ซื้อ
  taxpayerId: string; // เลขประจำตัวผู้เสียภาษี 13 หลัก (String)
  headOffice: boolean; // true = สำนักงานใหญ่, false = สาขา
  branchNumber: string; // เลขที่สาขา (เช่น '00000')
  address: string;
  phone: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}
