import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({
    description: 'User email',
    example: 'user@company.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email must have a valid format' })
  @IsString({ message: 'Email must be a string' })
  email?: string;

  @ApiProperty({
    description: 'Unique username',
    example: 'user123',
    minLength: 3,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @MinLength(3, { message: 'Username must have at least 3 characters' })
  @MaxLength(50, { message: 'Username cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    message: 'Username can only contain letters, numbers, hyphens and underscores',
  })
  username?: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'First name must be a string' })
  @MinLength(2, { message: 'First name must have at least 2 characters' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  firstName?: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
    minLength: 2,
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Last name must be a string' })
  @MinLength(2, { message: 'Last name must have at least 2 characters' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  lastName?: string;

  @ApiProperty({
    description: 'User status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  @Matches(/^(ACTIVE|INACTIVE)$/, {
    message: 'Status must be either ACTIVE or INACTIVE',
  })
  status?: 'ACTIVE' | 'INACTIVE';
}
