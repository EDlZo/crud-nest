import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailService } from '../email/email.service';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';

@Injectable()
export class BillingSchedulerService {
  private readonly logger = new Logger(BillingSchedulerService.name);
  private readonly db = getFirestore();
  private lastRunDate: string | null = null; // prevent duplicate runs on same day

  constructor(
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
    private readonly settingsService: NotificationSettingsService,
  ) {}

  // Run every minute and check if it's time to execute notification job
  @Cron('* * * * *')
  async handleCron() {
    try {
      const settings = await this.settingsService.getSettings();
      if (!settings || !settings.notificationTime) {
        this.logger.debug('No notification settings or notificationTime configured');
        return;
      }

      const now = new Date();
      const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const currentTime = `${bangkokTime.getHours().toString().padStart(2, '0')}:${bangkokTime
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
      const todayDate = bangkokTime.toISOString().split('T')[0];

      this.logger.debug(`Scheduler check: currentTime=${currentTime}, settingsTime=${settings.notificationTime}, lastRunDate=${this.lastRunDate}, todayDate=${todayDate}`);

      if (currentTime === settings.notificationTime && this.lastRunDate !== todayDate) {
        this.logger.log(`Scheduled time ${settings.notificationTime} reached! Running billing notifications...`);
        this.lastRunDate = todayDate;
        await this.handleBillingNotifications();
      }
    } catch (err) {
      this.logger.error('Error in scheduler tick', err);
    }
  }

  // Iterate billing-records and notify based on each record's billingDate and billingIntervalMonths
  async handleBillingNotifications(dryRun = false) {
    this.logger.log('Running billing notification check (per-record billingDate + billingIntervalMonths)...');

    const settings = await this.settingsService.getSettings();
    if (!settings) {
      this.logger.warn('No notification settings found');
      return;
    }

    // Use Asia/Bangkok timezone for consistency with scheduler checks
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const todayIso = bangkokTime.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      const allRecipients = await this.settingsService.getAllRecipients();
      if (allRecipients.length === 0) {
        this.logger.warn('No recipients found (check notification settings)');
        return;
      }

      this.logger.log(`Sending to ${allRecipients.length} recipients: ${allRecipients.join(', ')}`);

      const recordsSnapshot = await this.db.collection('billing-records').get();

      for (const doc of recordsSnapshot.docs) {
        const record = doc.data() as any;
        if (!record || !record.billingDate) continue;

        const billingDateIso = (record.billingDate || '').split('T')[0];
        if (!billingDateIso) continue;

        const daysUntil = this.daysBetweenDates(bangkokTime, new Date(billingDateIso + 'T00:00:00'));

        // Check contract period: prefer record-level contractDates, otherwise consider record without contract
        let inContract = true;
        try {
          const start = record.contractStartDate;
          const end = record.contractEndDate;
          if (start && end) {
            inContract = !(todayIso < start || todayIso > end);
          } else if (start && !end) {
            inContract = !(todayIso < start);
          } else if (!start && end) {
            inContract = !(todayIso > end);
          }
        } catch (err) {
          this.logger.debug('Error checking contract dates for record', err);
          inContract = true;
        }

        if (!inContract) continue;

        const shouldAdvanceNotify = settings.advanceNotification && typeof settings.advanceDays === 'number' && daysUntil === settings.advanceDays;
        const shouldOnBillingDate = settings.onBillingDate && daysUntil === 0;

        if (shouldAdvanceNotify || shouldOnBillingDate) {
          const companyName = record.companyName || '(Unknown)';
          const companyId = record.companyId || '';
          const amountDue = typeof record.amount === 'number' ? record.amount : record.amount ? Number(record.amount) : 0;
          const billingIntervalMonths = record.billingIntervalMonths || record.billingInterval || null;
          const billingCycleText = billingIntervalMonths ? `ทุกๆ ${billingIntervalMonths} เดือน` : record.billingCycle || '-';

          this.logger.log(`Record ${doc.id} for company "${companyName}" matches notify condition (daysUntil=${daysUntil}).` + (dryRun ? ' (dry-run)' : ' Sending...'));

          if (!dryRun) {
            try {
              await this.emailService.sendBillingReminder(
                allRecipients,
                companyName,
                companyId,
                billingDateIso,
                billingCycleText,
                daysUntil,
                amountDue,
                settings.emailTemplate,
                doc.id,
              );

              // Optionally mark that notification was sent for this record (not required but helpful)
              try {
                await this.db.collection('billing-records').doc(doc.id).update({ notificationsSent: true });
              } catch (updErr) {
                this.logger.debug(`Failed to update notificationsSent for record ${doc.id}`, updErr);
              }
            } catch (sendErr) {
              this.logger.error(`Failed to send notification for record ${doc.id}`, sendErr);
            }
          }
        }
      }

      this.logger.log('Per-record billingDate check completed');
    } catch (error) {
      this.logger.error('Error during billing notification check', error);
    }
  }

  private daysBetweenDates(fromDate: Date, toDate: Date): number {
    const utc1 = Date.UTC(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const utc2 = Date.UTC(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    const diff = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
    return diff;
  }
}

