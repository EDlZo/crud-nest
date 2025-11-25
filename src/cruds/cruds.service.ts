import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCrudDto } from './dto/create-crud.dto';
import { UpdateCrudDto } from './dto/update-crud.dto';
import { db } from '../firebase.config';
import { Crud } from './entities/crud.entity';

type AuthUser = {
  userId: string;
  email: string;
};

type CrudDocument = Omit<Crud, 'id'>;

@Injectable()
export class CrudsService {
  private readonly collection =
    db.collection(process.env.FIREBASE_COLLECTION ?? 'contacts');

  async create(createCrudDto: CreateCrudDto, user: AuthUser): Promise<Crud> {
    const timestamp = new Date().toISOString();
    const payload: CrudDocument = {
      ...createCrudDto,
      createdAt: timestamp,
      updatedAt: timestamp,
      userId: user.userId,
    };
    const docRef = await this.collection.add(payload);
    return { id: docRef.id, ...payload };
  }

  async findAll(): Promise<Crud[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...(doc.data() as CrudDocument),
        }) as Crud,
    );
  }

  async findOne(id: string): Promise<Crud> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`ไม่พบข้อมูล id ${id}`);
    }
    return { id: doc.id, ...(doc.data() as CrudDocument) };
  }

  async update(id: string, updateCrudDto: UpdateCrudDto, user: AuthUser): Promise<Crud> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`ไม่พบข้อมูล id ${id}`);
    }
    const timestamp = new Date().toISOString();
    const existing = doc.data() as CrudDocument;
    if (existing.userId && existing.userId !== user.userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
    }
    const payload: CrudDocument = {
      ...existing,
      ...updateCrudDto,
      updatedAt: timestamp,
      userId: existing.userId ?? user.userId,
    };
    await docRef.set(payload);
    return { id, ...payload };
  }

  async remove(id: string, user: AuthUser): Promise<{ id: string }> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`ไม่พบข้อมูล id ${id}`);
    }
    const existing = doc.data() as CrudDocument;
    if (existing.userId && existing.userId !== user.userId) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบข้อมูลนี้');
    }
    await docRef.delete();
    return { id };
  }
}
