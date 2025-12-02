import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../firebase.config';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Note } from './entities/note.entity';

type AuthUser = { userId: string; email?: string; role?: string };

@Injectable()
export class NotesService {
  private readonly collection = db.collection(process.env.FIREBASE_NOTES_COLLECTION ?? 'notes');

  async create(dto: CreateNoteDto, user: AuthUser): Promise<Note> {
    try {
      const timestamp = new Date().toISOString();
      const payload: any = {
        ...dto,
        ownerUserId: user.userId,
        ownerEmail: user.email ?? undefined,
        isPrivate: dto.isPrivate ?? true,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedByEmail: user.email ?? undefined,
      };
      
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      const ref = await this.collection.add(payload);
      return { id: ref.id, ...payload } as Note;
    } catch (err) {
      console.error('NotesService.create error:', err);
      throw err;
    }
  }

  async findAll(user?: AuthUser, filters?: { relatedTo?: string; relatedId?: string }): Promise<Note[]> {
    try {
      let query: FirebaseFirestore.Query = this.collection;
      
      // Admin/superadmin see all non-private notes, others see only their own or shared notes
      if (user?.role !== 'superadmin' && user?.role !== 'admin') {
        if (!user) return [];
        // Show own notes or non-private notes
        query = query.where('ownerUserId', '==', user.userId);
      }
      
      // Apply filters
      if (filters?.relatedTo && filters?.relatedId) {
        query = query.where('relatedTo', '==', filters.relatedTo)
                     .where('relatedId', '==', filters.relatedId);
      }
      
      const snap = await query.orderBy('createdAt', 'desc').get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Note));
    } catch (err) {
      console.error('NotesService.findAll error:', err);
      throw err;
    }
  }

  async findOne(id: string, user?: AuthUser): Promise<Note> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) throw new NotFoundException('Note not found');
    const data = doc.data() as any;
    
    // Check if user can access (owner, admin, or non-private)
    if (user && user.role !== 'admin' && user.role !== 'superadmin') {
      if (data.ownerUserId !== user.userId && data.isPrivate) {
        throw new ForbiddenException('Forbidden resource');
      }
    }
    
    return { id: doc.id, ...data } as Note;
  }

  async update(id: string, dto: UpdateNoteDto, user: AuthUser): Promise<Note> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Note not found');
    const data = doc.data() as any;
    
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to edit this note');
    }
    
    const timestamp = new Date().toISOString();
    const merged: any = { 
      ...data, 
      ...dto, 
      updatedAt: timestamp,
      updatedByEmail: user.email ?? undefined,
    };
    
    Object.keys(merged).forEach(key => merged[key] === undefined && delete merged[key]);
    await docRef.set(merged, { merge: true });
    return { id, ...(merged as any) } as Note;
  }

  async remove(id: string, user: AuthUser) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Note not found');
    const data = doc.data() as any;
    
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('You do not have permission to delete this note');
    }
    
    await docRef.delete();
    return { id };
  }
}

