import { Controller, Post, Body, UseGuards, Req, Get, Param, Patch, Delete, Put } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() dto: CreateEventDto) {
    console.debug('EventsController.create called', { user: req.user, dto });
    return this.eventsService.create(dto, req.user || { userId: 'anonymous' });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Req() req: any) {
    return this.eventsService.findAll(req.user || { userId: 'anonymous' });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Req() req: any, @Param('id') id: string) {
    return this.eventsService.findOne(id, req.user || { userId: 'anonymous' });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto, req.user || { userId: 'anonymous' });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.eventsService.remove(id, req.user || { userId: 'anonymous' });
  }

  @UseGuards(JwtAuthGuard)
  @Put('bulk')
  async bulkReplace(@Req() req: any, @Body() items: any[]) {
    return this.eventsService.bulkReplace(items || [], req.user || { userId: 'anonymous' });
  }
}
