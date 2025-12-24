import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  MinLength,
  MaxLength,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class UnitDto {
  @ApiProperty({
    description: 'Unit code (e.g., "UNIT", "KG", "L")',
    example: 'UNIT',
  })
  @IsString({ message: 'Unit code must be a string' })
  @IsNotEmpty({ message: 'Unit code is required' })
  @MinLength(1, { message: 'Unit code must be at least 1 character long' })
  @MaxLength(10, { message: 'Unit code must be at most 10 characters long' })
  code!: string;

  @ApiProperty({
    description: 'Unit name (e.g., "Unit", "Kilogram", "Liter")',
    example: 'Unit',
  })
  @IsString({ message: 'Unit name must be a string' })
  @IsNotEmpty({ message: 'Unit name is required' })
  @MinLength(1, { message: 'Unit name must be at least 1 character long' })
  @MaxLength(50, { message: 'Unit name must be at most 50 characters long' })
  name!: string;

  @ApiProperty({
    description: 'Unit precision (0-6 decimal places)',
    example: 0,
    minimum: 0,
    maximum: 6,
  })
  @IsNumber({}, { message: 'Precision must be a number' })
  @Min(0, { message: 'Precision must be at least 0' })
  @Max(6, { message: 'Precision must be at most 6' })
  precision!: number;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product SKU (unique identifier)',
    example: 'PROD-001',
  })
  @IsString({ message: 'SKU must be a string' })
  @IsNotEmpty({ message: 'SKU is required' })
  @MinLength(3, { message: 'SKU must be at least 3 characters long' })
  @MaxLength(50, { message: 'SKU must be at most 50 characters long' })
  sku!: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Product Name',
  })
  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(200, { message: 'Name must be at most 200 characters long' })
  name!: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Product description',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(1000, { message: 'Description must be at most 1000 characters long' })
  description?: string;

  @ApiProperty({
    description: 'Unit of measure',
    type: UnitDto,
  })
  @ValidateNested()
  @Type(() => UnitDto)
  unit!: UnitDto;

  @ApiProperty({
    description: 'Product barcode',
    example: '1234567890123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Barcode must be a string' })
  @MaxLength(50, { message: 'Barcode must be at most 50 characters long' })
  barcode?: string;

  @ApiProperty({
    description: 'Product brand',
    example: 'Brand Name',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Brand must be a string' })
  @MaxLength(100, { message: 'Brand must be at most 100 characters long' })
  brand?: string;

  @ApiProperty({
    description: 'Product model',
    example: 'Model Name',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Model must be a string' })
  @MaxLength(100, { message: 'Model must be at most 100 characters long' })
  model?: string;

  @ApiProperty({
    description: 'Product status',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'DISCONTINUED'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'DISCONTINUED'], {
    message: 'Status must be one of: ACTIVE, INACTIVE, DISCONTINUED',
  })
  status?: 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

  @ApiProperty({
    description: 'Cost method',
    example: 'AVG',
    enum: ['AVG', 'FIFO'],
    required: false,
  })
  @IsOptional()
  @IsEnum(['AVG', 'FIFO'], {
    message: 'Cost method must be one of: AVG, FIFO',
  })
  costMethod?: 'AVG' | 'FIFO';
}
