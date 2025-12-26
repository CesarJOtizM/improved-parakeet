import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';

export class CreateReturnLineDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'product-123',
  })
  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;

  @ApiProperty({
    description: 'Location ID',
    example: 'location-123',
  })
  @IsString({ message: 'Location ID must be a string' })
  @IsNotEmpty({ message: 'Location ID is required' })
  locationId!: string;

  @ApiProperty({
    description: 'Quantity',
    example: 10,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0.01, { message: 'Quantity must be greater than 0' })
  quantity!: number;

  @ApiProperty({
    description: 'Original sale price per unit (required for customer returns)',
    example: 150.5,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Original sale price must be a number' })
  @Min(0.01, { message: 'Original sale price must be greater than 0' })
  originalSalePrice?: number;

  @ApiProperty({
    description: 'Original unit cost (required for supplier returns)',
    example: 100.0,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Original unit cost must be a number' })
  @Min(0.01, { message: 'Original unit cost must be greater than 0' })
  originalUnitCost?: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'COP',
    required: false,
    default: 'COP',
  })
  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  currency?: string;
}

export class CreateReturnDto {
  @ApiProperty({
    description: 'Return type',
    example: 'RETURN_CUSTOMER',
    enum: ['RETURN_CUSTOMER', 'RETURN_SUPPLIER'],
  })
  @IsEnum(['RETURN_CUSTOMER', 'RETURN_SUPPLIER'], {
    message: 'Type must be either RETURN_CUSTOMER or RETURN_SUPPLIER',
  })
  @IsNotEmpty({ message: 'Type is required' })
  type!: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER';

  @ApiProperty({
    description: 'Warehouse ID',
    example: 'warehouse-123',
  })
  @IsString({ message: 'Warehouse ID must be a string' })
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId!: string;

  @ApiProperty({
    description: 'Sale ID (required for customer returns)',
    example: 'sale-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Sale ID must be a string' })
  saleId?: string;

  @ApiProperty({
    description: 'Source movement ID (required for supplier returns)',
    example: 'movement-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Source movement ID must be a string' })
  sourceMovementId?: string;

  @ApiProperty({
    description: 'Return reason',
    example: 'Defective product',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;

  @ApiProperty({
    description: 'Note',
    example: 'Return note',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note?: string;

  @ApiProperty({
    description: 'Return lines',
    type: [CreateReturnLineDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Lines must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateReturnLineDto)
  lines?: CreateReturnLineDto[];
}
