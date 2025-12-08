import { Module } from '@nestjs/common';
import { BillingSchedulerService } from './billing-scheduler.service';
import { EmailModule } from '../email/email.module';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';

@Module({
    imports: [EmailModule, NotificationSettingsModule],
    providers: [BillingSchedulerService],
})
export class SchedulerModule { }
