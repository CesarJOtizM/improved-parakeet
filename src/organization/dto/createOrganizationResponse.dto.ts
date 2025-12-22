import { ApiProperty } from '@nestjs/swagger';

export class OrganizationDataDto {
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
    description: 'Organization creation date',
    example: '2024-12-20T10:00:00.000Z',
  })
  createdAt!: Date;
}

export class AdminUserDataDto {
  @ApiProperty({
    description: 'Admin user email',
    example: 'admin@company.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Admin user username',
    example: 'admin',
  })
  username!: string;
}

export class CreateOrganizationResponseDto {
  @ApiProperty({
    description: 'Indicates if the creation was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Created organization information',
    type: OrganizationDataDto,
  })
  data!: OrganizationDataDto;

  @ApiProperty({
    description: 'Informative message about the creation result',
    example: 'Organization created successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-12-20T10:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Admin user information (if created)',
    type: AdminUserDataDto,
    required: false,
  })
  adminUser?: AdminUserDataDto;
}
