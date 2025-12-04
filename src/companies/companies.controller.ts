import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { VisibilityGuard } from '../auth/visibility.guard';
import { PageVisibility } from '../auth/page-visibility.decorator';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly svc: CompaniesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() dto: CreateCompanyDto, @Request() req: any) {
    try {
      const user = req.user;
      // JWT strategy returns { userId, email, role }
      return await this.svc.create(dto, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('CompaniesController.create error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard, VisibilityGuard)
  @PageVisibility('companies')
  @Get()
  async findAll(@Request() req: any) {
    try {
      const user = req.user;
      console.log('CompaniesController.findAll - req.user:', user);
      // JWT strategy returns { userId, email, role }
      const result = await this.svc.findAll({ userId: user.userId, email: user.email, role: user.role });
      console.log('CompaniesController.findAll - result count:', result.length);
      return result;
    } catch (err) {
      console.error('CompaniesController.findAll error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard, VisibilityGuard)
  @PageVisibility('companies')
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.findOne(id, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('CompaniesController.findOne error:', err);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @Request() req: any) {
    try {
      const user = req.user;
      return await this.svc.update(id, dto, { userId: user.userId, email: user.email, role: user.role });
    } catch (err) {
      console.error('CompaniesController.update error:', err);
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
      console.error('CompaniesController.remove error:', err);
      throw err;
    }
  }
}
