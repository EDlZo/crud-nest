import { CreateCrudDto } from './dto/create-crud.dto';
import { UpdateCrudDto } from './dto/update-crud.dto';
import { db } from '../firebase.config';
import { Crud } from './entities/crud.entity';
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class CrudsService {
  private readonly collection =
    db.collection(process.env.FIREBASE_COLLECTION ?? 'contacts');

  async create(createCrudDto: CreateCrudDto): Promise<Crud> {
    const timestamp = new Date().toISOString();
    const payload: Omit<Crud, 'id'> = {
      ...createCrudDto,
      createdAt: timestamp,
      updatedAt: timestamp,
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
          ...(doc.data() as Omit<Crud, 'id'>),
        }) as Crud,
    );
  }

  async findOne(id: string): Promise<Crud> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`ไม่พบข้อมูล id ${id}`);
    }
    return { id: doc.id, ...(doc.data() as Omit<Crud, 'id'>) };
  }

  async update(id: string, updateCrudDto: UpdateCrudDto): Promise<Crud> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`ไม่พบข้อมูล id ${id}`);
    }
    const timestamp = new Date().toISOString();
    const existing = doc.data() as Omit<Crud, 'id'>;
    const payload = {
      ...existing,
      ...updateCrudDto,
      updatedAt: timestamp,
    };
    await docRef.set(payload);
    return { id, ...payload };
  }

  async remove(id: string): Promise<{ id: string }> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) {
      throw new NotFoundException(`ไม่พบข้อมูล id ${id}`);
    }
    await docRef.delete();
    return { id };
  }
}
