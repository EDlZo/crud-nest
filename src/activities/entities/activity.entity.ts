export class Activity {
  id?: string;
  ownerUserId: string;
  ownerEmail?: string;
  type: 'task' | 'call' | 'email' | 'meeting' | 'note';
  title: string;
  description?: string;
  relatedTo?: 'company' | 'contact' | 'deal'; // เกี่ยวข้องกับอะไร
  relatedId?: string; // ID ของ company/contact/deal
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  completedAt?: string;
  assignedTo?: string; // userId ที่รับผิดชอบ
  assignedToEmail?: string;
  createdAt?: string;
  updatedAt?: string;
  updatedByEmail?: string;
}

