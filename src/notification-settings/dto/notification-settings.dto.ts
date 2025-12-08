import { IsString, IsBoolean, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class RecipientDto {
    @IsString()
    email: string;

    @IsBoolean()
    active: boolean;
}

export class NotificationSettingsDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RecipientDto)
    recipients: RecipientDto[];

    @IsBoolean()
    advanceNotification: boolean;

    @IsNumber()
    advanceDays: number;

    @IsBoolean()
    onBillingDate: boolean;

    @IsString()
    notificationTime: string;

    @IsOptional()
    @IsString()
    emailTemplate?: string;

    @IsOptional()
    @IsBoolean()
    sendToAdmins?: boolean; // ส่งอีเมลไปยัง Admin/Superadmin ทั้งหมดอัตโนมัติ
}
