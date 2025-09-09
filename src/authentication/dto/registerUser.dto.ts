import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterUserDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@company.com',
  })
  @IsEmail({}, { message: 'Email must have a valid format' })
  @IsString({ message: 'Email must be a string' })
  email!: string;

  @ApiProperty({
    description: 'Unique username',
    example: 'user123',
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
    description: 'User password',
    example: 'Password123!',
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
    description: 'User first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must have at least 2 characters' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName!: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must have at least 2 characters' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName!: string;

  @ApiProperty({
    description: 'Organization slug (optional if organizationId is provided)',
    example: 'my-company',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Organization slug must be a string' })
  organizationSlug?: string;

  @ApiProperty({
    description: 'Organization ID (optional if organizationSlug is provided)',
    example: 'clx1234567890abcdef',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Organization ID must be a string' })
  organizationId?: string;
}
