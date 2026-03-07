import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class ListImportBatchesQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number;

  @ApiPropertyOptional({
    description: 'Filter by import type',
    enum: ['PRODUCTS', 'MOVEMENTS', 'WAREHOUSES', 'STOCK', 'TRANSFERS'],
  })
  @IsOptional()
  @IsEnum(['PRODUCTS', 'MOVEMENTS', 'WAREHOUSES', 'STOCK', 'TRANSFERS'])
  type?: string;

  @ApiPropertyOptional({
    description: 'Filter by import status',
    enum: ['PENDING', 'VALIDATING', 'VALIDATED', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
  @IsOptional()
  @IsEnum(['PENDING', 'VALIDATING', 'VALIDATED', 'PROCESSING', 'COMPLETED', 'FAILED'])
  status?: string;
}
