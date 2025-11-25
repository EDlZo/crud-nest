import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CrudsService } from './cruds.service';
import { CrudsController } from './cruds.controller';

@Module({
  imports: [AuthModule],
  controllers: [CrudsController],
  providers: [CrudsService],
})
export class CrudsModule {}
