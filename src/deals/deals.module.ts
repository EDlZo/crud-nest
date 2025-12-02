import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';

@Module({
  imports: [AuthModule],
  providers: [DealsService],
  controllers: [DealsController],
  exports: [DealsService],
})
export class DealsModule {}
