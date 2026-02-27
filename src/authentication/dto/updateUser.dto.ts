import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must be a valid email address' })
  email?: string;

  @ApiProperty({
    description: 'Username (3-50 characters, alphanumeric, underscore, hyphen)',
    example: 'johndoe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must be at least 3 characters long' })
  @MaxLength(50, { message: 'Username must be at most 50 characters long' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username?: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(100, { message: 'First name must be at most 100 characters long' })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must be at least 2 characters long' })
  @MaxLength(100, { message: 'Last name must be at most 100 characters long' })
  lastName?: string;

  @ApiProperty({
    description: 'Phone number',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Phone must be a string' })
  @MaxLength(20, { message: 'Phone must be at most 20 characters long' })
  phone?: string;

  @ApiProperty({
    description: 'User timezone (IANA format)',
    example: 'America/Bogota',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Timezone must be a string' })
  @MaxLength(50, { message: 'Timezone must be at most 50 characters long' })
  timezone?: string;

  @ApiProperty({
    description: 'Preferred language',
    example: 'en',
    required: false,
    enum: ['en', 'es'],
  })
  @IsOptional()
  @IsString({ message: 'Language must be a string' })
  @IsIn(['en', 'es'], { message: 'Language must be either "en" or "es"' })
  language?: string;

  @ApiProperty({
    description: 'Job title',
    example: 'Warehouse Manager',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Job title must be a string' })
  @MaxLength(100, { message: 'Job title must be at most 100 characters long' })
  jobTitle?: string;

  @ApiProperty({
    description: 'Department',
    example: 'Operations',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Department must be a string' })
  @MaxLength(100, { message: 'Department must be at most 100 characters long' })
  department?: string;
}

export class UpdateUserResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'User updated successfully' })
  message!: string;

  @ApiProperty({
    description: 'Updated user data',
    example: {
      id: 'user-123',
      email: 'user@example.com',
      username: 'johndoe',
      firstName: 'John',
      lastName: 'Doe',
      status: 'ACTIVE',
      orgId: 'org-123',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  data!: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    phone?: string;
    timezone?: string;
    language?: string;
    jobTitle?: string;
    department?: string;
    status: string;
    orgId: string;
    updatedAt: Date;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
