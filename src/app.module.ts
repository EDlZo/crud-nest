import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrudsModule } from './cruds/cruds.module';
import { AuthModule } from './auth/auth.module';
import { CompaniesModule } from './companies/companies.module';

@Module({
  imports: [CrudsModule, AuthModule, CompaniesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
