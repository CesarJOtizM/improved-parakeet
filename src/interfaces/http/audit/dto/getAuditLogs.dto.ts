import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min, IsDateString } from 'class-validator';

export class GetAuditLogsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', example: 50, default: 50 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Entity type', example: 'User' })
  @IsOptional()
  @IsString()
  entityType?: string;

  @ApiPropertyOptional({ description: 'Entity ID', example: 'clx1234567890' })
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional({ description: 'Action type', example: 'CREATE' })
  @IsOptional()
  @IsString()
  action?: string;

  @ApiPropertyOptional({
    description: 'User ID who performed the action',
    example: 'clx1234567890',
  })
  @IsOptional()
  @IsString()
  performedBy?: string;

  @ApiPropertyOptional({ description: 'HTTP method', example: 'POST' })
  @IsOptional()
  @IsString()
  httpMethod?: string;

  @ApiPropertyOptional({
    description: 'Start date (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date (ISO string)',
    example: '2024-12-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class AuditLogItemDto {
  @ApiProperty({ description: 'Audit log ID', example: 'clx1234567890' })
  id!: string;

  @ApiPropertyOptional({ description: 'Organization ID', example: 'clx1234567890', nullable: true })
  orgId!: string | null;

  @ApiProperty({ description: 'Entity type', example: 'User' })
  entityType!: string;

  @ApiPropertyOptional({ description: 'Entity ID', example: 'clx1234567890', nullable: true })
  entityId!: string | null;

  @ApiProperty({ description: 'Action performed', example: 'CREATE' })
  action!: string;

  @ApiPropertyOptional({
    description: 'User ID who performed the action',
    example: 'clx1234567890',
    nullable: true,
  })
  performedBy!: string | null;

  @ApiProperty({
    description: 'Additional metadata',
    type: Object,
    additionalProperties: true,
  })
  metadata!: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'IP address', example: '192.168.1.1', nullable: true })
  ipAddress!: string | null;

  @ApiPropertyOptional({ description: 'User agent', example: 'Mozilla/5.0...', nullable: true })
  userAgent!: string | null;

  @ApiPropertyOptional({ description: 'HTTP method', example: 'POST', nullable: true })
  httpMethod!: string | null;

  @ApiPropertyOptional({ description: 'HTTP URL', example: '/api/users', nullable: true })
  httpUrl!: string | null;

  @ApiPropertyOptional({ description: 'HTTP status code', example: 200, nullable: true })
  httpStatusCode!: number | null;

  @ApiPropertyOptional({ description: 'Request duration in ms', example: 150, nullable: true })
  duration!: number | null;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;
}

export class GetAuditLogsResponseDto {
  @ApiProperty({ description: 'Success flag', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Audit logs retrieved successfully' })
  message!: string;

  @ApiProperty({ description: 'Audit logs', type: [AuditLogItemDto] })
  data!: AuditLogItemDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: {
      page: 1,
      limit: 50,
      total: 100,
      totalPages: 2,
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
