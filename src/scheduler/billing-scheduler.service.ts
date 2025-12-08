import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailService } from '../email/email.service';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';

@Injectable()
export class BillingSchedulerService {
    private readonly logger = new Logger(BillingSchedulerService.name);
    private db = getFirestore();

    constructor(
        private readonly emailService: EmailService,
        private readonly settingsService: NotificationSettingsService,
    ) { }

    // Run every day at 9:00 AM
    @Cron(CronExpression.EVERY_DAY_AT_9AM)
    async handleBillingNotifications() {
        this.logger.log('Running billing notification check...');

        const settings = await this.settingsService.getSettings();
        if (!settings) {
            this.logger.warn('No notification settings found');
            return;
        }

        // ใช้ getAllRecipients เพื่อรวมทั้ง manual recipients และ admin emails (ถ้าเปิด sendToAdmins)
        const recipients = await this.settingsService.getAllRecipients();
        if (recipients.length === 0) {
            this.logger.warn('No active recipients for notifications');
            return;
        }

        this.logger.log(`Sending notifications to ${recipients.length} recipients: ${recipients.join(', ')}`);

        const today = new Date();
        const currentDay = today.getDate();

        try {
            const companiesSnapshot = await this.db.collection('companies').get();

            for (const doc of companiesSnapshot.docs) {
                const company = doc.data();
                const billingDay = parseInt(company.billingDate, 10);
                const notificationDay = parseInt(company.notificationDate, 10);

                if (isNaN(billingDay)) continue;

                // Check for advance notification
                if (settings.advanceNotification && notificationDay && currentDay === notificationDay) {
                    const daysUntilBilling = this.calculateDaysUntilBilling(currentDay, billingDay);
                    await this.sendNotification(
                        recipients,
                        company.name,
                        `Day ${billingDay} of each month`,
                        company.billingCycle || 'monthly',
                        daysUntilBilling,
                        settings.emailTemplate,
                    );
                }

                // Check for billing date notification
                if (settings.onBillingDate && currentDay === billingDay) {
                    await this.sendNotification(
                        recipients,
                        company.name,
                        `Day ${billingDay} of each month`,
                        company.billingCycle || 'monthly',
                        0,
                        settings.emailTemplate,
                    );
                }
            }

            this.logger.log('Billing notification check completed');
        } catch (error) {
            this.logger.error('Error during billing notification check', error);
        }
    }

    private calculateDaysUntilBilling(currentDay: number, billingDay: number): number {
        if (billingDay >= currentDay) {
            return billingDay - currentDay;
        }
        // If billing day is in next month
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        return daysInMonth - currentDay + billingDay;
    }

    private async sendNotification(
        recipients: string[],
        companyName: string,
        billingDate: string,
        billingCycle: string,
        daysUntilBilling: number,
        customTemplate?: string,
    ) {
        try {
            await this.emailService.sendBillingReminder(
                recipients,
                companyName,
                billingDate,
                billingCycle,
                daysUntilBilling,
                customTemplate,
            );
            this.logger.log(`Sent billing reminder for ${companyName}`);
        } catch (error) {
            this.logger.error(`Failed to send notification for ${companyName}`, error);
        }
    }
}
