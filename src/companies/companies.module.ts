import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';

@Module({
  imports: [AuthModule],
  providers: [CompaniesService],
  controllers: [CompaniesController],
  exports: [CompaniesService],
})
export class CompaniesModule {}
