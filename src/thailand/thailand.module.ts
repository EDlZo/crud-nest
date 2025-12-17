import { Module } from '@nestjs/common';
import { ThailandController } from './thailand.controller';
import { ThailandService } from './thailand.service';

@Module({
  controllers: [ThailandController],
  providers: [ThailandService],
  exports: [ThailandService],
})
export class ThailandModule {}
