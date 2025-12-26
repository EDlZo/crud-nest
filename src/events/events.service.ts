import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../firebase.config';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';

type AuthUser = { userId: string; email?: string; role?: string };

@Injectable()
export class EventsService {
  private readonly collection = db.collection(process.env.FIREBASE_EVENTS_COLLECTION ?? 'events');

  async create(dto: CreateEventDto, user: AuthUser): Promise<Event> {
    const timestamp = new Date().toISOString();
    const payload: any = {
      ...dto,
      ownerUserId: user.userId,
      ownerEmail: user.email ?? undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    console.debug('EventsService.create payload before cleanup', payload);
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    console.debug('EventsService.create payload after cleanup', payload);
    const ref = await this.collection.add(payload);
    return { id: ref.id, ...(payload as any) } as Event;
  }

  async findAll(user?: AuthUser): Promise<Event[]> {
    if (!user) return [];
    const snap = await this.collection.orderBy('updatedAt', 'desc').get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Event));
  }

  async findOne(id: string, user?: AuthUser): Promise<Event> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) throw new NotFoundException('Event not found');
    const data = doc.data() as any;
    // allow all authenticated users to read events; implement restrictions if needed
    return { id: doc.id, ...data } as Event;
  }

  async update(id: string, dto: UpdateEventDto, user: AuthUser): Promise<Event> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Event not found');
    const data = doc.data() as any;
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
    }
    const timestamp = new Date().toISOString();
    const merged = { ...data, ...dto, updatedAt: timestamp };
    Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);
    await docRef.set(merged, { merge: true });
    return { id, ...(merged as any) } as Event;
  }

  async remove(id: string, user: AuthUser) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Event not found');
    const data = doc.data() as any;
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบข้อมูลนี้');
    }
    await docRef.delete();
    return { id };
  }

  // bulk replace (best-effort sync from client)
  async bulkReplace(items: any[], user: AuthUser) {
    // simplistic implementation: write each item by id if provided, otherwise add
    const batch = db.batch();
    for (const it of items) {
      if (it.id) {
        const ref = this.collection.doc(it.id);
        const payload = { ...it, updatedAt: new Date().toISOString() };
        batch.set(ref, payload, { merge: true } as any);
      } else {
        const ref = this.collection.doc();
        const payload = { ...it, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        batch.set(ref, payload as any);
      }
    }
    await batch.commit();
    return { ok: true };
  }
}
