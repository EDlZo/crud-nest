export class Company {
  id?: string;
  ownerUserId: string;
  ownerEmail?: string;
  type?: 'individual' | 'company';
  name: string;
  address?: string;
  zipcode?: string;
  province?: string;
  amphoe?: string;
  tambon?: string;
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
  subscription?: {
    planId?: string;
    planName?: string;
    status?: 'active' | 'trialing' | 'past_due' | 'canceled';
    interval?: 'monthly' | 'yearly' | 'quarterly';
    amount?: number;
    startDate?: string;
    nextBillingDate?: string;
    autoRenew?: boolean;
  };
}
