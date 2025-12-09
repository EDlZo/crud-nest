import { Controller, Post, Body, UseGuards, Logger, Inject, forwardRef } from '@nestjs/common';
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
                'Day 15 of each month',
                'monthly',
                3, // 3 days until billing
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
    async triggerScheduler() {
        this.logger.log('Manual trigger of billing scheduler requested');
        try {
            await this.schedulerService.handleBillingNotifications();
            return { 
                success: true, 
                message: 'Scheduler triggered successfully. Check logs for details.',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logger.error('triggerScheduler error:', error);
            return { 
                success: false, 
                message: `Error: ${error.message || 'Unknown error'}` 
            };
        }
    }
}
