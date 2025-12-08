import { IsOptional, IsString, IsObject, IsArray } from 'class-validator';

export class CreateCompanyDto {
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
  @IsString()
  billingDate?: string;

  @IsOptional()
  @IsString()
  notificationDate?: string;

  @IsOptional()
  @IsString()
  billingCycle?: 'monthly' | 'yearly' | 'quarterly';

  @IsOptional()
  @IsString()
  type?: 'individual' | 'company';

  @IsOptional()
  @IsObject()
  socials?: Record<string, string>;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contacts?: string[];
}
