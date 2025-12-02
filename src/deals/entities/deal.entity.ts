export class Deal {
  id?: string;
  ownerUserId: string;
  ownerEmail?: string;
  title: string;
  description?: string;
  amount?: number; // วงเงิน
  currency?: string; // สกุลเงิน
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost'; // Pipeline stage
  probability?: number; // โอกาสปิด (0-100)
  expectedCloseDate?: string; // วันที่คาดว่าจะปิด
  actualCloseDate?: string; // วันที่ปิดจริง
  relatedTo?: 'company' | 'contact'; // เกี่ยวข้องกับ
  relatedId?: string; // ID ของ company/contact
  assignedTo?: string; // userId ที่รับผิดชอบ
  assignedToEmail?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  updatedByEmail?: string;
}

