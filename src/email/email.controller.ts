import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
    constructor(
        private readonly emailService: EmailService,
        private readonly settingsService: NotificationSettingsService,
    ) { }

    @Post('test')
    @Roles('admin', 'superadmin')
    async sendTestEmail(@Body('email') email: string) {
        if (!email) {
            return { success: false, message: 'Email address is required' };
        }
        try {
            const success = await this.emailService.sendTestEmail(email);
            return { success, message: success ? 'Test email sent' : 'Failed to send test email. Check GMAIL_USER and GMAIL_APP_PASSWORD configuration.' };
        } catch (error) {
            console.error('sendTestEmail error:', error);
            return { success: false, message: `Error: ${error.message || 'Unknown error'}` };
        }
    }

    // ทดสอบส่ง billing notification ไปยังผู้รับทั้งหมด (รวม admin ถ้าเปิด sendToAdmins)
    @Post('test-billing')
    @Roles('admin', 'superadmin')
    async testBillingNotification(@Body() body: { companyName?: string }) {
        try {
            const recipients = await this.settingsService.getAllRecipients();
            
            if (recipients.length === 0) {
                return { 
                    success: false, 
                    message: 'No recipients configured. Please add recipients or enable "Send to Admins" option.',
                    recipients: []
                };
            }

            const companyName = body.companyName || 'Test Company';
            const success = await this.emailService.sendBillingReminder(
                recipients,
                companyName,
                'Day 15 of each month',
                'monthly',
                3, // 3 days until billing
            );

            return { 
                success, 
                message: success 
                    ? `Test billing notification sent to ${recipients.length} recipient(s)` 
                    : 'Failed to send test billing notification. Check GMAIL configuration.',
                recipients 
            };
        } catch (error) {
            console.error('testBillingNotification error:', error);
            return { success: false, message: `Error: ${error.message || 'Unknown error'}`, recipients: [] };
        }
    }
}
