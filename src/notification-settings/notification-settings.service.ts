import { Injectable, Logger } from '@nestjs/common';
import { getFirestore } from 'firebase-admin/firestore';
import { NotificationSettingsDto } from './dto/notification-settings.dto';

const SETTINGS_DOC_ID = 'notification-settings';

@Injectable()
export class NotificationSettingsService {
    private readonly logger = new Logger(NotificationSettingsService.name);
    private db = getFirestore();

    async getSettings(): Promise<NotificationSettingsDto | null> {
        try {
            const doc = await this.db.collection('settings').doc(SETTINGS_DOC_ID).get();
            if (!doc.exists) {
                return this.getDefaultSettings();
            }
            return doc.data() as NotificationSettingsDto;
        } catch (error) {
            this.logger.error('Error fetching notification settings', error);
            return this.getDefaultSettings();
        }
    }

    async updateSettings(settings: NotificationSettingsDto): Promise<NotificationSettingsDto> {
        try {
            await this.db.collection('settings').doc(SETTINGS_DOC_ID).set(settings, { merge: true });
            this.logger.log('Notification settings updated');
            return settings;
        } catch (error) {
            this.logger.error('Error updating notification settings', error);
            throw error;
        }
    }

    async getActiveRecipients(): Promise<string[]> {
        const settings = await this.getSettings();
        if (!settings) return [];
        return settings.recipients
            .filter((r) => r.active)
            .map((r) => r.email);
    }

    private getDefaultSettings(): NotificationSettingsDto {
        return {
            recipients: [],
            advanceNotification: true,
            advanceDays: 7,
            onBillingDate: true,
            notificationTime: '09:00',
            emailTemplate: '',
        };
    }
}
