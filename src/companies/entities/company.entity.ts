export class Company {
  id?: string;
  ownerUserId: string;
  ownerEmail?: string;
  type: 'individual' | 'company'; // บุคคล หรือ นิติบุคคล
  name: string;
  address?: string;
  phone?: string;
  fax?: string;
  taxId?: string;
  branchName?: string; // สำหรับนิติบุคคลเท่านั้น
  branchNumber?: string; // สำหรับนิติบุคคลเท่านั้น
  billingDate?: string; // วันที่เรียกเก็บเงิน (เช่น วันที่ 5 ของทุกเดือน)
  notificationDate?: string; // วันที่แจ้งเตือนล่วงหน้า (เช่น วันที่ 1 ของทุกเดือน)
  billingCycle?: 'monthly' | 'yearly' | 'quarterly'; // รอบการจ่าย
  socials?: Record<string, string>;
  avatarUrl?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedByEmail?: string;
}
