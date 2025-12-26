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
  ) { }

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
  async sendNow(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    try {
      const rec = await this.svc.findById(id);
      if (!rec) return { success: false, error: 'Not found' };

      const now = new Date();
      const bangkok = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const billingIso = rec.billingDate ? (rec.billingDate + '').split('T')[0] : null;
      if (!billingIso) return { success: false, error: 'Record has no billingDate' };

      let effectiveBillingIso = billingIso;
      let toDate = new Date(billingIso + 'T00:00:00');
      let utc1 = Date.UTC(bangkok.getFullYear(), bangkok.getMonth(), bangkok.getDate());
      let utc2 = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      let daysUntil = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));

      const billingIntervalMonths = rec.billingIntervalMonths || rec.billingInterval || null;

      // If billing date passed and it's recurring, calculate next occurrence for display
      if (daysUntil < 0 && billingIntervalMonths && Number(billingIntervalMonths) > 0) {
        try {
          // Keep jumping forward by interval until we hit today or future
          let nextDate = new Date(toDate.getTime());
          while (nextDate.getTime() < bangkok.setHours(0, 0, 0, 0)) {
            nextDate.setMonth(nextDate.getMonth() + Number(billingIntervalMonths));
          }
          const yyyy = nextDate.getFullYear();
          const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
          const dd = String(nextDate.getDate()).padStart(2, '0');
          effectiveBillingIso = `${yyyy}-${mm}-${dd}`;

          const nextUtc2 = Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
          daysUntil = Math.floor((nextUtc2 - utc1) / (1000 * 60 * 60 * 24));
        } catch (calcErr) {
          console.error('Error calculating next effective billing date', calcErr);
        }
      }

      const recipients = await this.settingsService.getAllRecipients();
      if (!recipients || recipients.length === 0) return { success: false, error: 'No recipients configured' };

      const companyName = rec.companyName || '(Unknown)';
      const companyId = rec.companyId || '';
      const amountDue = typeof rec.amount === 'number' ? rec.amount : rec.amount ? Number(rec.amount) : 0;
      // billingIntervalMonths is already declared above
      const billingCycleText = billingIntervalMonths ? `ทุกๆ ${billingIntervalMonths} เดือน` : rec.billingCycle || '-';

      // allow overriding template via request body (useful for preview/send with unsaved drafts)
      const settings = await this.settingsService.getSettings();
      const customTemplate = body?.template ?? settings?.emailTemplate;

      // Build items array from record (similar logic to frontend preview)
      const safeNum = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };
      const items: Array<any> = [];
      if (Array.isArray(rec.services) && rec.services.length > 0) {
        rec.services.forEach((s: any) => {
          const unit = safeNum(s.amount ?? s.price ?? s.unitPrice ?? s.cost ?? s.value);
          const qty = safeNum(s.qty ?? s.quantity) || 1;
          const total = safeNum(s.total ?? unit * qty);
          items.push({ code: s.code || s.id || null, description: s.name || s.description || 'Service', qty, unitPrice: unit, total });
        });
      } else if (Array.isArray(rec.items) && rec.items.length > 0) {
        rec.items.forEach((it: any) => {
          const unit = safeNum(it.unitPrice ?? it.price ?? it.amount ?? it.cost);
          const qty = safeNum(it.qty ?? it.quantity) || 1;
          const total = safeNum(it.total ?? unit * qty);
          items.push({ code: it.code || it.id || null, description: it.description || it.name || 'Item', qty, unitPrice: unit, total });
        });
      } else {
        const amt = safeNum(rec.amount ?? rec.amountDue ?? rec.total ?? rec.subtotal ?? rec.price);
        items.push({ code: null, description: rec.description || rec.note || 'Invoice Amount', qty: 1, unitPrice: amt, total: amt });
      }

      // Send email (pass items so EmailService can inject rows into template)
      const ok = await this.emailService.sendBillingReminder(
        recipients,
        companyName,
        companyId,
        effectiveBillingIso,
        billingCycleText,
        daysUntil,
        amountDue,
        customTemplate,
        items,
        id,
      );

      // mark notification metadata similarly to scheduler to avoid duplicate sends
      const reqType = body?.type;
      const notifyType = reqType === 'onDate' ? 'onDate' : reqType === 'advance' ? 'advance' : daysUntil === 0 ? 'onDate' : 'advance';
      const todayIso = bangkok.toISOString().split('T')[0];
      const updates: any = {
        lastNotifiedDate: todayIso,
        lastNotificationAt: new Date().toISOString(),
        lastNotificationStatus: ok ? 'sent' : 'failed',
        notificationsSentCount: (rec.notificationsSentCount || 0) + 1,
      };

      // If sending on the billing date and there is an interval, advance billingDate
      try {
        if (notifyType === 'onDate' && billingIntervalMonths && Number(billingIntervalMonths) > 0) {
          const d = new Date(billingIso + 'T00:00:00');
          d.setMonth(d.getMonth() + Number(billingIntervalMonths));
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          updates.billingDate = `${yyyy}-${mm}-${dd}T00:00:00`;
        }
      } catch (advErr) {
        console.error('Failed to compute next billing date for', id, advErr);
      }

      try {
        await db.collection(process.env.FIREBASE_BILLING_COLLECTION ?? 'billing-records').doc(id).set(updates, { merge: true });
      } catch (updErr) {
        console.error('Failed to update notification metadata for record', id, updErr);
      }

      return { success: ok };
    } catch (err) {
      console.error('Failed to send billing email for record', id, err);
      return { success: false, error: String(err) };
    }
  }
}
