import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class UpdateMovementLineDto {
  @ApiProperty({ description: 'Product ID', example: 'product-123' })
  @IsString({ message: 'Product ID must be a string' })
  productId!: string;

  @ApiProperty({ description: 'Location ID (optional)', required: false })
  @IsOptional()
  @IsString({ message: 'Location ID must be a string' })
  locationId?: string;

  @ApiProperty({ description: 'Quantity', example: 10, minimum: 0.01 })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0.01, { message: 'Quantity must be greater than 0' })
  quantity!: number;

  @ApiProperty({ description: 'Unit cost', required: false, minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Unit cost must be a number' })
  @Min(0, { message: 'Unit cost must be >= 0' })
  unitCost?: number;

  @ApiProperty({ description: 'Currency code', example: 'COP', required: false })
  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  currency?: string;

  @ApiProperty({ description: 'Extra data', required: false })
  @IsOptional()
  @IsObject({ message: 'Extra must be an object' })
  extra?: Record<string, unknown>;
}

export class UpdateMovementDto {
  @ApiProperty({ description: 'Reference document number', required: false })
  @IsOptional()
  @IsString({ message: 'Reference must be a string' })
  reference?: string;

  @ApiProperty({ description: 'Movement reason', required: false })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;

  @ApiProperty({ description: 'Notes', required: false })
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note?: string;

  @ApiProperty({
    description: 'Movement lines (replaces all existing lines)',
    type: [UpdateMovementLineDto],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Lines must be an array' })
  @ValidateNested({ each: true })
  @Type(() => UpdateMovementLineDto)
  lines?: UpdateMovementLineDto[];
}
