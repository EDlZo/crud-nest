import { Module, forwardRef } from '@nestjs/common';
import { BillingSchedulerService } from './billing-scheduler.service';
import { EmailModule } from '../email/email.module';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';

@Module({
    imports: [forwardRef(() => EmailModule), NotificationSettingsModule],
    providers: [BillingSchedulerService],
    exports: [BillingSchedulerService],
})
export class SchedulerModule { }
