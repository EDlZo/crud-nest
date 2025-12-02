import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../firebase.config';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { Deal } from './entities/deal.entity';
import { FieldValue } from 'firebase-admin/firestore';

type AuthUser = { userId: string; email?: string; role?: string };

@Injectable()
export class DealsService {
  private readonly collection = db.collection(process.env.FIREBASE_DEALS_COLLECTION ?? 'deals');

  async create(dto: CreateDealDto, user: AuthUser): Promise<Deal> {
    try {
      const timestamp = new Date().toISOString();
      const payload: any = {
        ...dto,
        ownerUserId: user.userId,
        ownerEmail: user.email ?? undefined,
        currency: dto.currency ?? 'THB',
        probability: dto.probability ?? 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedByEmail: user.email ?? undefined,
      };
      
      // If assignedTo is provided, fetch assigned user email
      if (dto.assignedTo) {
        const usersCollection = db.collection(process.env.FIREBASE_USERS_COLLECTION ?? 'users');
        const assignedUserDoc = await usersCollection.doc(dto.assignedTo).get();
        if (assignedUserDoc.exists) {
          payload.assignedToEmail = assignedUserDoc.data()?.email;
        }
      }
      
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      const ref = await this.collection.add(payload);
      return { id: ref.id, ...payload } as Deal;
    } catch (err) {
      console.error('DealsService.create error:', err);
      throw err;
    }
  }

  async findAll(user?: AuthUser, filters?: { stage?: string; relatedTo?: string; relatedId?: string }): Promise<Deal[]> {
    try {
      const enforceOwnership = process.env.FIRESTORE_ENFORCE_OWNERSHIP === 'true';
      const isPrivileged = user?.role === 'admin' || user?.role === 'superadmin';
      let query: FirebaseFirestore.Query = this.collection;
      
      if (enforceOwnership && !isPrivileged) {
        if (!user?.userId) return [];
        query = query.where('ownerUserId', '==', user.userId);
      }
      
      // Apply filters
      if (filters?.stage) {
        query = query.where('stage', '==', filters.stage);
      }
      if (filters?.relatedTo && filters?.relatedId) {
        query = query.where('relatedTo', '==', filters.relatedTo)
                     .where('relatedId', '==', filters.relatedId);
      }
      
      const disableOrder = process.env.FIRESTORE_DISABLE_ORDERBY === 'true';
      const snap = !disableOrder && isPrivileged
        ? await query.orderBy('createdAt', 'desc').get()
        : await query.get();

      const deals = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Deal));
      if (!isPrivileged) {
        deals.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
      return deals;
    } catch (err: any) {
      console.error('DealsService.findAll error:', err);
      if (err && (err.code === 9 || (typeof err.message === 'string' && err.message.includes('requires an index')))) {
        throw new BadRequestException(err.message || 'Firestore index required for this query');
      }
      throw err;
    }
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
      throw new ForbiddenException('You do not have permission to edit this deal');
    }
    
    const timestamp = new Date().toISOString();
    const merged: any = { 
      ...data, 
      ...dto, 
      updatedAt: timestamp,
      updatedByEmail: user.email ?? undefined,
    };
    
    // Handle stage change to won/lost
    if (dto.stage === 'won' || dto.stage === 'lost') {
      if (!data.actualCloseDate) {
        merged.actualCloseDate = timestamp;
      }
    } else if (dto.stage && (dto.stage === 'lead' || dto.stage === 'qualified' || dto.stage === 'proposal' || dto.stage === 'negotiation')) {
      merged.actualCloseDate = FieldValue.delete();
    }
    
    // If assignedTo changed, update assignedToEmail
    if (dto.assignedTo && dto.assignedTo !== data.assignedTo) {
      const usersCollection = db.collection(process.env.FIREBASE_USERS_COLLECTION ?? 'users');
      const assignedUserDoc = await usersCollection.doc(dto.assignedTo).get();
      if (assignedUserDoc.exists) {
        merged.assignedToEmail = assignedUserDoc.data()?.email;
      }
    }
    
    Object.keys(merged).forEach(key => merged[key] === undefined && delete merged[key]);
    await docRef.set(merged, { merge: true });
    return { id, ...(merged as any) } as Deal;
  }

  async remove(id: string, user: AuthUser) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Deal not found');
    const data = doc.data() as any;
    
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to delete this deal');
    }
    
    await docRef.delete();
    return { id };
  }
}

