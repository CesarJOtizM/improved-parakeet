import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
  IsObject,
} from 'class-validator';

export class CreateMovementLineDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'product-123',
  })
  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;

  @ApiProperty({
    description: 'Location ID (optional for MVP, warehouse is the location)',
    example: 'location-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Location ID must be a string' })
  locationId?: string;

  @ApiProperty({
    description: 'Quantity',
    example: 10,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0.01, { message: 'Quantity must be greater than 0' })
  quantity!: number;

  @ApiProperty({
    description: 'Unit cost',
    example: 100.5,
    required: false,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Unit cost must be a number' })
  @Min(0, { message: 'Unit cost must be greater than or equal to 0' })
  unitCost?: number;

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
    example: { batch: 'BATCH-001' },
    required: false,
  })
  @IsOptional()
  @IsObject({ message: 'Extra must be an object' })
  extra?: Record<string, unknown>;
}

export class CreateMovementDto {
  @ApiProperty({
    description: 'Movement type',
    example: 'IN',
    enum: ['IN', 'OUT', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER_OUT', 'TRANSFER_IN'],
  })
  @IsEnum(['IN', 'OUT', 'ADJUST_IN', 'ADJUST_OUT', 'TRANSFER_OUT', 'TRANSFER_IN'], {
    message: 'Type must be one of: IN, OUT, ADJUST_IN, ADJUST_OUT, TRANSFER_OUT, TRANSFER_IN',
  })
  type!: 'IN' | 'OUT' | 'ADJUST_IN' | 'ADJUST_OUT' | 'TRANSFER_OUT' | 'TRANSFER_IN';

  @ApiProperty({
    description: 'Warehouse ID',
    example: 'warehouse-123',
  })
  @IsString({ message: 'Warehouse ID must be a string' })
  @IsNotEmpty({ message: 'Warehouse ID is required' })
  warehouseId!: string;

  @ApiProperty({
    description: 'Contact (supplier) ID for entry movements',
    example: 'contact-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Contact ID must be a string' })
  contactId?: string;

  @ApiProperty({
    description: 'Reference document number',
    example: 'REF-001',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reference must be a string' })
  reference?: string;

  @ApiProperty({
    description: 'Movement reason',
    example: 'PURCHASE',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;

  @ApiProperty({
    description: 'Notes',
    example: 'Initial stock entry',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note?: string;

  @ApiProperty({
    description: 'Movement lines',
    type: [CreateMovementLineDto],
  })
  @IsArray({ message: 'Lines must be an array' })
  @ValidateNested({ each: true })
  @Type(() => CreateMovementLineDto)
  @IsNotEmpty({ message: 'At least one line is required' })
  lines!: CreateMovementLineDto[];
}
