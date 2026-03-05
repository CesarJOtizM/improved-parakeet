import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsInt, Min, IsArray } from 'class-validator';

export class GetProductsQueryDto {
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
    description: 'Filter by product status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  @IsEnum(['ACTIVE', 'INACTIVE', 'DISCONTINUED'], {
    message: 'Status must be one of: ACTIVE, INACTIVE, DISCONTINUED',
  })
  status?: string;

  @ApiProperty({
    description: 'Search term (searches in name, SKU, description)',
    example: 'laptop',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiProperty({
    description: 'Filter by category IDs (comma-separated)',
    example: 'cat-id-1,cat-id-2',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((v: string) => v.trim())
          .filter(Boolean)
      : value
  )
  @IsArray({ message: 'categoryIds must be an array' })
  @IsString({ each: true, message: 'Each categoryId must be a string' })
  categoryIds?: string[];

  @ApiProperty({
    description: 'Filter by company ID',
    example: 'clxyz...',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'CompanyId must be a string' })
  companyId?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'name',
    enum: ['name', 'sku', 'status', 'price', 'createdAt', 'updatedAt'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'SortBy must be a string' })
  @IsEnum(['name', 'sku', 'status', 'price', 'createdAt', 'updatedAt'], {
    message: 'SortBy must be one of: name, sku, status, price, createdAt, updatedAt',
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
