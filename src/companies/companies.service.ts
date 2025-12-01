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
      
      // admin/superadmin see all
      if (user?.role === 'superadmin' || user?.role === 'admin') {
        const snap = await this.collection.orderBy('updatedAt', 'desc').get();
        const companies = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Company));
        console.log('CompaniesService.findAll - admin/superadmin found:', companies.length);
        return companies;
      }
      
      // otherwise, return companies owned by the user
      // Note: Using where() without orderBy() to avoid composite index requirement
      // Then sort in memory instead
      if (!user) {
        console.log('CompaniesService.findAll - no user provided');
        return [];
      }
      
      console.log('CompaniesService.findAll - querying for ownerUserId:', user.userId);
      
      // Get all companies and filter in memory to handle cases where ownerUserId might be undefined
      // (for backward compatibility with companies created before ownerUserId was added)
      const allSnap = await this.collection.get();
      const allCompanies = allSnap.docs.map((d) => {
        const data = d.data() as any;
        return { id: d.id, ...data } as Company;
      });
      
      console.log('CompaniesService.findAll - DEBUG: All companies in collection:', allCompanies.map(c => ({
        id: c.id,
        ownerUserId: c.ownerUserId,
        name: c.name
      })));
      
      // Filter companies: either owned by user OR have undefined ownerUserId (legacy data)
      // For legacy companies (ownerUserId undefined), we'll assign them to the current user
      const companies = allCompanies.filter((c) => {
        if (c.ownerUserId === undefined || c.ownerUserId === null) {
          // Legacy company without ownerUserId - assign to current user
          console.log('CompaniesService.findAll - found legacy company without ownerUserId, assigning to user:', c.id);
          return true;
        }
        return c.ownerUserId === user.userId;
      });
      
      // Update legacy companies to have ownerUserId set
      for (const company of companies) {
        if (company.ownerUserId === undefined || company.ownerUserId === null) {
          const docRef = this.collection.doc(company.id!);
          await docRef.update({ ownerUserId: user.userId });
          company.ownerUserId = user.userId;
          console.log('CompaniesService.findAll - updated legacy company with ownerUserId:', company.id);
        }
      }
      
      console.log('CompaniesService.findAll - guest found:', companies.length, 'companies');
      
      // Sort by updatedAt descending in memory
      return companies.sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });
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
