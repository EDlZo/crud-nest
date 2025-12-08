import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EmailService } from './email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('email')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EmailController {
    constructor(private readonly emailService: EmailService) { }

    @Post('test')
    @Roles('admin', 'superadmin')
    async sendTestEmail(@Body('email') email: string) {
        const success = await this.emailService.sendTestEmail(email);
        return { success, message: success ? 'Test email sent' : 'Failed to send test email' };
    }
}
