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
  IsObject,
} from 'class-validator';

export class CreateSaleLineDto {
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
    description: 'Sale price per unit',
    example: 150.5,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'Sale price must be a number' })
  @Min(0.01, { message: 'Sale price must be greater than 0' })
  salePrice!: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'COP',
    required: false,
    default: 'COP',
  })
  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  currency?: string;

  @ApiProperty({
    description: 'Extra data (JSON object)',
    example: { discount: 10 },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Extra must be an object' })
  extra?: Record<string, unknown>;
}

export class CreateSaleDto {
  @ApiProperty({
    description: 'Warehouse ID',
    example: 'warehouse-123',
  })
  @IsString({ message: 'Warehouse ID must be a string' })
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId!: string;

  @ApiProperty({
    description: 'Customer reference (optional text)',
    example: 'John Doe',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Customer reference must be a string' })
  customerReference?: string;

  @ApiProperty({
    description: 'External reference (invoice, order, etc.)',
    example: 'INV-2024-001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'External reference must be a string' })
  externalReference?: string;

  @ApiProperty({
    description: 'Note',
    example: 'Sale note',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note?: string;

  @ApiProperty({
    description: 'Sale lines',
    type: [CreateSaleLineDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Lines must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateSaleLineDto)
  lines?: CreateSaleLineDto[];
}
