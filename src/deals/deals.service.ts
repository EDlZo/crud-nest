import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { db } from '../firebase.config';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { Deal } from './entities/deal.entity';

type AuthUser = { userId: string; email?: string; role?: string };

@Injectable()
export class DealsService {
  private readonly collection = db.collection(process.env.FIREBASE_DEALS_COLLECTION ?? 'deals');

  async create(dto: CreateDealDto, user: AuthUser): Promise<Deal> {
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
    return { id: ref.id, ...(payload as any) } as Deal;
  }

  async findAll(user?: AuthUser): Promise<Deal[]> {
    // Return all deals for any authenticated user so lists appear the same across roles
    if (!user) return [];
    const snap = await this.collection.orderBy('updatedAt', 'desc').get();
    const all = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Deal));
    return all;
  }

  async findOne(id: string, user?: AuthUser): Promise<Deal> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) throw new NotFoundException('Deal not found');
    const data = doc.data() as any;
    if (user && user.role !== 'admin' && user.role !== 'superadmin' && data.ownerUserId !== user.userId) {
      throw new ForbiddenException('Forbidden resource');
    }
    return { id: doc.id, ...data } as Deal;
  }

  async update(id: string, dto: UpdateDealDto, user: AuthUser): Promise<Deal> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Deal not found');
    const data = doc.data() as any;
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
    }
    const timestamp = new Date().toISOString();
    const merged = { ...data, ...dto, updatedAt: timestamp, updatedByEmail: user.email ?? undefined };
    Object.keys(merged).forEach((k) => merged[k] === undefined && delete merged[k]);
    await docRef.set(merged, { merge: true });
    return { id, ...(merged as any) } as Deal;
  }

  async remove(id: string, user: AuthUser) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Deal not found');
    const data = doc.data() as any;
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบข้อมูลนี้');
    }
    await docRef.delete();
    return { id };
  }
}
