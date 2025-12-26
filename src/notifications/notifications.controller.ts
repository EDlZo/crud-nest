import { Controller, Get, UseGuards, Req, Patch, Param } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: any) {
    const email = req.user?.email;
    if (!email) return [];
    return this.notificationsService.findForEmail(email);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id);
  }
}
