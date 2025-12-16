import { Controller, Get, Param, Post, Body, UseGuards, Req, Delete, Patch, Inject, forwardRef } from '@nestjs/common';
import { BillingRecordsService } from './billing-records.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { db } from '../firebase.config';
import { EmailService } from '../email/email.service';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';

@Controller('billing-records')
export class BillingRecordsController {
  constructor(
    private readonly svc: BillingRecordsService,
    @Inject(forwardRef(() => EmailService)) private readonly emailService: EmailService,
    private readonly settingsService: NotificationSettingsService,
  ) {}

  @Get()
  async findAll() {
    return this.svc.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const rec = await this.svc.findById(id);
    if (!rec) return { error: 'Not found' };
    return rec;
  }

  @Get('company/:companyId')
  async findByCompany(@Param('companyId') companyId: string) {
    return this.svc.findByCompany(companyId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: any, @Req() req: any) {
    // Attach creator info if available
    const userId = req.user?.userId || req.user?.sub || null;
    const creatorEmail = req.user?.email || null;
    const payload = {
      ...body,
      createdBy: userId,
      createdByEmail: creatorEmail,
    };
    const created = await this.svc.create(payload);

    // If contract dates provided and companyId present, update the company document
    try {
      if (payload.companyId && (payload.contractStartDate || payload.contractEndDate)) {
        const updatePayload: any = {};
        if (payload.contractStartDate) updatePayload.contractStartDate = payload.contractStartDate;
        if (payload.contractEndDate) updatePayload.contractEndDate = payload.contractEndDate;
        await db.collection(process.env.FIREBASE_COMPANIES_COLLECTION ?? 'companies').doc(payload.companyId).set(updatePayload, { merge: true });
      }
    } catch (err) {
      // log but don't fail the request
      console.error('Failed to update company with contract dates', err);
    }

    return created;
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: any) {
    // Optionally: check permissions here (admin or creator)
    try {
      await this.svc.delete(id);
      return { success: true };
    } catch (err) {
      console.error('Failed to delete billing record', err);
      return { success: false, error: String(err) };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    try {
      // Optionally attach modifiedBy info
      const userId = req.user?.userId || req.user?.sub || null;
      const modifierEmail = req.user?.email || null;
      const payload = { ...body, modifiedBy: userId, modifiedByEmail: modifierEmail };
      const updated = await this.svc.update(id, payload);
      return updated;
    } catch (err) {
      console.error('Failed to update billing record', err);
      return { success: false, error: String(err) };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/send')
  async sendNow(@Param('id') id: string, @Body('type') type: string, @Req() req: any) {
    try {
      const rec = await this.svc.findById(id);
      if (!rec) return { success: false, error: 'Not found' };

      const now = new Date();
      const bangkok = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const billingIso = rec.billingDate ? (rec.billingDate + '').split('T')[0] : null;
      if (!billingIso) return { success: false, error: 'Record has no billingDate' };

      const toDate = new Date(billingIso + 'T00:00:00');
      const utc1 = Date.UTC(bangkok.getFullYear(), bangkok.getMonth(), bangkok.getDate());
      const utc2 = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      const daysUntil = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));

      const recipients = await this.settingsService.getAllRecipients();
      if (!recipients || recipients.length === 0) return { success: false, error: 'No recipients configured' };

      const companyName = rec.companyName || '(Unknown)';
      const companyId = rec.companyId || '';
      const amountDue = typeof rec.amount === 'number' ? rec.amount : rec.amount ? Number(rec.amount) : 0;
      const billingIntervalMonths = rec.billingIntervalMonths || rec.billingInterval || null;
      const billingCycleText = billingIntervalMonths ? `ทุกๆ ${billingIntervalMonths} เดือน` : rec.billingCycle || '-';

      // Send email
      const ok = await this.emailService.sendBillingReminder(
        recipients,
        companyName,
        companyId,
        billingIso,
        billingCycleText,
        daysUntil,
        amountDue,
        undefined,
        id,
      );

      // mark notificationsSent flag (use provided type or infer)
      const notifyType = type === 'onDate' ? 'onDate' : type === 'advance' ? 'advance' : daysUntil === 0 ? 'onDate' : 'advance';
      const sentFlags = (rec.notificationsSent as any) || {};
      await db.collection(process.env.FIREBASE_BILLING_COLLECTION ?? 'billing-records').doc(id).set({ notificationsSent: { ...(sentFlags || {}), [notifyType]: true } }, { merge: true });

      return { success: ok };
    } catch (err) {
      console.error('Failed to send billing email for record', id, err);
      return { success: false, error: String(err) };
    }
  }
}
