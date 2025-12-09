import { Module, forwardRef } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';
import { SchedulerModule } from '../scheduler/scheduler.module';

@Module({
    imports: [NotificationSettingsModule, forwardRef(() => SchedulerModule)],
    providers: [EmailService],
    controllers: [EmailController],
    exports: [EmailService],
})
export class EmailModule { }
