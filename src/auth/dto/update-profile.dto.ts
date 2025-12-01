import { IsOptional, IsString, IsObject, Matches, ValidateIf } from 'class-validator';

export class UpdateProfileDto {
  @ValidateIf((o) => o.avatarUrl !== undefined && o.avatarUrl !== null && o.avatarUrl !== '')
  @IsString()
  @Matches(/^(https?:\/\/|data:image\/)/, {
    message: 'avatarUrl must be a valid URL or data URL',
  })
  avatarUrl?: string;

  @IsOptional()
  @IsObject()
  socials?: {
    line?: string;
    facebook?: string;
    instagram?: string;
  };
}

