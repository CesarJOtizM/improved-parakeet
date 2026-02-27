import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsBoolean, IsInt, Min, Max, IsEnum } from 'class-validator';

export class GetWarehousesQueryDto {
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
    description: 'Filter by active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'IsActive must be a boolean' })
  isActive?: boolean;

  @ApiProperty({
    description: 'Search term (searches in name, code)',
    example: 'main',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Search must be a string' })
  search?: string;

  @ApiProperty({
    description: 'Sort by field',
    example: 'name',
    enum: ['name', 'code', 'isActive', 'createdAt', 'updatedAt'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'SortBy must be a string' })
  @IsEnum(['name', 'code', 'isActive', 'createdAt', 'updatedAt'], {
    message: 'SortBy must be one of: name, code, isActive, createdAt, updatedAt',
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
