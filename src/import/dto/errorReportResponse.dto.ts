import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorDetailDto {
  @ApiProperty({
    description: 'Row number where the error occurred',
    example: 15,
  })
  rowNumber!: number;

  @ApiPropertyOptional({
    description: 'Column name where the error occurred',
    example: 'SKU',
  })
  column?: string;

  @ApiPropertyOptional({
    description: 'Value that caused the error',
    example: 'invalid-sku!@#',
  })
  value?: unknown;

  @ApiProperty({
    description: 'Error message',
    example: 'Invalid SKU format',
  })
  error!: string;

  @ApiProperty({
    description: 'Severity of the issue',
    enum: ['error', 'warning'],
    example: 'error',
  })
  severity!: 'error' | 'warning';
}

export class ErrorSummaryDto {
  @ApiProperty({
    description: 'Total number of rows in the file',
    example: 1000,
  })
  totalRows!: number;

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
    description: 'Total number of errors',
    example: 75,
  })
  errorCount!: number;

  @ApiProperty({
    description: 'Total number of warnings',
    example: 10,
  })
  warningCount!: number;

  @ApiProperty({
    description: 'Count of errors by type',
    example: { 'Invalid SKU': 30, 'Missing required field': 45 },
  })
  errorTypes!: Record<string, number>;
}

export class ErrorReportResponseDto {
  @ApiProperty({
    description: 'Error summary statistics',
    type: ErrorSummaryDto,
  })
  summary!: ErrorSummaryDto;

  @ApiProperty({
    description: 'List of error details',
    type: [ErrorDetailDto],
  })
  errors!: ErrorDetailDto[];
}

export class DownloadErrorReportQueryDto {
  @ApiPropertyOptional({
    description: 'Export format',
    enum: ['xlsx', 'csv'],
    default: 'xlsx',
    example: 'xlsx',
  })
  format?: 'xlsx' | 'csv';
}
