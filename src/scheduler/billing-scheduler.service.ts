import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { getFirestore } from 'firebase-admin/firestore';
import { EmailService } from '../email/email.service';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BillingSchedulerService {
  private readonly logger = new Logger(BillingSchedulerService.name);
  private readonly db = getFirestore();
  private lastRunDate: string | null = null; // prevent duplicate runs on same day
  private lastKnownNotificationTime: string | null = null; // track last seen configured time

  constructor(
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
    private readonly settingsService: NotificationSettingsService,
    private readonly notificationsService: NotificationsService,
  ) { }

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
      const todayDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now);

      this.logger.debug(`Scheduler check: currentTime=${currentTime}, settingsTime=${settings.notificationTime}, lastRunDate=${this.lastRunDate}, todayDate=${todayDate}`);

      // If the configured notification time changed since last tick, reset lastRunDate
      if (this.lastKnownNotificationTime !== settings.notificationTime) {
        this.logger.log(`Notification time changed from ${this.lastKnownNotificationTime ?? 'null'} to ${settings.notificationTime}. Resetting lastRunDate to allow run at new time.`);
        this.lastKnownNotificationTime = settings.notificationTime;
        this.lastRunDate = null;
      }

      // Run when currentTime is equal or later than configured time and we haven't run today.
      // Using >= prevents missing the run if the process was busy or delayed by a few seconds/minutes.
      if (currentTime >= settings.notificationTime && this.lastRunDate !== todayDate) {
        this.logger.log(`Scheduled time ${settings.notificationTime} reached or passed (currentTime=${currentTime})! Running billing notifications...`);
        this.lastRunDate = todayDate;
        await this.handleBillingNotifications();
      } else if (this.lastRunDate === todayDate) {
        this.logger.debug('Scheduler already ran for today; skipping.');
      } else {
        this.logger.debug('Not time yet for scheduled notifications.');
      }
    } catch (err) {
      this.logger.error('Error in scheduler tick', err);
    }
  }

  // Iterate billing-records and notify based on each record's billingDate and billingIntervalMonths
  async handleBillingNotifications(dryRun = false, forceSend = false) {
    this.logger.log('Running billing notification check (per-record billingDate + billingIntervalMonths)...');

    const settings = await this.settingsService.getSettings();
    if (!settings) {
      this.logger.warn('No notification settings found');
      return;
    }

    // Standardize today date in Bangkok
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    const todayIso = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(now);

    try {
      const allRecipients = await this.settingsService.getAllRecipients();
      if (allRecipients.length === 0) {
        this.logger.warn('No recipients found (check notification settings)');
        return;
      }

      this.logger.log(`Billing Check: date=${todayIso}, time=${now.toLocaleTimeString()}, recipients=${allRecipients.length}`);

      const recordsSnapshot = await this.db.collection('billing-records').get();
      this.logger.log(`Found ${recordsSnapshot.docs.length} billing records to check`);

      for (const doc of recordsSnapshot.docs) {
        const record = doc.data() as any;
        if (!record) continue;

        const companyName = record.companyName || '(Unknown)';
        const recordId = doc.id;

        if (!record.billingDate) {
          this.logger.debug(`Skipping record ${recordId} for "${companyName}": billingDate is missing`);
          continue;
        }

        // Standardize format: split by T if ISO, but also handle just YYYY-MM-DD
        let currentBillingDateIso = String(record.billingDate).split('T')[0];
        const billingIntervalMonths = Number(record.billingIntervalMonths || record.billingInterval || 0);

        this.logger.debug(`Checking record ${recordId} ("${companyName}"): anchor=${currentBillingDateIso}, interval=${billingIntervalMonths}`);

        // Bi-directional Sequence Alignment: Find the first occurrence in the sequence that is >= today
        if (billingIntervalMonths > 0) {
          const originalAnchor = currentBillingDateIso;
          // Forward catch-up
          if (currentBillingDateIso < todayIso) {
            while (currentBillingDateIso < todayIso) {
              currentBillingDateIso = this.addMonthsToIsoDate(currentBillingDateIso, billingIntervalMonths).split('T')[0];
            }
            if (currentBillingDateIso !== originalAnchor) {
              this.logger.log(`Record ${recordId} ("${companyName}"): Advanced anchor ${originalAnchor} -> ${currentBillingDateIso} to catch up`);
            }
          }
          // Backward alignment (if user set a future anchor that represents an ongoing series)
          else if (currentBillingDateIso > todayIso) {
            let prevDate = this.addMonthsToIsoDate(currentBillingDateIso, -billingIntervalMonths).split('T')[0];
            while (prevDate >= todayIso) {
              currentBillingDateIso = prevDate;
              prevDate = this.addMonthsToIsoDate(currentBillingDateIso, -billingIntervalMonths).split('T')[0];
            }
            if (currentBillingDateIso !== originalAnchor) {
              this.logger.log(`Record ${recordId} ("${companyName}"): Aligned future anchor ${originalAnchor} -> ${currentBillingDateIso} to current cycle`);
            }
          }

          // Update DB if the aligned date differs from stored date to avoid repeated logic
          if (currentBillingDateIso + 'T00:00:00' !== record.billingDate) {
            try {
              await this.db.collection('billing-records').doc(recordId).update({
                billingDate: currentBillingDateIso + 'T00:00:00',
                lastAlignmentAt: new Date().toISOString()
              });
            } catch (updErr) {
              this.logger.debug(`Failed to update aligned date for ${recordId}`, updErr);
            }
          }
        }

        // Final check against today
        const daysUntil = this.daysBetweenDates(bangkokTime, new Date(currentBillingDateIso + 'T00:00:00'));
        this.logger.debug(`Result for ${recordId} ("${companyName}"): nextBilling=${currentBillingDateIso}, daysUntil=${daysUntil}`);

        // Skip if this record was already notified today for THIS SPECIFIC billing date
        // This allows re-notifying if the billingDate has advanced (i.e. a new cycle/catch-up)
        // If `forceSend` is true, bypass this skip to force resend for debugging or manual re-run
        if (!forceSend && record.lastNotifiedDate === todayIso && (record.lastNotifiedBillingDate || '').split('T')[0] === currentBillingDateIso) {
          this.logger.debug(`Skipping record ${recordId} ("${companyName}") — already notified for cycle ${currentBillingDateIso} today`);
          continue;
        }

        // Check contract period: prefer record-level contractDates, otherwise consider record without contract
        let inContract = true;
        try {
          // contract dates might be empty or ISO strings
          const startStr = record.contractStartDate ? String(record.contractStartDate).split('T')[0] : null;
          const endStr = record.contractEndDate ? String(record.contractEndDate).split('T')[0] : null;

          if (startStr && endStr) {
            inContract = !(todayIso < startStr || todayIso > endStr);
            if (!inContract) this.logger.debug(`Record ${recordId} ("${companyName}") OUT OF RANGE: ${todayIso} not in ${startStr} to ${endStr}`);
          } else if (startStr) {
            inContract = !(todayIso < startStr);
            if (!inContract) this.logger.debug(`Record ${recordId} ("${companyName}") NOT STARTED: ${todayIso} < ${startStr}`);
          } else if (endStr) {
            inContract = !(todayIso > endStr);
            if (!inContract) this.logger.debug(`Record ${recordId} ("${companyName}") EXPIRED: ${todayIso} > ${endStr}`);
          }
        } catch (err) {
          this.logger.debug(`Error checking contract dates for record ${recordId}`, err);
          inContract = true;
        }

        if (!inContract) {
          continue;
        }

        const shouldAdvanceNotify = settings.advanceNotification && typeof settings.advanceDays === 'number' && daysUntil === settings.advanceDays;
        const shouldOnBillingDate = settings.onBillingDate && daysUntil === 0;

        if (shouldAdvanceNotify || shouldOnBillingDate) {
          const companyId = record.companyId || '';
          const amountDue = typeof record.amount === 'number' ? record.amount : record.amount ? Number(record.amount) : 0;
          const billingCycleText = billingIntervalMonths ? `ทุกๆ ${billingIntervalMonths} เดือน` : record.billingCycle || '-';

          this.logger.log(`Record ${recordId} matches notify condition (daysUntil=${daysUntil}). Sending email...`);

              if (!dryRun) {
            try {
              // Build items for this record (optional)
              const safeNum = (v: any) => {
                const n = Number(v);
                return Number.isFinite(n) ? n : 0;
              };
              const itemsForEmail: Array<any> = [];
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

              const sent = await this.emailService.sendBillingReminder(
                allRecipients,
                companyName,
                companyId,
                currentBillingDateIso,
                billingCycleText,
                daysUntil,
                amountDue,
                settings.emailTemplate,
                itemsForEmail,
                doc.id,
              );

              if (!sent) {
                throw new Error('Email sending failed for all recipients or no transport configured');
              }

              // Create persistent notifications in Firestore for each recipient so Topbar shows them
              try {
                const isDueToday = daysUntil === 0;
                const notifTitle = isDueToday ? `🔔 Billing Due Today: ${companyName}` : `📅 แจ้งเตือนการเรียกเก็บเงิน: ${companyName}`;
                const notifBody = isDueToday ? `Invoice for ${companyName} is due today (${currentBillingDateIso}).` : `Invoice for ${companyName} is due in ${daysUntil} day(s) on ${currentBillingDateIso}.`;
                const toEmails = Array.isArray(allRecipients) ? allRecipients : [];
                for (const to of Array.from(new Set(toEmails))) {
                  try {
                    await this.notificationsService.create({
                      toEmail: to,
                      title: notifTitle,
                      body: notifBody,
                      data: { billingId: doc.id, companyId, billingDate: currentBillingDateIso, amountDue },
                      createdAt: new Date().toISOString(),
                      read: false,
                    });
                  } catch (createErr) {
                    this.logger.debug(`Failed to create notification for ${to} for record ${doc.id}`, createErr);
                  }
                }
              } catch (notifErr) {
                this.logger.error('Failed to create billing notifications in Firestore', notifErr);
              }

              // Build update payload: mark lastNotifiedDate/BillingDate and increment count
              const updates: any = {
                lastNotifiedDate: todayIso,
                lastNotifiedBillingDate: currentBillingDateIso + 'T00:00:00',
                lastNotificationAt: new Date().toISOString(),
                lastNotificationStatus: 'sent',
                notificationsSentCount: (record.notificationsSentCount || 0) + 1,
              };

              // If this is the actual billing date (not just an advance notice) and there is an interval, advance billingDate
              if (shouldOnBillingDate && billingIntervalMonths && Number(billingIntervalMonths) > 0) {
                try {
                  const nextBilling = this.addMonthsToIsoDate(currentBillingDateIso, Number(billingIntervalMonths));
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
                  // Note: we DON'T set lastNotifiedDate here so it can retry today if it failed completely
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
