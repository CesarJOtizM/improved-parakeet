import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsInt, Min, IsDateString } from 'class-validator';

export class GetTransfersQueryDto {
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
    description: 'Filter by from warehouse ID',
    example: 'warehouse-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'From warehouse ID must be a string' })
  fromWarehouseId?: string;

  @ApiProperty({
    description: 'Filter by to warehouse ID',
    example: 'warehouse-456',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'To warehouse ID must be a string' })
  toWarehouseId?: string;

  @ApiProperty({
    description: 'Filter by transfer status',
    example: 'IN_TRANSIT',
    enum: ['DRAFT', 'IN_TRANSIT', 'PARTIAL', 'RECEIVED', 'REJECTED', 'CANCELED'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  @IsEnum(['DRAFT', 'IN_TRANSIT', 'PARTIAL', 'RECEIVED', 'REJECTED', 'CANCELED'], {
    message: 'Status must be one of: DRAFT, IN_TRANSIT, PARTIAL, RECEIVED, REJECTED, CANCELED',
  })
  status?: string;

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
    enum: ['status', 'createdAt', 'initiatedAt', 'receivedAt'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'SortBy must be a string' })
  @IsEnum(['status', 'createdAt', 'initiatedAt', 'receivedAt'], {
    message: 'SortBy must be one of: status, createdAt, initiatedAt, receivedAt',
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
