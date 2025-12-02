import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly svc: DealsService) {}

  @Post()
  async create(@Body() dto: CreateDealDto, @Request() req: any) {
    const user = req.user;
    return this.svc.create(dto, { userId: user.userId, email: user.email, role: user.role });
  }

  @Get()
  async findAll(@Request() req: any) {
    const user = req.user;
    return this.svc.findAll({ userId: user.userId, email: user.email, role: user.role });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    return this.svc.findOne(id, { userId: user.userId, email: user.email, role: user.role });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDealDto, @Request() req: any) {
    const user = req.user;
    return this.svc.update(id, dto, { userId: user.userId, email: user.email, role: user.role });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    return this.svc.remove(id, { userId: user.userId, email: user.email, role: user.role });
  }
}
