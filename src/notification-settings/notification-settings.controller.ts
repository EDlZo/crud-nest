import { Controller, Get, Put, Body, UseGuards, Logger } from '@nestjs/common';
import { NotificationSettingsService } from './notification-settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('notification-settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
export class NotificationSettingsController {
    private readonly logger = new Logger(NotificationSettingsController.name);

    constructor(private readonly settingsService: NotificationSettingsService) { }

    @Get()
    async getSettings() {
        try {
            this.logger.log('Getting notification settings');
            return await this.settingsService.getSettings();
        } catch (error) {
            this.logger.error('Error getting settings', error);
            throw error;
        }
    }

    @Put()
    async updateSettings(@Body() settings: any) {
        try {
            this.logger.log('Updating notification settings');
            this.logger.log('Received settings: ' + JSON.stringify(settings));
            return await this.settingsService.updateSettings(settings);
        } catch (error) {
            this.logger.error('Error updating settings', error);
            throw error;
        }
    }
}
