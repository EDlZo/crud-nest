export class Note {
  id?: string;
  ownerUserId: string;
  ownerEmail?: string;
  title: string;
  content: string;
  relatedTo: 'company' | 'contact' | 'deal' | 'activity';
  relatedId: string; // ID ของ company/contact/deal/activity
  tags?: string[];
  isPrivate?: boolean; // หมายเหตุส่วนตัวหรือแชร์กับทีม
  createdAt?: string;
  updatedAt?: string;
  updatedByEmail?: string;
}

