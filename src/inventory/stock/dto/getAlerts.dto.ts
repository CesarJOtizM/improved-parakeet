import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, IsString, IsEnum, IsNumber, Min } from 'class-validator';

export class GetAlertsDto {
  @ApiProperty({
    description: 'Product ID filter',
    example: 'product-id-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Product ID must be a string' })
  productId?: string;

  @ApiProperty({
    description: 'Warehouse ID filter',
    example: 'warehouse-id-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Warehouse ID must be a string' })
  warehouseId?: string;

  @ApiProperty({
    description: 'Alert severity filter',
    example: 'LOW',
    enum: ['LOW', 'CRITICAL', 'OUT_OF_STOCK'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['LOW', 'CRITICAL', 'OUT_OF_STOCK'], {
    message: 'Severity must be one of: LOW, CRITICAL, OUT_OF_STOCK',
  })
  severity?: 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK';

  @ApiProperty({
    description: 'Page number (for pagination)',
    example: 1,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number;

  @ApiProperty({
    description: 'Items per page (for pagination)',
    example: 10,
    required: false,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  limit?: number;
}
