import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ImportStatusResponseDto {
  @ApiProperty({
    description: 'Import batch ID',
    example: 'clxyz123abc',
  })
  id!: string;

  @ApiProperty({
    description: 'Type of import',
    example: 'PRODUCTS',
  })
  type!: string;

  @ApiProperty({
    description: 'Current status of the import',
    example: 'PROCESSING',
    enum: ['PENDING', 'VALIDATING', 'VALIDATED', 'PROCESSING', 'COMPLETED', 'FAILED'],
  })
  status!: string;

  @ApiProperty({
    description: 'Name of the imported file',
    example: 'products-import-2024.xlsx',
  })
  fileName!: string;

  @ApiProperty({
    description: 'Total number of rows in the file',
    example: 1000,
  })
  totalRows!: number;

  @ApiProperty({
    description: 'Number of rows processed so far',
    example: 500,
  })
  processedRows!: number;

  @ApiProperty({
    description: 'Number of valid rows',
    example: 950,
  })
  validRows!: number;

  @ApiProperty({
    description: 'Number of invalid rows',
    example: 50,
  })
  invalidRows!: number;

  @ApiProperty({
    description: 'Processing progress percentage',
    example: 50,
  })
  progress!: number;

  @ApiPropertyOptional({
    description: 'Timestamp when validation started',
    example: '2024-01-15T10:30:00.000Z',
  })
  startedAt?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when validation completed',
    example: '2024-01-15T10:31:00.000Z',
  })
  validatedAt?: string;

  @ApiPropertyOptional({
    description: 'Timestamp when processing completed',
    example: '2024-01-15T10:35:00.000Z',
  })
  completedAt?: string;

  @ApiPropertyOptional({
    description: 'Error message if the import failed',
    example: 'Failed to process row 150: Invalid SKU format',
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'User who created this import',
    example: 'user-123',
  })
  createdBy!: string;

  @ApiProperty({
    description: 'Organization ID',
    example: 'org-456',
  })
  orgId!: string;

  @ApiProperty({
    description: 'Timestamp when the batch was created',
    example: '2024-01-15T10:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Timestamp of last update',
    example: '2024-01-15T10:35:00.000Z',
  })
  updatedAt!: string;
}
