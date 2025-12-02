import { IsString, IsEnum, IsOptional, IsNumber, IsDateString, IsArray } from 'class-validator';

export class CreateDealDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsEnum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
  stage: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

  @IsOptional()
  @IsNumber()
  probability?: number;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsOptional()
  @IsEnum(['company', 'contact'])
  relatedTo?: 'company' | 'contact';

  @IsOptional()
  @IsString()
  relatedId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

