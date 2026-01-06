import { Controller, Post, Body, UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
import { db } from '../firebase.config';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { BillingSchedulerService } from '../scheduler/billing-scheduler.service';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
    private readonly logger = new Logger(EmailController.name);

    constructor(
        private readonly emailService: EmailService,
        private readonly settingsService: NotificationSettingsService,
        @Inject(forwardRef(() => BillingSchedulerService))
        private readonly schedulerService: BillingSchedulerService,
    ) { }

    @Post('test')
    @Roles('admin', 'superadmin')
    async sendTestEmail(@Body('email') email: string) {
        this.logger.log(`Received test email request for: ${email}`);
        if (!email) {
            this.logger.warn('No email provided');
            return { success: false, message: 'Email address is required' };
        }
        try {
            this.logger.log('Calling emailService.sendTestEmail...');
            const success = await this.emailService.sendTestEmail(email);
            this.logger.log(`sendTestEmail result: ${success}`);
            return { success, message: success ? 'Test email sent' : 'Failed to send test email. Check GMAIL_USER and GMAIL_APP_PASSWORD configuration.' };
        } catch (error) {
            this.logger.error('sendTestEmail error:', error);
            return { success: false, message: `Error: ${error.message || 'Unknown error'}` };
        }
    }

    // ทดสอบส่ง billing notification ไปยังผู้รับทั้งหมด (รวม admin ถ้าเปิด sendToAdmins)
    @Post('test-billing')
    @Roles('admin', 'superadmin')
    async testBillingNotification(@Body() body: { companyName?: string }) {
        this.logger.log('Received test-billing request');
        try {
            this.logger.log('Getting all recipients...');
            const recipients = await this.settingsService.getAllRecipients();
            this.logger.log(`Found ${recipients.length} recipients: ${recipients.join(', ')}`);
            
            if (recipients.length === 0) {
                return { 
                    success: false, 
                    message: 'No recipients configured. Please add recipients or enable "Send to Admins" option.',
                    recipients: []
                };
            }

            const companyName = body.companyName || 'Test Company';
            this.logger.log(`Sending billing reminder for: ${companyName}`);
            const success = await this.emailService.sendBillingReminder(
                recipients,
                companyName,
                'test-company-id', // mock companyId for test
                '15', // billingDate (day of month)
                'monthly',
                3, // daysUntilBilling
                10000, // amountDue (mock)
                undefined, // customTemplate (none)
                [] // no items for test
            );
            this.logger.log(`sendBillingReminder result: ${success}`);

            return { 
                success, 
                message: success 
                    ? `Test billing notification sent to ${recipients.length} recipient(s)` 
                    : 'Failed to send test billing notification. Check GMAIL configuration.',
                recipients 
            };
        } catch (error) {
            this.logger.error('testBillingNotification error:', error);
            return { success: false, message: `Error: ${error.message || 'Unknown error'}`, recipients: [] };
        }
    }

    // ทดสอบ run scheduler ด้วยมือ - จะเช็คบริษัททั้งหมดและส่ง email แบบเดียวกับ cron job
    @Post('trigger-scheduler')
    @Roles('admin', 'superadmin')
    async triggerScheduler(@Body() body: { dryRun?: boolean; force?: boolean }) {
        const dryRun = !!body?.dryRun;
        const force = !!body?.force;
        this.logger.log(`Manual trigger of billing scheduler requested (dryRun=${dryRun}, force=${force})`);
        try {
            const result = await this.schedulerService.handleBillingNotifications(dryRun, force);
            return {
                success: true,
                message: dryRun ? 'Dry-run completed. No emails sent.' : `Scheduler triggered successfully. force=${force}. Check logs for details.`,
                timestamp: new Date().toISOString(),
                result,
            };
        } catch (error) {
            this.logger.error('triggerScheduler error:', error);
            return {
                success: false,
                message: `Error: ${error.message || 'Unknown error'}`,
            };
        }
    }

    // Admin-only: send billing email for a single billing-record by id (useful for testing)
    @Post('send-record')
    @Roles('admin', 'superadmin')
    async sendRecordEmail(@Body() body: { recordId: string }) {
        const recordId = body?.recordId;
        this.logger.log(`send-record requested for id=${recordId}`);
        if (!recordId) return { success: false, message: 'recordId is required' };
        try {
            const doc = await db.collection('billing-records').doc(recordId).get();
            if (!doc.exists) return { success: false, message: `Record ${recordId} not found` };
            const record: any = doc.data();

            const recipients = await this.settingsService.getAllRecipients();
            if (!recipients || recipients.length === 0) {
                return { success: false, message: 'No recipients configured' };
            }

            // Build minimal items for emailService similar to scheduler
            const safeNum = (v: any) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : 0;
            };
            const itemsForEmail: Array<any> = [];
            const amountDue = typeof record.amount === 'number' ? record.amount : record.amount ? Number(record.amount) : 0;
            if (Array.isArray(record.services) && record.services.length > 0) {
                record.services.forEach((s: any) => {
                    const unit = safeNum(s.amount ?? s.price ?? s.unitPrice ?? s.cost ?? s.value);
                    const qty = safeNum(s.qty ?? s.quantity) || 1;
                    const total = safeNum(s.total ?? unit * qty);
                    itemsForEmail.push({ code: s.code || s.id || null, description: s.name || s.description || 'Service', qty, unitPrice: unit, total });
                });
            } else if (Array.isArray(record.items) && record.items.length > 0) {
                record.items.forEach((it: any) => {
                    const unit = safeNum(it.unitPrice ?? it.price ?? it.amount ?? it.cost);
                    const qty = safeNum(it.qty ?? it.quantity) || 1;
                    const total = safeNum(it.total ?? unit * qty);
                    itemsForEmail.push({ code: it.code || it.id || null, description: it.description || it.name || 'Item', qty, unitPrice: unit, total });
                });
            } else {
                itemsForEmail.push({ code: null, description: record.description || record.note || 'Invoice Amount', qty: 1, unitPrice: amountDue, total: amountDue });
            }

            const billingDateIso = String(record.billingDate).split('T')[0];
            const billingCycleText = record.billingIntervalMonths ? `ทุกๆ ${record.billingIntervalMonths} เดือน` : record.billingCycle || '-';
            const daysUntil = 0; // caller decides relevance; we just send

            const sent = await this.emailService.sendBillingReminder(
                recipients,
                record.companyName || '(Unknown)',
                record.companyId || '',
                billingDateIso,
                billingCycleText,
                daysUntil,
                amountDue,
                record.emailTemplate || undefined,
                itemsForEmail,
                recordId,
            );

            return { success: !!sent, message: sent ? 'Email send attempted' : 'Email send failed', recipients };
        } catch (err) {
            this.logger.error('sendRecordEmail error:', err);
            return { success: false, message: String(err) };
        }
    }
}
