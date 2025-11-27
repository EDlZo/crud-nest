import { IsOptional, IsString, IsObject } from 'class-validator';

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
  @IsObject()
  socials?: Record<string, string>;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
