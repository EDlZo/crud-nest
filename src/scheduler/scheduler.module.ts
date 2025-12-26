import { Module, forwardRef } from '@nestjs/common';
import { BillingSchedulerService } from './billing-scheduler.service';
import { EventsSchedulerService } from './events-scheduler.service';
import { EmailModule } from '../email/email.module';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [forwardRef(() => EmailModule), NotificationSettingsModule, NotificationsModule],
    providers: [BillingSchedulerService, EventsSchedulerService],
    exports: [BillingSchedulerService, EventsSchedulerService],
})
export class SchedulerModule { }
