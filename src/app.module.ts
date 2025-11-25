import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CrudsModule } from './cruds/cruds.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [CrudsModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
