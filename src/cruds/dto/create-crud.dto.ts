import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateCrudDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  phone: string;

  @IsString()
  address: string;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  amphoe?: string;

  @IsOptional()
  @IsString()
  tambon?: string;

  @IsOptional()
  @IsString()
  photo?: string;
}
