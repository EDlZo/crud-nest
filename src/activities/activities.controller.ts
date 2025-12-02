import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly svc: ActivitiesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateActivityDto, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.create(dto, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('ActivitiesController.create error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('relatedTo') relatedTo?: string,
    @Query('relatedId') relatedId?: string,
  ) {
    try {
      const user = req.user;
      const filters: any = {};
      if (type) filters.type = type;
      if (status) filters.status = status;
      if (relatedTo) filters.relatedTo = relatedTo;
      if (relatedId) filters.relatedId = relatedId;
      
      return await this.svc.findAll(
        { userId: user.userId, email: user.email, role: user.role },
        filters
      );
    } catch (err) {
      console.error('ActivitiesController.findAll error:', err);
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
      console.error('ActivitiesController.findOne error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateActivityDto, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.update(id, dto, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('ActivitiesController.update error:', err);
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
      console.error('ActivitiesController.remove error:', err);
      throw err;
    }
  }
}

