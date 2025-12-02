import { IsString, IsEnum, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsEnum(['company', 'contact', 'deal', 'activity'])
  relatedTo: 'company' | 'contact' | 'deal' | 'activity';

  @IsString()
  relatedId: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPrivate?: boolean;
}

