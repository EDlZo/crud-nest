import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateEventDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  date?: string; // yyyy-MM-dd

  @IsOptional()
  @IsString()
  startTime?: string; // HH:mm

  @IsOptional()
  @IsString()
  endTime?: string; // ISO or HH:mm

  @IsOptional()
  @IsString()
  start?: string; // ISO datetime

  @IsOptional()
  @IsString()
  end?: string; // ISO datetime

  @IsOptional()
  @IsNumber()
  reminderMinutesBefore?: number;

  // Accept client-side `reminder` string (e.g. '15m','1h') as optional fallback
  @IsOptional()
  @IsString()
  reminder?: string;

  @IsOptional()
  @IsString()
  ownerUserId?: string;
}
