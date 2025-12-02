import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../firebase.config';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { Activity } from './entities/activity.entity';

type AuthUser = { userId: string; email?: string; role?: string };

@Injectable()
export class ActivitiesService {
  private readonly collection = db.collection(process.env.FIREBASE_ACTIVITIES_COLLECTION ?? 'activities');

  async create(dto: CreateActivityDto, user: AuthUser): Promise<Activity> {
    const timestamp = new Date().toISOString();
    const payload: any = {
      ...dto,
      ownerUserId: user.userId,
      ownerEmail: user.email ?? undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      updatedByEmail: user.email ?? undefined,
    };
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
    const ref = await this.collection.add(payload);
    return { id: ref.id, ...(payload as any) } as Activity;
  }

  async findAll(user?: AuthUser): Promise<Activity[]> {
    if (user?.role === 'superadmin' || user?.role === 'admin') {
      const snap = await this.collection.orderBy('updatedAt', 'desc').get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Activity));
    }

    if (!user) return [];
    const snap = await this.collection.get();
    const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Activity));
    const filtered = all.filter((a) => a.ownerUserId === user.userId || a.ownerUserId === undefined);
    return filtered.sort((a, b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : 0) - (a.updatedAt ? new Date(a.updatedAt).getTime() : 0));
  }

  async findOne(id: string, user?: AuthUser): Promise<Activity> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) throw new NotFoundException('Activity not found');
    const data = doc.data() as any;
    if (user && user.role !== 'admin' && user.role !== 'superadmin' && data.ownerUserId !== user.userId) {
      throw new ForbiddenException('Forbidden resource');
    }
    return { id: doc.id, ...data } as Activity;
  }

  async update(id: string, dto: UpdateActivityDto, user: AuthUser): Promise<Activity> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Activity not found');
    const data = doc.data() as any;
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
    }
    const timestamp = new Date().toISOString();
    const merged = { ...data, ...dto, updatedAt: timestamp, updatedByEmail: user.email ?? undefined };
    Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);
    await docRef.set(merged, { merge: true });
    return { id, ...(merged as any) } as Activity;
  }

  async remove(id: string, user: AuthUser) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Activity not found');
    const data = doc.data() as any;
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบข้อมูลนี้');
    }
    await docRef.delete();
    return { id };
  }
}
