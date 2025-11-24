import { Module } from '@nestjs/common';
import { CrudsService } from './cruds.service';
import { CrudsController } from './cruds.controller';

@Module({
  controllers: [CrudsController],
  providers: [CrudsService],
})
export class CrudsModule {}
