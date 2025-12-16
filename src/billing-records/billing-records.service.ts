import { Injectable, Logger } from '@nestjs/common';
import { db } from '../firebase.config';

@Injectable()
export class BillingRecordsService {
  private readonly logger = new Logger(BillingRecordsService.name);
  private readonly collection = db.collection('billing-records');

  async findAll(): Promise<any[]> {
    try {
      const snap = await this.collection.orderBy('billingDate', 'desc').get();
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    } catch (err) {
      this.logger.error('Error fetching billing records', err);
      return [];
    }
  }

  async findByCompany(companyId: string): Promise<any[]> {
    try {
      const snap = await this.collection
        .where('companyId', '==', companyId)
        .orderBy('billingDate', 'desc')
        .get();
      const results = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      this.logger.log(`findByCompany(${companyId}) returned ${results.length} records (ordered)`);
      return results;
    } catch (err) {
      this.logger.error('Error fetching billing records for company ' + companyId + ' with orderBy, retrying without orderBy', err);
      try {
        // debug: list a few docs and their companyId to understand mismatch
        const allSnap = await this.collection.limit(20).get();
        const debugList = allSnap.docs.map((d) => ({ id: d.id, companyId: (d.data() as any).companyId }));
        this.logger.log(`Debug sample documents (up to 20): ${JSON.stringify(debugList)}`);
      } catch (dbgErr) {
        this.logger.error('Failed to fetch debug sample docs', dbgErr);
      }
      try {
        const snap2 = await this.collection.where('companyId', '==', companyId).get();
        const results2 = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        this.logger.log(`findByCompany(${companyId}) returned ${results2.length} records (fallback)`);
        return results2;
      } catch (err2) {
        this.logger.error('Fallback query also failed for company ' + companyId, err2);
        return [];
      }
    }
  }

  async create(record: any): Promise<any> {
    try {
      const timestamp = new Date().toISOString();
      const payload = {
        ...record,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const ref = await this.collection.add(payload);
      return { id: ref.id, ...payload };
    } catch (err) {
      this.logger.error('Error creating billing record', err);
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.collection.doc(id).delete();
    } catch (err) {
      this.logger.error('Error deleting billing record ' + id, err);
      throw err;
    }
  }

  async findById(id: string): Promise<any | null> {
    try {
      const doc = await this.collection.doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...(doc.data() as any) };
    } catch (err) {
      this.logger.error('Error fetching billing record ' + id, err);
      return null;
    }
  }

  async update(id: string, updates: any): Promise<any> {
    try {
      const timestamp = new Date().toISOString();
      const payload = { ...updates, updatedAt: timestamp };
      await this.collection.doc(id).set(payload, { merge: true });
      const doc = await this.collection.doc(id).get();
      return { id: doc.id, ...(doc.data() as any) };
    } catch (err) {
      this.logger.error('Error updating billing record ' + id, err);
      throw err;
    }
  }
}
