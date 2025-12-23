import { ApiProperty } from '@nestjs/swagger';

export class RoleDto {
  @ApiProperty({ description: 'Role ID', example: 'role-123' })
  id!: string;

  @ApiProperty({ description: 'Role name', example: 'ADMIN' })
  name!: string;

  @ApiProperty({ description: 'Role description', example: 'Administrator role', required: false })
  description?: string;

  @ApiProperty({ description: 'Whether the role is active', example: true })
  isActive!: boolean;

  @ApiProperty({ description: 'Whether the role is a system role', example: false })
  isSystem!: boolean;

  @ApiProperty({
    description: 'Organization ID (null for system roles)',
    example: 'org-123',
    required: false,
  })
  orgId?: string;

  @ApiProperty({ description: 'Creation timestamp', example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp', example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class GetRolesResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Roles retrieved successfully' })
  message!: string;

  @ApiProperty({
    description: 'List of roles',
    type: [RoleDto],
  })
  data!: RoleDto[];

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}

export class GetRoleResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Role retrieved successfully' })
  message!: string;

  @ApiProperty({
    description: 'Role data',
    type: RoleDto,
  })
  data!: RoleDto;

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
