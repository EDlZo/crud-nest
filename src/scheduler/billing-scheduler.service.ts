import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailService } from '../email/email.service';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';

@Injectable()
export class BillingSchedulerService {
    private readonly logger = new Logger(BillingSchedulerService.name);
    private db = getFirestore();
    private lastRunDate: string | null = null; // ป้องกันส่งซ้ำในวันเดียวกัน

    constructor(
        @Inject(forwardRef(() => EmailService))
        private readonly emailService: EmailService,
        private readonly settingsService: NotificationSettingsService,
    ) { }

    // เช็คทุกนาทีว่าถึงเวลาที่ตั้งไว้หรือยัง
    @Cron('0 * * * * *') // ทุกนาทีที่วินาทีที่ 0
    async checkScheduledTime() {
        const settings = await this.settingsService.getSettings();
        if (!settings || !settings.notificationTime) {
            this.logger.debug('No notification settings or notificationTime not set');
            return;
        }


        // ใช้เวลา Asia/Bangkok (UTC+7) เพื่อให้ scheduler ตรงกับเวลาประเทศไทย
        const now = new Date();
        const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
        const currentTime = `${bangkokTime.getHours().toString().padStart(2, '0')}:${bangkokTime.getMinutes().toString().padStart(2, '0')}`;
        const todayDate = bangkokTime.toISOString().split('T')[0]; // YYYY-MM-DD

        this.logger.debug(`Scheduler check: currentTime=${currentTime}, settingsTime=${settings.notificationTime}, lastRunDate=${this.lastRunDate}, todayDate=${todayDate}`);

        // เช็คว่าถึงเวลาที่ตั้งไว้หรือยัง และยังไม่เคยรันในวันนี้
        if (currentTime === settings.notificationTime && this.lastRunDate !== todayDate) {
            this.logger.log(`Scheduled time ${settings.notificationTime} reached! Running billing notifications...`);
            this.lastRunDate = todayDate;
            await this.handleBillingNotifications();
        }
    }

    async handleBillingNotifications() {
        this.logger.log('Running billing notification check (per-company notificationDate)...');

        const settings = await this.settingsService.getSettings();
        if (!settings) {
            this.logger.warn('No notification settings found');
            return;
        }

        const today = new Date();
        const currentDay = today.getDate();

        try {
            const companiesSnapshot = await this.db.collection('companies').get();

            // Get all recipients (manual list + admin emails if enabled)
            const allRecipients = await this.settingsService.getAllRecipients();
            if (allRecipients.length === 0) {
                this.logger.warn('No recipients found (check notification settings)');
                return;
            }

            this.logger.log(`Sending to ${allRecipients.length} recipients: ${allRecipients.join(', ')}`);

            for (const doc of companiesSnapshot.docs) {
                const company = doc.data();
                const billingDay = parseInt(company.billingDate, 10);
                const notificationDay = parseInt(company.notificationDate, 10);

                // Only send if notificationDate is set and today matches
                if (!isNaN(notificationDay) && currentDay === notificationDay) {
                    this.logger.log(`Company "${company.name}" has notificationDate=${notificationDay}, today=${currentDay}. Sending...`);
                    const daysUntilBilling = !isNaN(billingDay) ? this.calculateDaysUntilBilling(currentDay, billingDay) : 0;
                    await this.sendNotification(
                        allRecipients,
                        company.name,
                        doc.id,
                        billingDay ? `Day ${billingDay} of each month` : '-',
                        company.billingCycle || 'monthly',
                        daysUntilBilling,
                        company.amountDue || 0,
                        settings.emailTemplate,
                    );
                }
            }

            this.logger.log('Per-company notificationDate check completed');
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
        companyId: string,
        billingDate: string,
        billingCycle: string,
        daysUntilBilling: number,
        amountDue?: number,
        customTemplate?: string,
    ) {
        try {
            await this.emailService.sendBillingReminder(
                recipients,
                companyName,
                companyId,
                billingDate,
                billingCycle,
                daysUntilBilling,
                amountDue,
                customTemplate,
            );
            this.logger.log(`Sent billing reminder for ${companyName}`);
        } catch (error) {
            this.logger.error(`Failed to send notification for ${companyName}`, error);
        }
    }
}
