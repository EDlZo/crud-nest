import { IsOptional, IsString, IsObject, IsEnum, IsNumberString } from 'class-validator';

export class CreateCompanyDto {
  @IsEnum(['individual', 'company'])
  type: 'individual' | 'company';

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  fax?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  branchName?: string;

  @IsOptional()
  @IsString()
  branchNumber?: string;

  @IsOptional()
  @IsNumberString()
  billingDate?: string; // วันที่เรียกเก็บเงิน (1-31)

  @IsOptional()
  @IsNumberString()
  notificationDate?: string; // วันที่แจ้งเตือนล่วงหน้า (1-31)

  @IsOptional()
  @IsEnum(['monthly', 'yearly', 'quarterly'])
  billingCycle?: 'monthly' | 'yearly' | 'quarterly';

  @IsOptional()
  @IsObject()
  socials?: Record<string, string>;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
