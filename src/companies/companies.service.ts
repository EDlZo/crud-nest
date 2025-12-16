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
    try {
      console.log('CompaniesService.create - user:', { userId: user.userId, email: user.email, role: user.role });
      const timestamp = new Date().toISOString();
      const payload: any = {
        ...dto,
        ownerUserId: user.userId,
        ownerEmail: user.email ?? undefined,
        createdAt: timestamp,
        updatedAt: timestamp,
        updatedByEmail: user.email ?? undefined,
      };
      // Remove undefined fields to avoid Firestore issues
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      console.log('CompaniesService.create - payload:', payload);
      const ref = await this.collection.add(payload);
      const created = { id: ref.id, ...payload } as Company;
      console.log('CompaniesService.create - created company:', created);
      return created;
    } catch (err) {
      console.error('CompaniesService.create error:', err);
      throw err;
    }
  }

  async findAll(user?: AuthUser): Promise<Company[]> {
    try {
      console.log('CompaniesService.findAll - user:', { userId: user?.userId, email: user?.email, role: user?.role });

      // For listing, return all companies to any authenticated user so lists look the same across roles.
      // Admin/superadmin still see all (same behavior).
      if (!user) {
        console.log('CompaniesService.findAll - no user provided');
        return [];
      }

      const snap = await this.collection.orderBy('updatedAt', 'desc').get();
      const companies = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Company));
      console.log('CompaniesService.findAll - returning all companies for user', user.userId, 'count:', companies.length);
      return companies;
    } catch (err) {
      console.error('CompaniesService.findAll error:', err);
      throw err;
    }
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
    const merged = {
      ...data,
      ...dto,
      updatedAt: timestamp,
      updatedByEmail: user.email ?? undefined,
    };
    // แปลง services ให้เป็น plain object array (Firestore ไม่รับ instance)
    if (merged.services && Array.isArray(merged.services)) {
      merged.services = merged.services.map((s: any) => ({ name: s.name, amount: s.amount }));
    }
    // แปลง subscription ให้เป็น plain object (เก็บเฉพาะฟิลด์ที่ต้องการ)
    if (merged.subscription && typeof merged.subscription === 'object') {
      const sub = merged.subscription as any;
      merged.subscription = {
        planId: sub.planId,
        planName: sub.planName,
        status: sub.status,
        interval: sub.interval,
        amount: sub.amount,
        startDate: sub.startDate,
        nextBillingDate: sub.nextBillingDate,
        autoRenew: sub.autoRenew,
      };
      // Remove undefined fields inside subscription
      Object.keys(merged.subscription).forEach(key => merged.subscription[key] === undefined && delete merged.subscription[key]);
    }
    // Remove undefined fields
    Object.keys(merged).forEach(key => merged[key] === undefined && delete merged[key]);
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
