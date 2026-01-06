import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { db } from '../firebase.config';
import { EmailService } from '../email/email.service';
import { NotificationSettingsService } from '../notification-settings/notification-settings.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EventsSchedulerService {
  private readonly logger = new Logger(EventsSchedulerService.name);

  constructor(
    @Inject(forwardRef(() => EmailService)) private readonly emailService: EmailService,
    private readonly settingsService: NotificationSettingsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // run every minute to check upcoming events and send reminders
  @Cron('* * * * *')
  async handleCron() {
    try {
      const now = new Date();
      const bangkok = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
      const nowIso = new Date(bangkok.getTime()).toISOString();

      const settings = await this.settingsService.getSettings();
      const defaultReminder = 30; // minutes

      // Find events with start within next X minutes where reminder applies
      const lookaheadMinutes = 60; // check next hour
      const lookahead = new Date(bangkok.getTime() + lookaheadMinutes * 60 * 1000).toISOString();

      const eventsSnap = await db.collection(process.env.FIREBASE_EVENTS_COLLECTION ?? 'events')
        .where('start', '>=', nowIso)
        .where('start', '<=', lookahead)
        .get();

      if (eventsSnap.empty) return;

      const recipients = await this.settingsService.getAllRecipients();

      for (const doc of eventsSnap.docs) {
        const ev = doc.data() as any;
        const startIso = ev.start as string;
        if (!startIso) continue;
        const startDate = new Date(startIso);
        const minutesUntil = Math.round((startDate.getTime() - bangkok.getTime()) / 60000);

        const reminderMinutes = typeof ev.reminderMinutesBefore === 'number' ? ev.reminderMinutesBefore : defaultReminder;

        // already sent check: lastReminderAt equals this startISO means we already notified for this start
        if (ev.lastReminderForStart === startIso) {
          continue;
        }

        if (minutesUntil <= reminderMinutes && minutesUntil >= 0) {
          // prepare notification text
          const title = ev.title || 'Upcoming event';
          const body = `Event "${title}" starts in ${minutesUntil} minute(s) at ${startIso}`;

          // Email sending for event reminders is intentionally disabled.
          // Events will create persistent notifications in Firestore so clients can show them,
          // but we don't send emails for event reminders to avoid spamming.
          this.logger.debug('Event email sending skipped by configuration (email disabled for events)');

          // create notifications records for recipients
          try {
            const toEmails = ev.ownerEmail ? [ev.ownerEmail, ...(recipients || [])] : (recipients || []);
            for (const to of Array.from(new Set(toEmails))) {
              await this.notificationsService.create({
                toEmail: to,
                title: `Reminder: ${title}`,
                body,
                data: { eventId: doc.id, start: startIso },
                createdAt: new Date().toISOString(),
                read: false,
              });
            }
          } catch (err) {
            this.logger.error('Failed to create notifications', err);
          }

          // mark event as reminded for this start to avoid duplicates
          try {
            await db.collection(process.env.FIREBASE_EVENTS_COLLECTION ?? 'events').doc(doc.id).update({ lastReminderForStart: startIso, lastReminderAt: new Date().toISOString() });
          } catch (err) {
            this.logger.debug('Failed to update event reminder metadata', err);
          }
        }
      }
    } catch (err) {
      this.logger.error('Error in events scheduler', err);
    }
  }
}
