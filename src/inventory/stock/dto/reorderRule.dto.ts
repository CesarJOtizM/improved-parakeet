import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateReorderRuleDto {
  @ApiProperty({ description: 'Product ID', example: 'clxyz123...' })
  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;

  @ApiProperty({ description: 'Warehouse ID', example: 'clxyz456...' })
  @IsString({ message: 'Warehouse ID must be a string' })
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId!: string;

  @ApiProperty({ description: 'Minimum quantity threshold', example: 5 })
  @IsNumber({}, { message: 'Minimum quantity must be a number' })
  @Min(0, { message: 'Minimum quantity cannot be negative' })
  minQty!: number;

  @ApiProperty({ description: 'Maximum quantity threshold', example: 100 })
  @IsNumber({}, { message: 'Maximum quantity must be a number' })
  @Min(1, { message: 'Maximum quantity must be at least 1' })
  maxQty!: number;

  @ApiProperty({ description: 'Safety stock quantity', example: 2 })
  @IsNumber({}, { message: 'Safety stock must be a number' })
  @Min(0, { message: 'Safety stock cannot be negative' })
  safetyQty!: number;
}

export class UpdateReorderRuleDto {
  @ApiProperty({ description: 'Minimum quantity threshold', example: 5, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Minimum quantity must be a number' })
  @Min(0, { message: 'Minimum quantity cannot be negative' })
  minQty?: number;

  @ApiProperty({ description: 'Maximum quantity threshold', example: 100, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Maximum quantity must be a number' })
  @Min(1, { message: 'Maximum quantity must be at least 1' })
  maxQty?: number;

  @ApiProperty({ description: 'Safety stock quantity', example: 2, required: false })
  @IsOptional()
  @IsNumber({}, { message: 'Safety stock must be a number' })
  @Min(0, { message: 'Safety stock cannot be negative' })
  safetyQty?: number;
}
