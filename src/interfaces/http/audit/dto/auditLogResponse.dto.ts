import { ApiProperty } from '@nestjs/swagger';

export class AuditLogResponseDto {
  @ApiProperty({ description: 'Success flag', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Audit log retrieved successfully' })
  message!: string;

  @ApiProperty({
    description: 'Audit log data',
    example: {
      id: 'clx1234567890',
      orgId: 'clx1234567890',
      entityType: 'User',
      entityId: 'clx1234567890',
      action: 'CREATE',
      performedBy: 'clx1234567890',
      metadata: {},
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...',
      httpMethod: 'POST',
      httpUrl: '/api/users',
      httpStatusCode: 201,
      duration: 150,
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  })
  data!: {
    id: string;
    orgId: string | null;
    entityType: string;
    entityId: string | null;
    action: string;
    performedBy: string | null;
    metadata: Record<string, unknown>;
    ipAddress: string | null;
    userAgent: string | null;
    httpMethod: string | null;
    httpUrl: string | null;
    httpStatusCode: number | null;
    duration: number | null;
    createdAt: Date;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
