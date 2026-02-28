import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  GROUP_BY_OPTIONS,
  IReportParametersInput,
  LOW_STOCK_SEVERITY,
  PERIOD_OPTIONS,
  RETURN_TYPE_OPTIONS,
} from '@report/domain/valueObjects';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class DateRangeDto {
  @ApiProperty({
    description: 'Start date for the report',
    example: '2024-01-01',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({
    description: 'End date for the report',
    example: '2024-12-31',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}

export class ReportParametersDto {
  @ApiPropertyOptional({
    description: 'Date range for the report',
    type: DateRangeDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description: 'Filter by warehouse ID',
    example: 'clxxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @ApiPropertyOptional({
    description: 'Filter by product ID',
    example: 'clxxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({
    description: 'Filter by category',
    example: 'Electronics',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'CONFIRMED',
  })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by return type',
    enum: Object.values(RETURN_TYPE_OPTIONS),
    example: 'CUSTOMER',
  })
  @IsOptional()
  @IsString()
  returnType?: string;

  @ApiPropertyOptional({
    description: 'Group results by',
    enum: Object.values(GROUP_BY_OPTIONS),
    example: 'MONTH',
  })
  @IsOptional()
  @IsIn(Object.values(GROUP_BY_OPTIONS))
  groupBy?: string;

  @ApiPropertyOptional({
    description: 'Period for turnover analysis',
    enum: Object.values(PERIOD_OPTIONS),
    example: 'MONTHLY',
  })
  @IsOptional()
  @IsIn(Object.values(PERIOD_OPTIONS))
  period?: string;

  @ApiPropertyOptional({
    description: 'Filter by movement type',
    example: 'IN',
  })
  @IsOptional()
  @IsString()
  movementType?: string;

  @ApiPropertyOptional({
    description: 'Filter by customer reference',
    example: 'CUST-001',
  })
  @IsOptional()
  @IsString()
  customerReference?: string;

  @ApiPropertyOptional({
    description: 'Filter by sale ID',
    example: 'clxxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  saleId?: string;

  @ApiPropertyOptional({
    description: 'Filter by movement ID',
    example: 'clxxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  movementId?: string;

  @ApiPropertyOptional({
    description: 'Include inactive products',
    example: false,
  })
  @IsOptional()
  includeInactive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by location ID',
    example: 'clxxxxxxxxxxxxxxxx',
  })
  @IsOptional()
  @IsString()
  locationId?: string;

  @ApiPropertyOptional({
    description: 'Filter by low stock severity',
    enum: Object.values(LOW_STOCK_SEVERITY),
    example: 'CRITICAL',
  })
  @IsOptional()
  @IsString()
  severity?: string;

  @ApiPropertyOptional({
    description: 'Number of days without sales to consider stock as dead (default: 90)',
    example: 90,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  deadStockDays?: number;
}

export class ViewReportQueryDto extends ReportParametersDto {
  // Additional query parameters can be added here if needed
}

export class ViewReportResponseDto {
  @ApiProperty({ description: 'Whether the operation was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Response message' })
  message!: string;

  @ApiProperty({ description: 'Report data with columns, rows, and metadata' })
  data!: {
    columns: Array<{
      key: string;
      header: string;
      type: string;
      sortable?: boolean;
      filterable?: boolean;
      width?: string;
      align?: string;
    }>;
    rows: unknown[];
    metadata: {
      reportType: string;
      reportTitle: string;
      generatedAt: Date;
      parameters: IReportParametersInput;
      totalRecords: number;
      orgId: string;
    };
    summary?: Record<string, number | string>;
  };

  @ApiProperty({ description: 'Timestamp of the response' })
  timestamp!: string;
}
