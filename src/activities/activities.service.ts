import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../firebase.config';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { Activity } from './entities/activity.entity';
import { FieldValue } from 'firebase-admin/firestore';

type AuthUser = { userId: string; email?: string; role?: string };

@Injectable()
export class ActivitiesService {
  private readonly collection = db.collection(process.env.FIREBASE_ACTIVITIES_COLLECTION ?? 'activities');

  async create(dto: CreateActivityDto, user: AuthUser): Promise<Activity> {
    try {
      const timestamp = new Date().toISOString();
      const payload: any = {
        ...dto,
        ownerUserId: user.userId,
        ownerEmail: user.email ?? undefined,
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
      return { id: ref.id, ...payload } as Activity;
    } catch (err) {
      console.error('ActivitiesService.create error:', err);
      throw err;
    }
  }

  async findAll(user?: AuthUser, filters?: { type?: string; status?: string; relatedTo?: string; relatedId?: string }): Promise<Activity[]> {
    try {
      const enforceOwnership = process.env.FIRESTORE_ENFORCE_OWNERSHIP === 'true';
      const isPrivileged = user?.role === 'admin' || user?.role === 'superadmin';
      let query: FirebaseFirestore.Query = this.collection;
      
      // Scope data by owner only when enforcement is enabled and the user is not privileged
      if (enforceOwnership && !isPrivileged) {
        if (!user) return [];
        // Prefer matching by userId when available, otherwise fall back to ownerEmail
        if (user.userId) {
          query = query.where('ownerUserId', '==', user.userId);
        } else if (user.email) {
          query = query.where('ownerEmail', '==', user.email);
        } else {
          return [];
        }
      }
      
      // Apply filters
      if (filters?.type) {
        query = query.where('type', '==', filters.type);
      }
      if (filters?.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters?.relatedTo && filters?.relatedId) {
        query = query.where('relatedTo', '==', filters.relatedTo)
                     .where('relatedId', '==', filters.relatedId);
      }
      
      const disableOrder = process.env.FIRESTORE_DISABLE_ORDERBY === 'true';
      const snap = !disableOrder && isPrivileged
        ? await query.orderBy('createdAt', 'desc').get()
        : await query.get();

      const activities = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Activity));
      if (!isPrivileged) {
        activities.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
      return activities;
    } catch (err: any) {
      console.error('ActivitiesService.findAll error:', err);
      // Firestore returns code 9 (FAILED_PRECONDITION) when a composite index is required.
      // Surface a friendlier BadRequestException so the HTTP response contains the console link.
      if (err && (err.code === 9 || (typeof err.message === 'string' && err.message.includes('requires an index')))) {
        throw new BadRequestException(err.message || 'Firestore index required for this query');
      }
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
    // Allow owner, assigned user, or admins to update
    const isOwner = (data.ownerUserId && user.userId && data.ownerUserId === user.userId)
      || (data.ownerEmail && user.email && data.ownerEmail === user.email);
    const isAssigned = data.assignedTo === user.userId || (data.assignedToEmail && user.email && data.assignedToEmail === user.email);
    const isAdmin = user.role === 'admin' || user.role === 'superadmin';
    if (!isOwner && !isAssigned && !isAdmin) {
      throw new ForbiddenException('You do not have permission to edit this activity');
    }
    
    const timestamp = new Date().toISOString();
    const merged: any = { 
      ...data, 
      ...dto, 
      updatedAt: timestamp,
      updatedByEmail: user.email ?? undefined,
    };
    
    // Handle status change to completed
    if (dto.status === 'completed' && data.status !== 'completed') {
      merged.completedAt = timestamp;
    } else if (dto.status !== 'completed' && data.status === 'completed') {
      merged.completedAt = FieldValue.delete();
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
    return { id, ...(merged as any) } as Activity;
  }

  async remove(id: string, user: AuthUser) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Activity not found');
    const data = doc.data() as any;
    // Allow owner, assigned user, or admins to delete
    const isOwnerDel = (data.ownerUserId && user.userId && data.ownerUserId === user.userId)
      || (data.ownerEmail && user.email && data.ownerEmail === user.email);
    const isAssignedDel = data.assignedTo === user.userId || (data.assignedToEmail && user.email && data.assignedToEmail === user.email);
    const isAdminDel = user.role === 'admin' || user.role === 'superadmin';
    if (!isOwnerDel && !isAssignedDel && !isAdminDel) {
      throw new ForbiddenException('You do not have permission to delete this activity');
    }
    
    await docRef.delete();
    return { id };
  }
}

