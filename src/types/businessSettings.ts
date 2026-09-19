export interface BusinessSettings {
  id: string; // e.g. 'default_business'
  businessName: string; // ชื่อผู้ประกอบการ / ชื่อสถานประกอบการ
  legalName?: string; // ชื่อตามแบบ ภ.พ.20
  taxpayerId: string; // เลขประจำตัวผู้เสียภาษี 13 หลัก (String เพื่อคงเลข 0 ด้านหน้า)
  branchType: 'HEAD' | 'BRANCH'; // สำนักงานใหญ่ หรือ สาขา
  branchNumber: string; // เลขที่สาขา (เช่น '00000', '00001')
  address: string; // ที่อยู่
  phone: string; // เบอร์โทรศัพท์
  vatRate: number; // อัตรา VAT เริ่มต้น (เช่น 7)
  createdAt: string; // ISO Date string
  updatedAt: string; // ISO Date string
}
