import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class AdminUserDto {
  @ApiProperty({
    description: 'Admin user email',
    example: 'admin@company.com',
  })
  @IsEmail({}, { message: 'Email must have a valid format' })
  @IsString({ message: 'Email must be a string' })
  email!: string;

  @ApiProperty({
    description: 'Admin user username',
    example: 'admin',
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must have at least 3 characters' })
  @MaxLength(50, { message: 'Username cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, hyphens and underscores',
  })
  username!: string;

  @ApiProperty({
    description: 'Admin user password',
    example: 'AdminPassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'Password must be a string' })
  @MinLength(8, { message: 'Password must have at least 8 characters' })
  @MaxLength(128, { message: 'Password cannot exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/, {
    message:
      'Password must contain at least one lowercase letter, one uppercase letter, one number and one special character',
  })
  password!: string;

  @ApiProperty({
    description: 'Admin user first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must have at least 2 characters' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName!: string;

  @ApiProperty({
    description: 'Admin user last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must have at least 2 characters' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName!: string;
}

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Mi Empresa S.A.',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Organization name must be a string' })
  @MinLength(2, { message: 'Organization name must have at least 2 characters' })
  @MaxLength(100, { message: 'Organization name cannot exceed 100 characters' })
  name!: string;

  @ApiProperty({
    description: 'Organization slug (unique identifier, used in URLs)',
    example: 'mi-empresa',
    minLength: 3,
    maxLength: 50,
  })
  @IsString({ message: 'Slug must be a string' })
  @MinLength(3, { message: 'Slug must have at least 3 characters' })
  @MaxLength(50, { message: 'Slug cannot exceed 50 characters' })
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug can only contain lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @ApiProperty({
    description: 'Organization domain (optional, for subdomain routing)',
    example: 'demo.example.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Domain must be a string' })
  @Matches(/^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/, {
    message: 'Domain must be a valid domain name (e.g., demo.example.com)',
  })
  domain?: string;

  @ApiProperty({
    description: 'Timezone (ISO 8601 format)',
    example: 'America/Santiago',
    default: 'UTC',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  timezone?: string;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'CLP',
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
  @IsString({ message: 'Date format must be a string' })
  dateFormat?: string;

  @ApiProperty({
    description: 'Admin user data (optional, can be created later)',
    type: AdminUserDto,
    required: false,
  })
  @IsOptional()
  @ValidateIf(o => o.adminUser !== undefined)
  adminUser?: AdminUserDto;
}
