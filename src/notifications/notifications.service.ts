import { Injectable, Logger } from '@nestjs/common';
import { db } from '../firebase.config';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly collection = db.collection(process.env.FIREBASE_NOTIFICATIONS_COLLECTION ?? 'notifications');

  async create(item: { toEmail: string; title: string; body?: string; data?: any; createdAt?: string; read?: boolean }) {
    const payload = {
      toEmail: item.toEmail,
      title: item.title,
      body: item.body || '',
      data: item.data || null,
      read: item.read ? true : false,
      createdAt: item.createdAt || new Date().toISOString(),
    } as any;
    const ref = await this.collection.add(payload);
    return { id: ref.id, ...payload };
  }

  async findForEmail(email: string, limit = 50) {
    try {
      const snap = await this.collection.where('toEmail', '==', email).orderBy('createdAt', 'desc').limit(limit).get();
      return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    } catch (err) {
      this.logger.error('Failed to fetch notifications for', email, err);
      return [];
    }
  }

  async markRead(id: string) {
    try {
      await this.collection.doc(id).update({ read: true, readAt: new Date().toISOString() });
      return { ok: true };
    } catch (err) {
      this.logger.error('Failed to mark notification read', err);
      throw err;
    }
  }
}
