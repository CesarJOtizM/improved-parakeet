import { ApiProperty } from '@nestjs/swagger';

export class GetOrganizationDataDto {
  @ApiProperty({
    description: 'Organization ID',
    example: 'clx1234567890abcdef',
  })
  id!: string;

  @ApiProperty({
    description: 'Organization name',
    example: 'Mi Empresa S.A.',
  })
  name!: string;

  @ApiProperty({
    description: 'Organization slug',
    example: 'mi-empresa',
  })
  slug!: string;

  @ApiProperty({
    description: 'Organization domain',
    example: 'miempresa.tudominio.com',
    required: false,
  })
  domain?: string;

  @ApiProperty({
    description: 'Organization tax ID',
    example: '123456789-1',
    required: false,
  })
  taxId?: string;

  @ApiProperty({
    description: 'Organization settings',
    example: {},
  })
  settings!: Record<string, unknown>;

  @ApiProperty({
    description: 'Organization timezone',
    example: 'America/Bogota',
  })
  timezone!: string;

  @ApiProperty({
    description: 'Organization currency',
    example: 'COP',
  })
  currency!: string;

  @ApiProperty({
    description: 'Organization date format',
    example: 'YYYY-MM-DD',
  })
  dateFormat!: string;

  @ApiProperty({
    description: 'Organization active status',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Organization creation date',
    example: '2024-12-20T10:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Organization last update date',
    example: '2024-12-20T10:00:00.000Z',
  })
  updatedAt!: Date;
}

export class GetOrganizationResponseDto {
  @ApiProperty({
    description: 'Indicates if the operation was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Organization information',
    type: GetOrganizationDataDto,
  })
  data!: GetOrganizationDataDto;

  @ApiProperty({
    description: 'Informative message about the operation result',
    example: 'Organization retrieved successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-12-20T10:00:00.000Z',
  })
  timestamp!: string;
}
