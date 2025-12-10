export class Company {
  id?: string;
  ownerUserId: string;
  ownerEmail?: string;
  type?: 'individual' | 'company';
  name: string;
  address?: string;
  phone?: string;
  fax?: string;
  taxId?: string;
  branchName?: string;
  branchNumber?: string;
  billingDate?: string; // วันที่ครบกำหนดชำระ (เช่น "15" = วันที่ 15 ของเดือน)
  notificationDate?: string; // วันที่แจ้งเตือนล่วงหน้า
  billingCycle?: 'monthly' | 'yearly' | 'quarterly';
  socials?: Record<string, string>;
  avatarUrl?: string;
  contacts?: string[];
  createdAt?: string;
  updatedAt?: string;
  updatedByEmail?: string;
  amountDue?: number;
  services?: { name: string; amount: number }[];
}
