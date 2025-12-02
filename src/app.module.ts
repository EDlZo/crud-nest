import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrudsModule } from './cruds/cruds.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';
import { ActivitiesModule } from './activities/activities.module';
import { NotesModule } from './notes/notes.module';
import { DealsModule } from './deals/deals.module';

@Module({
  imports: [CrudsModule, AuthModule, CompaniesModule, ActivitiesModule, NotesModule, DealsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
