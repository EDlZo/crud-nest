import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards, Request } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VisibilityGuard } from '../auth/visibility.guard';
import { PageVisibility } from '../auth/page-visibility.decorator';

@UseGuards(JwtAuthGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly svc: ActivitiesService) {}

  @Post()
  async create(@Body() dto: CreateActivityDto, @Request() req: any) {
    const user = req.user;
    console.log('ActivitiesController.create - raw body:', JSON.stringify(req.body));
    console.log('ActivitiesController.create - dto:', dto);
    console.log('ActivitiesController.create - user:', { userId: user.userId, email: user.email, role: user.role });
    return this.svc.create(dto, { userId: user.userId, email: user.email, role: user.role });
  }

  @UseGuards(VisibilityGuard)
  @PageVisibility('activities')
  @Get()
  async findAll(@Request() req: any) {
    const user = req.user;
    return this.svc.findAll({ userId: user.userId, email: user.email, role: user.role });
  }

  @UseGuards(VisibilityGuard)
  @PageVisibility('activities')
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    return this.svc.findOne(id, { userId: user.userId, email: user.email, role: user.role });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateActivityDto, @Request() req: any) {
    const user = req.user;
    return this.svc.update(id, dto, { userId: user.userId, email: user.email, role: user.role });
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req: any) {
    const user = req.user;
    return this.svc.remove(id, { userId: user.userId, email: user.email, role: user.role });
  }
}
