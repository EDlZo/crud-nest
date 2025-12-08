import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { EmailController } from './email.controller';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';

@Module({
    imports: [NotificationSettingsModule],
    providers: [EmailService],
    controllers: [EmailController],
    exports: [EmailService],
})
export class EmailModule { }
