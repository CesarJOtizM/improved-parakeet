import { ApiProperty } from '@nestjs/swagger';

export class MovementLineResponseDto {
  @ApiProperty({ description: 'Line ID', example: 'line-123' })
  id!: string;

  @ApiProperty({ description: 'Product ID', example: 'product-123' })
  productId!: string;

  @ApiProperty({ description: 'Product SKU', example: 'PROD-010', required: false })
  sku?: string;

  @ApiProperty({ description: 'Product name', example: 'Producto Actualizado', required: false })
  name?: string;

  @ApiProperty({ description: 'Product price', example: 150.5, required: false })
  price?: number;

  @ApiProperty({
    description: 'Location ID (optional for MVP, warehouse is the location)',
    example: 'location-123',
    required: false,
  })
  locationId?: string;

  @ApiProperty({ description: 'Quantity', example: 10 })
  quantity!: number;

  @ApiProperty({ description: 'Unit cost', example: 100.5, required: false })
  unitCost?: number;

  @ApiProperty({ description: 'Currency', example: 'COP' })
  currency!: string;

  @ApiProperty({ description: 'Extra data', example: { batch: 'BATCH-001' }, required: false })
  extra?: Record<string, unknown>;
}

export class MovementResponseDto {
  @ApiProperty({ description: 'Movement ID', example: 'movement-123' })
  id!: string;

  @ApiProperty({ description: 'Movement type', example: 'IN' })
  type!: string;

  @ApiProperty({ description: 'Movement status', example: 'POSTED' })
  status!: string;

  @ApiProperty({ description: 'Warehouse ID', example: 'warehouse-123' })
  warehouseId!: string;

  @ApiProperty({ description: 'Reference', example: 'REF-001', required: false })
  reference?: string;

  @ApiProperty({ description: 'Reason', example: 'PURCHASE', required: false })
  reason?: string;

  @ApiProperty({ description: 'Note', example: 'Initial stock', required: false })
  note?: string;

  @ApiProperty({
    description: 'Posted at timestamp',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  postedAt?: Date;

  @ApiProperty({ description: 'Posted by user ID', example: 'user-123', required: false })
  postedBy?: string;

  @ApiProperty({
    description: 'Movement lines',
    type: [MovementLineResponseDto],
  })
  lines!: MovementLineResponseDto[];

  @ApiProperty({ description: 'Created by user ID', example: 'user-123' })
  createdBy!: string;

  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  orgId!: string;

  @ApiProperty({ description: 'Creation date', example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date', example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class CreateMovementResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Movement created successfully' })
  message!: string;

  @ApiProperty({ description: 'Movement data', type: MovementResponseDto })
  data!: MovementResponseDto;

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class GetMovementsResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Movements retrieved successfully' })
  message!: string;

  @ApiProperty({
    description: 'List of movements',
    type: [MovementResponseDto],
  })
  data!: MovementResponseDto[];

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
