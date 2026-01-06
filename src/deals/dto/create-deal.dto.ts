import { IsString, IsNumber, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateDealDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  stage?: string;

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  probability?: number;

  @IsString()
  @IsOptional()
  expectedCloseDate?: string;

  @IsString()
  @IsOptional()
  relatedTo?: string;

  @IsString()
  @IsOptional()
  relatedId?: string;

  @IsString()
  @IsOptional()
  assignedTo?: string;
}
