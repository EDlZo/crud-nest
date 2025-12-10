import { IsOptional, IsString, IsObject, IsArray, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @IsNumber()
  amountDue?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceDto)
  services?: ServiceDto[];
}

export class ServiceDto {
  @IsString()
  name: string;

  @IsNumber()
  amount: number;
}
