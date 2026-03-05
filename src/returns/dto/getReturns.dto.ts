import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsDateString, IsInt, Min } from 'class-validator';

export class GetReturnsDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be greater than 0' })
  page?: number;

  @ApiProperty({
    description: 'Items per page',
    example: 10,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer' })
  @Min(1, { message: 'Limit must be greater than 0' })
  limit?: number;

  @ApiProperty({
    description: 'Search by return number',
    example: 'RETURN-2026',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiProperty({
    description: 'Warehouse ID filter',
    example: 'warehouse-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Warehouse ID must be a string' })
  warehouseId?: string;

  @ApiProperty({
    description: 'Status filter',
    example: 'DRAFT',
    enum: ['DRAFT', 'CONFIRMED', 'CANCELLED'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  status?: string;

  @ApiProperty({
    description: 'Type filter',
    example: 'RETURN_CUSTOMER',
    enum: ['RETURN_CUSTOMER', 'RETURN_SUPPLIER'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Type must be a string' })
  type?: string;

  @ApiProperty({
    description: 'Filter by company ID',
    example: 'clxyz...',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'CompanyId must be a string' })
  companyId?: string;

  @ApiProperty({
    description: 'Start date for date range filter',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid date string' })
  startDate?: string;

  @ApiProperty({
    description: 'End date for date range filter',
    example: '2024-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid date string' })
  endDate?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'createdAt',
    enum: [
      'returnNumber',
      'type',
      'status',
      'total',
      'warehouseName',
      'items',
      'createdAt',
      'confirmedAt',
    ],
    required: false,
  })
  @IsOptional()
  @IsEnum(
    [
      'returnNumber',
      'type',
      'status',
      'total',
      'warehouseName',
      'items',
      'createdAt',
      'confirmedAt',
    ],
    {
      message:
        'Sort by must be one of: returnNumber, type, status, total, warehouseName, items, createdAt, confirmedAt',
    }
  )
  sortBy?: string;

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'], {
    message: 'Sort order must be one of: asc, desc',
  })
  sortOrder?: 'asc' | 'desc';
}
