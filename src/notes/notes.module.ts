import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';

@Module({
  imports: [AuthModule],
  providers: [NotesService],
  controllers: [NotesController],
  exports: [NotesService],
})
export class NotesModule {}

