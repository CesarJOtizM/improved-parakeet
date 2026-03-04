import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SwapSaleLineDto {
  @ApiProperty({
    description: 'ID of the sale line to swap',
    example: 'line-123',
  })
  @IsString({ message: 'Line ID must be a string' })
  @IsNotEmpty({ message: 'Line ID is required' })
  lineId!: string;

  @ApiProperty({
    description: 'Product ID of the replacement product',
    example: 'product-456',
  })
  @IsString({ message: 'Replacement product ID must be a string' })
  @IsNotEmpty({ message: 'Replacement product ID is required' })
  replacementProductId!: string;

  @ApiProperty({
    description: 'Quantity to swap (can be partial)',
    example: 2,
    minimum: 0.01,
  })
  @IsNumber({}, { message: 'Swap quantity must be a number' })
  @Min(0.01, { message: 'Swap quantity must be greater than 0' })
  swapQuantity!: number;

  @ApiProperty({
    description: 'Source warehouse ID for the replacement product',
    example: 'warehouse-123',
  })
  @IsString({ message: 'Source warehouse ID must be a string' })
  @IsNotEmpty({ message: 'Source warehouse ID is required' })
  sourceWarehouseId!: string;

  @ApiProperty({
    description:
      'Pricing strategy: KEEP_ORIGINAL maintains the original price, NEW_PRICE uses newSalePrice',
    example: 'KEEP_ORIGINAL',
    enum: ['KEEP_ORIGINAL', 'NEW_PRICE'],
  })
  @IsString({ message: 'Pricing strategy must be a string' })
  @IsIn(['KEEP_ORIGINAL', 'NEW_PRICE'], {
    message: 'Pricing strategy must be KEEP_ORIGINAL or NEW_PRICE',
  })
  pricingStrategy!: 'KEEP_ORIGINAL' | 'NEW_PRICE';

  @ApiProperty({
    description: 'New sale price (required when pricingStrategy is NEW_PRICE)',
    example: 25.99,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'New sale price must be a number' })
  @Min(0.01, { message: 'New sale price must be greater than 0' })
  newSalePrice?: number;

  @ApiProperty({
    description: 'Currency for the new price',
    example: 'COP',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Currency must be a string' })
  currency?: string;

  @ApiProperty({
    description: 'Reason for the swap',
    example: 'Customer requested different size',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;
}
