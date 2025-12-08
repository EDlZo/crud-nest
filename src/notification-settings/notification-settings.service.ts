import { Injectable, Logger } from '@nestjs/common';
import { db } from '../firebase.config';
import { NotificationSettingsDto } from './dto/notification-settings.dto';

const SETTINGS_DOC_ID = 'notification-settings';

@Injectable()
export class NotificationSettingsService {
    private readonly logger = new Logger(NotificationSettingsService.name);

    async getSettings(): Promise<NotificationSettingsDto | null> {
        try {
            this.logger.log('Fetching notification settings from Firestore');
            const doc = await db.collection('settings').doc(SETTINGS_DOC_ID).get();
            if (!doc.exists) {
                this.logger.log('No notification settings found, returning defaults');
                return this.getDefaultSettings();
            }
            const data = doc.data() as NotificationSettingsDto;
            // Merge with defaults to ensure all fields exist
            return { ...this.getDefaultSettings(), ...data };
        } catch (error) {
            this.logger.error('Error fetching notification settings', error);
            return this.getDefaultSettings();
        }
    }

    async updateSettings(settings: NotificationSettingsDto): Promise<NotificationSettingsDto> {
        try {
            this.logger.log('Updating notification settings');
            // Ensure recipients is always an array
            const safeSettings = {
                ...settings,
                recipients: Array.isArray(settings.recipients) ? settings.recipients : [],
            };
            await db.collection('settings').doc(SETTINGS_DOC_ID).set(safeSettings, { merge: true });
            this.logger.log('Notification settings updated successfully');
            return safeSettings;
        } catch (error) {
            this.logger.error('Error updating notification settings', error);
            throw error;
        }
    }

    async getActiveRecipients(): Promise<string[]> {
        const settings = await this.getSettings();
        if (!settings || !Array.isArray(settings.recipients)) return [];
        return settings.recipients
            .filter((r) => r.active)
            .map((r) => r.email);
    }

    // ดึงอีเมลของ Admin และ Superadmin ทั้งหมดในระบบ
    async getAdminEmails(): Promise<string[]> {
        try {
            const usersCollection = db.collection(process.env.FIREBASE_USERS_COLLECTION ?? 'users');
            const snapshot = await usersCollection
                .where('role', 'in', ['admin', 'superadmin'])
                .get();
            
            const emails = snapshot.docs
                .map((doc) => doc.data()?.email)
                .filter((email): email is string => typeof email === 'string' && email.length > 0);
            
            this.logger.log(`Found ${emails.length} admin/superadmin emails`);
            return emails;
        } catch (error) {
            this.logger.error('Error fetching admin emails', error);
            return [];
        }
    }

    // ดึงผู้รับอีเมลทั้งหมด (รวม recipients ที่ตั้งไว้ + admin emails ถ้าเปิด sendToAdmins)
    async getAllRecipients(): Promise<string[]> {
        const settings = await this.getSettings();
        if (!settings) return [];

        const recipients = new Set<string>();

        // เพิ่ม active recipients ที่ตั้งไว้ด้วยตัวเอง
        if (Array.isArray(settings.recipients)) {
            settings.recipients
                .filter((r) => r && r.active)
                .forEach((r) => recipients.add(r.email));
        }

        // ถ้าเปิด sendToAdmins ให้ดึง admin emails เพิ่มเข้ามา
        if (settings.sendToAdmins) {
            const adminEmails = await this.getAdminEmails();
            adminEmails.forEach((email) => recipients.add(email));
        }

        return Array.from(recipients);
    }

    private getDefaultSettings(): NotificationSettingsDto {
        return {
            recipients: [],
            advanceNotification: true,
            advanceDays: 7,
            onBillingDate: true,
            notificationTime: '09:00',
            emailTemplate: '',
            sendToAdmins: false,
        };
    }
}
