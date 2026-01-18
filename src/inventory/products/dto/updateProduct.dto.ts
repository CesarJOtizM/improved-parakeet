import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

import { UnitDto } from './createProduct.dto';

export class UpdateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Product Name',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Name must be a string' })
  @MinLength(1, { message: 'Name must be at least 1 character long' })
  @MaxLength(200, { message: 'Name must be at most 200 characters long' })
  name?: string;

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
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnitDto)
  unit?: UnitDto;

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

  @ApiProperty({
    description: 'Product price',
    example: 150.5,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price must be greater than or equal to 0' })
  price?: number;

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
