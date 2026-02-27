import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GetUsersQueryDto {
  @ApiProperty({
    description: 'Page number (1-based)',
    example: 1,
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit must be at most 100' })
  limit?: number;

  @ApiProperty({
    description: 'Filter by user status',
    example: 'ACTIVE',
    required: false,
    enum: ['ACTIVE', 'INACTIVE', 'LOCKED'],
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  status?: string;

  @ApiProperty({
    description: 'Search term (searches in email, username, first name, last name)',
    example: 'john',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['email', 'username', 'firstName', 'lastName', 'status', 'createdAt', 'lastLoginAt'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'SortBy must be a string' })
  @IsEnum(['email', 'username', 'firstName', 'lastName', 'status', 'createdAt', 'lastLoginAt'], {
    message:
      'SortBy must be one of: email, username, firstName, lastName, status, createdAt, lastLoginAt',
  })
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    example: 'asc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'SortOrder must be a string' })
  @IsEnum(['asc', 'desc'], {
    message: 'SortOrder must be one of: asc, desc',
  })
  sortOrder?: 'asc' | 'desc';
}

export class GetUsersResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Users retrieved successfully' })
  message!: string;

  @ApiProperty({
    description: 'List of users',
    type: 'array',
    example: [
      {
        id: 'user-123',
        email: 'user@example.com',
        username: 'johndoe',
        firstName: 'John',
        lastName: 'Doe',
        status: 'ACTIVE',
        roles: ['ADMIN'],
        lastLoginAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  })
  data!: Array<{
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    status: string;
    roles: string[];
    lastLoginAt?: Date;
    createdAt: Date;
  }>;

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrev: false,
    },
  })
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
