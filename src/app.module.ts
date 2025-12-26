import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrudsModule } from './cruds/cruds.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { ActivitiesModule } from './activities/activities.module';
import { DealsModule } from './deals/deals.module';
import { EmailModule } from './email/email.module';
import { NotificationSettingsModule } from './notification-settings/notification-settings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BillingRecordsModule } from './billing-records/billing-records.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ThailandModule } from './thailand/thailand.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    CrudsModule,
    AuthModule,
    CompaniesModule,
    ActivitiesModule,
    DealsModule,
    EmailModule,
    NotificationSettingsModule,
    NotificationsModule,
    SchedulerModule,
    BillingRecordsModule,
    EventsModule,
    ThailandModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
