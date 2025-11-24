import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrudsModule } from './cruds/cruds.module';

@Module({
  imports: [CrudsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
