import { ApiProperty } from '@nestjs/swagger';

export class ProductUnitDto {
  @ApiProperty({ description: 'Unit code', example: 'UNIT' })
  code!: string;

  @ApiProperty({ description: 'Unit name', example: 'Unit' })
  name!: string;

  @ApiProperty({ description: 'Unit precision', example: 0 })
  precision!: number;
}

export class ProductResponseDto {
  @ApiProperty({ description: 'Product ID', example: 'product-123' })
  id!: string;

  @ApiProperty({ description: 'Product SKU', example: 'PROD-001' })
  sku!: string;

  @ApiProperty({ description: 'Product name', example: 'Product Name' })
  name!: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Product description',
    required: false,
  })
  description?: string;

  @ApiProperty({ description: 'Unit of measure', type: ProductUnitDto })
  unit!: ProductUnitDto;

  @ApiProperty({ description: 'Product barcode', example: '1234567890123', required: false })
  barcode?: string;

  @ApiProperty({ description: 'Product brand', example: 'Brand Name', required: false })
  brand?: string;

  @ApiProperty({ description: 'Product model', example: 'Model Name', required: false })
  model?: string;

  @ApiProperty({ description: 'Product status', example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ description: 'Cost method', example: 'AVG' })
  costMethod!: string;

  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  orgId!: string;

  @ApiProperty({ description: 'Creation date', example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date', example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class GetProductResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Product retrieved successfully' })
  message!: string;

  @ApiProperty({ description: 'Product data', type: ProductResponseDto })
  data!: ProductResponseDto;

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class CreateProductResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Product created successfully' })
  message!: string;

  @ApiProperty({ description: 'Product data', type: ProductResponseDto })
  data!: ProductResponseDto;

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class UpdateProductResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Product updated successfully' })
  message!: string;

  @ApiProperty({ description: 'Product data', type: ProductResponseDto })
  data!: ProductResponseDto;

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class GetProductsResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Products retrieved successfully' })
  message!: string;

  @ApiProperty({
    description: 'List of products',
    type: [ProductResponseDto],
  })
  data!: ProductResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 10,
      total: 100,
      totalPages: 10,
      hasNext: true,
      hasPrev: false,
    },
  })
  pagination!: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
