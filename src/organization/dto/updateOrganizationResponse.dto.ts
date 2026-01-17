import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrganizationDataDto {
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
    description: 'Organization active status',
    example: true,
  })
  isActive!: boolean;

  @ApiProperty({
    description: 'Organization last update date',
    example: '2024-12-20T10:00:00.000Z',
  })
  updatedAt!: Date;
}

export class UpdateOrganizationResponseDto {
  @ApiProperty({
    description: 'Indicates if the update was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Updated organization information',
    type: UpdateOrganizationDataDto,
  })
  data!: UpdateOrganizationDataDto;

  @ApiProperty({
    description: 'Informative message about the update result',
    example: 'Organization updated successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-12-20T10:00:00.000Z',
  })
  timestamp!: string;
}
