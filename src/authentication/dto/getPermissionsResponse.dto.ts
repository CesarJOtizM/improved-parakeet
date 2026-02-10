import { ApiProperty } from '@nestjs/swagger';

export class PermissionDto {
  @ApiProperty({ description: 'Permission ID', example: 'perm-123' })
  id!: string;

  @ApiProperty({ description: 'Permission name', example: 'ROLES:READ' })
  name!: string;

  @ApiProperty({
    description: 'Permission description',
    example: 'View roles',
    required: false,
    nullable: true,
  })
  description!: string | null;

  @ApiProperty({ description: 'Permission module', example: 'ROLES' })
  module!: string;

  @ApiProperty({ description: 'Permission action', example: 'READ' })
  action!: string;
}

export class GetPermissionsResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Permissions retrieved successfully' })
  message!: string;

  @ApiProperty({
    description: 'List of permissions',
    type: [PermissionDto],
  })
  data!: PermissionDto[];

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
