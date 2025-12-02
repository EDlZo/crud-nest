import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Request } from '@nestjs/common';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('deals')
export class DealsController {
  constructor(private readonly svc: DealsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateDealDto, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.create(dto, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('DealsController.create error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(
    @Request() req: any,
    @Query('stage') stage?: string,
    @Query('relatedTo') relatedTo?: string,
    @Query('relatedId') relatedId?: string,
  ) {
    try {
      const user = req.user;
      const filters: any = {};
      if (stage) filters.stage = stage;
      if (relatedTo) filters.relatedTo = relatedTo;
      if (relatedId) filters.relatedId = relatedId;
      
      return await this.svc.findAll(
        { userId: user.userId, email: user.email, role: user.role },
        filters
      );
    } catch (err) {
      console.error('DealsController.findAll error:', err);
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
      console.error('DealsController.findOne error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDealDto, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.update(id, dto, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('DealsController.update error:', err);
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
      console.error('DealsController.remove error:', err);
      throw err;
    }
  }
}

