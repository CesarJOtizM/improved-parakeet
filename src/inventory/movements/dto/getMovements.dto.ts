import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsInt, Min, IsDateString } from 'class-validator';

export class GetMovementsQueryDto {
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
  limit?: number;

  @ApiProperty({
    description: 'Filter by warehouse ID',
    example: 'warehouse-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Warehouse ID must be a string' })
  warehouseId?: string;

  @ApiProperty({
    description: 'Filter by movement status',
    example: 'POSTED',
    enum: ['DRAFT', 'POSTED', 'VOID', 'RETURNED'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  status?: string;

  @ApiProperty({
    description: 'Filter by movement type',
    example: 'IN',
    enum: ['IN', 'OUT', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER_OUT', 'TRANSFER_IN'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Type must be a string' })
  type?: string;

  @ApiProperty({
    description: 'Filter by product ID',
    example: 'product-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Product ID must be a string' })
  productId?: string;

  @ApiProperty({
    description: 'Start date (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Start date must be a valid ISO date string' })
  startDate?: string;

  @ApiProperty({
    description: 'End date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'End date must be a valid ISO date string' })
  endDate?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'createdAt',
    enum: ['type', 'status', 'createdAt', 'postedAt'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'SortBy must be a string' })
  @IsEnum(['type', 'status', 'createdAt', 'postedAt'], {
    message: 'SortBy must be one of: type, status, createdAt, postedAt',
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
