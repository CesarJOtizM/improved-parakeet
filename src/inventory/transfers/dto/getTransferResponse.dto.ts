import { ApiProperty } from '@nestjs/swagger';

export class TransferResponseDto {
  @ApiProperty({ description: 'Transfer ID', example: 'transfer-123' })
  id!: string;

  @ApiProperty({ description: 'From warehouse ID', example: 'warehouse-123' })
  fromWarehouseId!: string;

  @ApiProperty({ description: 'To warehouse ID', example: 'warehouse-456' })
  toWarehouseId!: string;

  @ApiProperty({ description: 'Transfer status', example: 'IN_TRANSIT' })
  status!: string;

  @ApiProperty({ description: 'Created by user ID', example: 'user-123' })
  createdBy!: string;

  @ApiProperty({ description: 'Note', example: 'Transfer note', required: false })
  note?: string;

  @ApiProperty({ description: 'Number of lines', example: 3 })
  linesCount!: number;

  @ApiProperty({ description: 'Organization ID', example: 'org-123' })
  orgId!: string;

  @ApiProperty({ description: 'Creation date', example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update date', example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class InitiateTransferResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Transfer initiated successfully' })
  message!: string;

  @ApiProperty({ description: 'Transfer data', type: TransferResponseDto })
  data!: TransferResponseDto;

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class GetTransfersResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Transfers retrieved successfully' })
  message!: string;

  @ApiProperty({
    description: 'List of transfers',
    type: [TransferResponseDto],
  })
  data!: TransferResponseDto[];

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
