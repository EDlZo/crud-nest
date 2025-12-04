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
    try {
      console.log('ActivitiesService.create - user:', { userId: user.userId, email: user.email, role: user.role });
      console.log('ActivitiesService.create - dto:', dto);
    const timestamp = new Date().toISOString();
    const payload: any = {
      ...dto,
      ownerUserId: user.userId,
      ownerEmail: user.email ?? undefined,
      createdAt: timestamp,
      updatedAt: timestamp,
      updatedByEmail: user.email ?? undefined,
    };

    // If client provided an assignedTo id but not the email, look up the user's email
    try {
      const usersCollection = db.collection(process.env.FIREBASE_USERS_COLLECTION ?? 'users');
      if (dto && typeof (dto as any).assignedTo === 'string' && !(dto as any).assignedToEmail) {
        const assignedDoc = await usersCollection.doc((dto as any).assignedTo).get();
        if (assignedDoc.exists) {
          const udata = assignedDoc.data() as any;
          if (udata?.email) payload.assignedToEmail = udata.email;
        }
      }
    } catch (lookupErr) {
      console.warn('ActivitiesService.create - unable to lookup assigned user email', lookupErr);
    }
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);
      console.log('ActivitiesService.create - payload:', payload);
      console.log('ActivitiesService.create - collection:', this.collection.path);
    const ref = await this.collection.add(payload);
      const created = { id: ref.id, ...(payload as any) } as Activity;
      console.log('ActivitiesService.create - created activity:', created);
      return created;
    } catch (err) {
      console.error('ActivitiesService.create error:', err);
      throw err;
    }
  }

  async findAll(user?: AuthUser): Promise<Activity[]> {
    try {
      console.log('ActivitiesService.findAll - user:', user);
    // Return all activities for any authenticated user so lists appear the same across roles
      if (!user) {
        console.log('ActivitiesService.findAll - no user, returning empty array');
        return [];
      }
      console.log('ActivitiesService.findAll - collection:', this.collection.path);
    const snap = await this.collection.orderBy('updatedAt', 'desc').get();
    const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Activity));
      console.log('ActivitiesService.findAll - found', all.length, 'activities');
    return all;
    } catch (err) {
      console.error('ActivitiesService.findAll error:', err);
      throw err;
    }
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

    // If an assignedTo was provided in the update but assignedToEmail is missing, try to resolve it
    try {
      const usersCollection = db.collection(process.env.FIREBASE_USERS_COLLECTION ?? 'users');
      if (dto && typeof (dto as any).assignedTo === 'string' && !(dto as any).assignedToEmail) {
        const assignedDoc = await usersCollection.doc((dto as any).assignedTo).get();
        if (assignedDoc.exists) {
          const udata = assignedDoc.data() as any;
          if (udata?.email) merged.assignedToEmail = udata.email;
        }
      }
    } catch (lookupErr) {
      console.warn('ActivitiesService.update - unable to lookup assigned user email', lookupErr);
    }
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
