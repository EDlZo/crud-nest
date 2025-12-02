import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

export class CreateActivityDto {
  @IsEnum(['task', 'call', 'email', 'meeting', 'note'])
  type: 'task' | 'call' | 'email' | 'meeting' | 'note';

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(['company', 'contact', 'deal'])
  relatedTo?: 'company' | 'contact' | 'deal';

  @IsOptional()
  @IsString()
  relatedId?: string;

  @IsEnum(['pending', 'in_progress', 'completed', 'cancelled'])
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  priority?: 'low' | 'medium' | 'high';

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;
}

