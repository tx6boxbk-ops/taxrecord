import { saveBusinessSettings } from '../services/settingsService';
import { createSupplier } from '../services/supplierService';
import { createCustomer } from '../services/customerService';
import { createPurchaseTaxRecord, createSalesTaxRecord } from '../services/taxService';

export async function seedSampleData(): Promise<void> {
  // 1. Business Profile
  await saveBusinessSettings({
    businessName: 'บริษัท สยามดิจิทัล โซลูชั่นส์ จำกัด',
    legalName: 'บริษัท สยามดิจิทัล โซลูชั่นส์ จำกัด',
    taxpayerId: '0105558012349',
    branchType: 'HEAD',
    branchNumber: '00000',
    address: '123/45 ถนนสุขุมวิท แขวงคลองเตยเหนือ เขตวัฒนา กรุงเทพมหานคร 10110',
    phone: '02-714-8899',
    vatRate: 7,
  });

  // 2. Suppliers
  const sup1 = await createSupplier({
    displayName: 'บริษัท ออฟฟิศเมท (ไทย) จำกัด',
    legalName: 'บริษัท ออฟฟิศเมท (ไทย) จำกัด',
    taxpayerId: '0105539000128',
    headOffice: true,
    branchNumber: '00000',
    address: 'อาคารวิชาญพานิชย์ 24 ถนนสีลม บางรัก กรุงเทพฯ',
    phone: '02-739-5555',
    note: 'จัดซื้อเครื่องเขียน อุปกรณ์สำนักงาน',
  });

  const sup2 = await createSupplier({
    displayName: 'บริษัท ทรู อินเทอร์เน็ต คอร์ปอเรชั่น จำกัด',
    legalName: 'บริษัท ทรู อินเทอร์เน็ต คอร์ปอเรชั่น จำกัด',
    taxpayerId: '0105541000458',
    headOffice: false,
    branchNumber: '00003',
    address: '18 อาคารทรู ทาวเวอร์ ถนนรัชดาภิเษก ห้วยขวาง กรุงเทพฯ',
    phone: '02-699-1000',
    note: 'ค่าบริการอินเทอร์เน็ตไฟเบอร์ออฟฟิศ',
  });

  const sup3 = await createSupplier({
    displayName: 'บริษัท แอดวานซ์ ไวร์เลส เน็ทเวอร์ค จำกัด',
    legalName: 'บริษัท แอดวานซ์ ไวร์เลส เน็ทเวอร์ค จำกัด',
    taxpayerId: '0105548000780',
    headOffice: true,
    branchNumber: '00000',
    address: '414 ถนนพหลโยธิน แขวงสามเสนใน เขตพญาไท กรุงเทพฯ',
    phone: '02-029-5000',
    note: 'ค่าโทรศัพท์องค์กร',
  });

  // 3. Customers
  const cust1 = await createCustomer({
    displayName: 'บริษัท กรุงเทพ ซอฟต์แวร์ เฮ้าส์ จำกัด',
    legalName: 'บริษัท กรุงเทพ ซอฟต์แวร์ เฮ้าส์ จำกัด',
    taxpayerId: '0105560000441',
    headOffice: true,
    branchNumber: '00000',
    address: '99/1 ซอยอารีย์ พญาไท กรุงเทพฯ',
    phone: '02-279-9999',
    note: 'ลูกค้าสัญญารายปี บริการพัฒนาระบบคลาวด์',
  });

  const cust2 = await createCustomer({
    displayName: 'บริษัท สยาม พรีเมียม รีเทล จำกัด',
    legalName: 'บริษัท สยาม พรีเมียม รีเทล จำกัด',
    taxpayerId: '0105559000557',
    headOffice: false,
    branchNumber: '00002',
    address: '888 ถนนพระราม 1 ปทุมวัน กรุงเทพฯ',
    phone: '02-658-1000',
    note: 'ลูกค้าระบบจัดการจุดขาย POS',
  });

  // 4. Sample Purchase Records (2026)
  const purchasesData = [
    {
      date: '2026-01-08',
      book: '01',
      inv: 'OFM-690101',
      sup: sup1,
      taxable: 4500,
      note: 'กระดาษพิมพ์เอกสารและหมึกพิมพ์',
    },
    {
      date: '2026-01-15',
      book: '01',
      inv: 'TRU-690122',
      sup: sup2,
      taxable: 2990,
      note: 'ค่าบริการอินเทอร์เน็ตประจำเดือน ม.ค.',
    },
    {
      date: '2026-02-05',
      book: '01',
      inv: 'OFM-690204',
      sup: sup1,
      taxable: 1850,
      note: 'เก้าอี้สำนักงานและแฟ้มใส่เอกสาร',
    },
    {
      date: '2026-02-16',
      book: '01',
      inv: 'TRU-690220',
      sup: sup2,
      taxable: 2990,
      note: 'ค่าบริการอินเทอร์เน็ตประจำเดือน ก.พ.',
    },
    {
      date: '2026-03-02',
      book: '02',
      inv: 'AWN-690301',
      sup: sup3,
      taxable: 5400,
      note: 'ซิมการ์ดและแพ็กเกจโทรศัพท์ทีมงาน',
    },
    {
      date: '2026-03-15',
      book: '02',
      inv: 'TRU-690325',
      sup: sup2,
      taxable: 2990,
      note: 'ค่าบริการอินเทอร์เน็ตประจำเดือน มี.ค.',
    },
  ];

  for (const p of purchasesData) {
    await createPurchaseTaxRecord({
      taxDate: p.date,
      invoiceBookNumber: p.book,
      invoiceNumber: p.inv,
      supplierId: p.sup.id,
      supplierNameSnapshot: p.sup.legalName || p.sup.displayName,
      supplierTaxpayerIdSnapshot: p.sup.taxpayerId,
      supplierBranchTypeSnapshot: p.sup.headOffice ? 'HEAD' : 'BRANCH',
      supplierBranchNumberSnapshot: p.sup.branchNumber,
      taxableAmount: p.taxable,
      vatRate: 7,
      note: p.note,
    });
  }

  // 5. Sample Sales Records (2026)
  const salesData = [
    {
      date: '2026-01-10',
      book: 'IV',
      inv: 'INV-2026-001',
      cust: cust1,
      taxable: 45000,
      note: 'ค่าบริการบำรุงรักษาระบบซอฟต์แวร์ งวดที่ 1',
    },
    {
      date: '2026-01-25',
      book: 'IV',
      inv: 'INV-2026-002',
      cust: cust2,
      taxable: 28000,
      note: 'ค่าบริการตั้งค่าระบบเชื่อมต่อ API',
    },
    {
      date: '2026-02-10',
      book: 'IV',
      inv: 'INV-2026-003',
      cust: cust1,
      taxable: 45000,
      note: 'ค่าบริการบำรุงรักษาระบบซอฟต์แวร์ งวดที่ 2',
    },
    {
      date: '2026-02-28',
      book: 'IV',
      inv: 'INV-2026-004',
      cust: cust2,
      taxable: 35000,
      note: 'ค่าออกแบบรายงานสถิติยอดขาย',
    },
    {
      date: '2026-03-10',
      book: 'IV',
      inv: 'INV-2026-005',
      cust: cust1,
      taxable: 45000,
      note: 'ค่าบริการบำรุงรักษาระบบซอฟต์แวร์ งวดที่ 3',
    },
  ];

  for (const s of salesData) {
    await createSalesTaxRecord({
      taxDate: s.date,
      invoiceBookNumber: s.book,
      invoiceNumber: s.inv,
      customerId: s.cust.id,
      customerNameSnapshot: s.cust.legalName || s.cust.displayName,
      customerTaxpayerIdSnapshot: s.cust.taxpayerId,
      customerBranchTypeSnapshot: s.cust.headOffice ? 'HEAD' : 'BRANCH',
      customerBranchNumberSnapshot: s.cust.branchNumber,
      taxableAmount: s.taxable,
      vatRate: 7,
      note: s.note,
    });
  }
}
