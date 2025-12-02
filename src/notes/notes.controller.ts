import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notes')
export class NotesController {
  constructor(private readonly svc: NotesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateNoteDto, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.create(dto, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('NotesController.create error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: any,
    @Query('relatedTo') relatedTo?: string,
    @Query('relatedId') relatedId?: string,
  ) {
    try {
      const user = req.user;
      const filters: any = {};
      if (relatedTo) filters.relatedTo = relatedTo;
      if (relatedId) filters.relatedId = relatedId;
      
      return await this.svc.findAll(
        { userId: user.userId, email: user.email, role: user.role },
        filters
      );
    } catch (err) {
      console.error('NotesController.findAll error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.findOne(id, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('NotesController.findOne error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateNoteDto, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.update(id, dto, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('NotesController.update error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.remove(id, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('NotesController.remove error:', err);
      throw err;
    }
  }
}

