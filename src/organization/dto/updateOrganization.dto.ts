import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Mi Empresa S.A.',
    minLength: 2,
    maxLength: 100,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must have at least 2 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name?: string;

  @ApiProperty({
    description: 'Unique slug for the organization (URL-friendly identifier)',
    example: 'mi-empresa',
    minLength: 3,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Slug must be a string' })
  @Length(3, 50, { message: 'Slug must be between 3 and 50 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers and hyphens',
  })
  slug?: string;

  @ApiProperty({
    description: 'Organization domain (optional, for multi-tenant subdomain routing)',
    example: 'miempresa.example.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Domain must be a string' })
  @MaxLength(255, { message: 'Domain cannot exceed 255 characters' })
  domain?: string;

  @ApiProperty({
    description: 'Timezone for the organization',
    example: 'America/Bogota',
    default: 'UTC',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  timezone?: string;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'COP',
    default: 'USD',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  @Length(3, 3, { message: 'Currency must be a 3-character ISO code' })
  currency?: string;

  @ApiProperty({
    description: 'Date format',
    example: 'YYYY-MM-DD',
    default: 'YYYY-MM-DD',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'DateFormat must be a string' })
  dateFormat?: string;

  @ApiProperty({
    description: 'Whether the organization is active',
    example: true,
    default: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
