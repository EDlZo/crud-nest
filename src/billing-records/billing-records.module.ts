import { Module, forwardRef } from '@nestjs/common';
import { BillingRecordsService } from './billing-records.service';
import { BillingRecordsController } from './billing-records.controller';
import { EmailModule } from '../email/email.module';
import { NotificationSettingsModule } from '../notification-settings/notification-settings.module';

@Module({
  imports: [forwardRef(() => EmailModule), NotificationSettingsModule],
  controllers: [BillingRecordsController],
  providers: [BillingRecordsService],
  exports: [BillingRecordsService],
})
export class BillingRecordsModule {}
