import { ApiProperty } from '@nestjs/swagger';

export class WarehouseAddressDto {
  @ApiProperty({ description: 'Street address', example: '123 Main St', required: false })
  street?: string;

  @ApiProperty({ description: 'City', example: 'Bogotá', required: false })
  city?: string;

  @ApiProperty({ description: 'State or province', example: 'Cundinamarca', required: false })
  state?: string;

  @ApiProperty({ description: 'ZIP or postal code', example: '110111', required: false })
  zipCode?: string;

  @ApiProperty({ description: 'Country', example: 'Colombia', required: false })
  country?: string;
}

export class WarehouseResponseDto {
  @ApiProperty({ description: 'Warehouse ID', example: 'warehouse-123' })
  id!: string;

  @ApiProperty({ description: 'Warehouse code', example: 'WH-001' })
  code!: string;

  @ApiProperty({ description: 'Warehouse name', example: 'Main Warehouse' })
  name!: string;

  @ApiProperty({ description: 'Warehouse description', example: 'Main warehouse', required: false })
  description?: string;

  @ApiProperty({ description: 'Warehouse address', type: WarehouseAddressDto, required: false })
  address?: WarehouseAddressDto;

  @ApiProperty({ description: 'Whether the warehouse is active', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  orgId!: string;

  @ApiProperty({ description: 'Creation date', example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date', example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class CreateWarehouseResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Warehouse created successfully' })
  message!: string;

  @ApiProperty({ description: 'Warehouse data', type: WarehouseResponseDto })
  data!: WarehouseResponseDto;

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class GetWarehousesResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Warehouses retrieved successfully' })
  message!: string;

  @ApiProperty({
    description: 'List of warehouses',
    type: [WarehouseResponseDto],
  })
  data!: WarehouseResponseDto[];

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
