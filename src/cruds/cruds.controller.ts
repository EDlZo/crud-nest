import { Controller, Get, Post, Body, Patch, Param, Delete, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CrudsService } from './cruds.service';
import { CreateCrudDto } from './dto/create-crud.dto';
import { UpdateCrudDto } from './dto/update-crud.dto';
import { Crud } from './entities/crud.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type AuthUser = {
  userId: string;
  email?: string;
};

type AuthenticatedRequest = Request & { user: AuthUser };

@UseGuards(JwtAuthGuard)
@Controller('cruds')
export class CrudsController {
  constructor(private readonly crudsService: CrudsService) {}

  @Post()
  create(@Body() createCrudDto: CreateCrudDto, @Req() req: AuthenticatedRequest): Promise<Crud> {
    return this.crudsService.create(createCrudDto, req.user);
  }

  @Get()
  findAll(): Promise<Crud[]> {
    return this.crudsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Crud> {
    return this.crudsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCrudDto: UpdateCrudDto, @Req() req: AuthenticatedRequest): Promise<Crud> {
    return this.crudsService.update(id, updateCrudDto, req.user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest): Promise<{ id: string }> {
    return this.crudsService.remove(id, req.user);
  }
}
