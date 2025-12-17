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

        // Skip if this record was already notified today (safety to avoid duplicates)
        try {
          if (record.lastNotifiedDate && record.lastNotifiedDate === todayIso) {
            this.logger.debug(`Skipping record ${doc.id} — already notified today (${todayIso})`);
            continue;
          }
        } catch (skipErr) {
          // proceed if any unexpected shape
        }

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

              // Build update payload: mark lastNotifiedDate and increment count
              const updates: any = {
                lastNotifiedDate: todayIso,
                lastNotificationAt: new Date().toISOString(),
                lastNotificationStatus: 'sent',
                notificationsSentCount: (record.notificationsSentCount || 0) + 1,
              };

              // If this is the actual billing date (not just an advance notice) and there is an interval, advance billingDate
              if (shouldOnBillingDate && billingIntervalMonths && Number(billingIntervalMonths) > 0) {
                try {
                  const nextBilling = this.addMonthsToIsoDate(billingDateIso, Number(billingIntervalMonths));
                  updates.billingDate = nextBilling;
                  this.logger.log(`Auto-advanced billingDate for record ${doc.id} to ${nextBilling}`);
                } catch (advErr) {
                  this.logger.debug(`Failed to compute next billing date for ${doc.id}`, advErr);
                }
              }

              try {
                await this.db.collection('billing-records').doc(doc.id).update(updates);
              } catch (updErr) {
                this.logger.debug(`Failed to update notification metadata for record ${doc.id}`, updErr);
              }
            } catch (sendErr) {
              this.logger.error(`Failed to send notification for record ${doc.id}`, sendErr);
              try {
                await this.db.collection('billing-records').doc(doc.id).update({
                  lastNotifiedDate: todayIso,
                  lastNotificationAt: new Date().toISOString(),
                  lastNotificationStatus: 'failed',
                  lastNotificationError: String(sendErr),
                  notificationsSentCount: (record.notificationsSentCount || 0) + 1,
                });
              } catch (errUpd) {
                this.logger.debug(`Failed to update failed-notification metadata for record ${doc.id}`, errUpd);
              }
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

  // Add months to an ISO date string (YYYY-MM-DD) and return as YYYY-MM-DDT00:00:00
  private addMonthsToIsoDate(isoDate: string, months: number): string {
    const d = new Date(isoDate + 'T00:00:00');
    const dt = new Date(d.getTime());
    dt.setMonth(dt.getMonth() + months);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T00:00:00`;
  }
}

