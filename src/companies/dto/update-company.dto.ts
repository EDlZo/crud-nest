
import { PartialType } from '@nestjs/mapped-types';
import { CreateCompanyDto, ServiceDto } from './create-company.dto';
import { IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
	@IsOptional()
	@IsNumber()
	amountDue?: number;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ServiceDto)
	services?: ServiceDto[];
}
