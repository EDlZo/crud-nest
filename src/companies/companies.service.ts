import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { db } from '../firebase.config';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company } from './entities/company.entity';
import { FieldValue } from 'firebase-admin/firestore';

type AuthUser = { userId: string; email?: string; role?: string };

@Injectable()
export class CompaniesService {
  private readonly collection = db.collection(process.env.FIREBASE_COMPANIES_COLLECTION ?? 'companies');

  async create(dto: CreateCompanyDto, user: AuthUser): Promise<Company> {
    const timestamp = new Date().toISOString();
    const payload: any = {
      ...dto,
      ownerUserId: user.userId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const ref = await this.collection.add(payload);
    return { id: ref.id, ...payload } as Company;
  }

  async findAll(user?: AuthUser): Promise<Company[]> {
    // admin/superadmin see all
    if (user?.role === 'superadmin' || user?.role === 'admin') {
      const snap = await this.collection.orderBy('updatedAt', 'desc').get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Company));
    }
    // otherwise, return companies owned by the user
    if (!user) return [];
    const snap = await this.collection.where('ownerUserId', '==', user.userId).orderBy('updatedAt', 'desc').get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Company));
  }

  async findOne(id: string, user?: AuthUser): Promise<Company> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) throw new NotFoundException('Company not found');
    const data = doc.data() as any;
    // if not owner and not admin, deny
    if (user && user.role !== 'admin' && user.role !== 'superadmin' && data.ownerUserId !== user.userId) {
      throw new ForbiddenException('Forbidden resource');
    }
    return { id: doc.id, ...data } as Company;
  }

  async update(id: string, dto: UpdateCompanyDto, user: AuthUser): Promise<Company> {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Company not found');
    const data = doc.data() as any;
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้');
    }
    const timestamp = new Date().toISOString();
    const merged = { ...data, ...dto, updatedAt: timestamp };
    await docRef.set(merged, { merge: true });
    return { id, ...(merged as any) } as Company;
  }

  async remove(id: string, user: AuthUser) {
    const docRef = this.collection.doc(id);
    const doc = await docRef.get();
    if (!doc.exists) throw new NotFoundException('Company not found');
    const data = doc.data() as any;
    if (data.ownerUserId !== user.userId && user.role !== 'admin' && user.role !== 'superadmin') {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ลบข้อมูลนี้');
    }
    await docRef.delete();
    return { id };
  }
}
