import { IsOptional, IsString, IsObject, IsArray, IsNumber, ValidateNested, IsBoolean, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class ServiceDto {
  @IsString()
  name: string;

  @IsNumber()
  amount: number;
}

export class SubscriptionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsString()
  planName?: string;

  @IsOptional()
  @IsIn(['active', 'trialing', 'past_due', 'canceled'])
  status?: 'active' | 'trialing' | 'past_due' | 'canceled';

  @IsOptional()
  @IsIn(['monthly', 'yearly', 'quarterly'])
  interval?: 'monthly' | 'yearly' | 'quarterly';

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  nextBillingDate?: string;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

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

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SubscriptionDto)
  subscription?: SubscriptionDto;
}
