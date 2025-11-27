import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly svc: CompaniesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateCompanyDto, @Request() req: any) {
    const user = req.user;
    return this.svc.create(dto, { userId: user.sub, email: user.email, role: user.role });
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req: any) {
    const user = req.user;
    return this.svc.findAll({ userId: user.sub, email: user.email, role: user.role });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    return this.svc.findOne(id, { userId: user.sub, email: user.email, role: user.role });
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @Request() req: any) {
    const user = req.user;
    return this.svc.update(id, dto, { userId: user.sub, email: user.email, role: user.role });
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    return this.svc.remove(id, { userId: user.sub, email: user.email, role: user.role });
  }
}
