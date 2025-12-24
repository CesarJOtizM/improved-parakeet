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
  ArrayMinSize,
} from 'class-validator';

export class TransferLineDto {
  @ApiProperty({
    description: 'Product ID',
    example: 'product-id-123',
  })
  @IsString({ message: 'Product ID must be a string' })
  @IsNotEmpty({ message: 'Product ID is required' })
  productId!: string;

  @ApiProperty({
    description: 'Quantity to transfer',
    example: 10,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'Quantity must be a number' })
  @Min(0.01, { message: 'Quantity must be greater than 0' })
  quantity!: number;

  @ApiProperty({
    description: 'Source location ID',
    example: 'location-id-123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'From location ID must be a string' })
  fromLocationId?: string;

  @ApiProperty({
    description: 'Destination location ID',
    example: 'location-id-456',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'To location ID must be a string' })
  toLocationId?: string;
}

export class InitiateTransferDto {
  @ApiProperty({
    description: 'Source warehouse ID',
    example: 'warehouse-id-123',
  })
  @IsString({ message: 'From warehouse ID must be a string' })
  @IsNotEmpty({ message: 'From warehouse ID is required' })
  fromWarehouseId!: string;

  @ApiProperty({
    description: 'Destination warehouse ID',
    example: 'warehouse-id-456',
  })
  @IsString({ message: 'To warehouse ID must be a string' })
  @IsNotEmpty({ message: 'To warehouse ID is required' })
  toWarehouseId!: string;

  @ApiProperty({
    description: 'User ID who created the transfer',
    example: 'user-id-123',
  })
  @IsString({ message: 'Created by must be a string' })
  @IsNotEmpty({ message: 'Created by is required' })
  createdBy!: string;

  @ApiProperty({
    description: 'Transfer note',
    example: 'Transfer note',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Note must be a string' })
  note?: string;

  @ApiProperty({
    description: 'Transfer lines',
    type: [TransferLineDto],
    minItems: 1,
  })
  @IsArray({ message: 'Lines must be an array' })
  @ArrayMinSize(1, { message: 'At least one line is required' })
  @ValidateNested({ each: true })
  @Type(() => TransferLineDto)
  lines!: TransferLineDto[];
}
