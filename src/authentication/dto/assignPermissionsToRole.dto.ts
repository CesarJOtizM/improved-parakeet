import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsString } from 'class-validator';

export class AssignPermissionsToRoleDto {
  @ApiProperty({
    description: 'Array of permission IDs to assign to the role',
    example: ['perm-123', 'perm-456'],
    type: [String],
  })
  @IsArray({ message: 'Permission IDs must be an array' })
  @ArrayMinSize(1, { message: 'At least one permission ID is required' })
  @IsString({ each: true, message: 'Each permission ID must be a string' })
  permissionIds!: string[];
}

export class AssignPermissionsToRoleResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Permissions assigned successfully' })
  message!: string;

  @ApiProperty({
    description: 'Role with assigned permissions',
    example: {
      roleId: 'role-123',
      roleName: 'CUSTOM_MANAGER',
      assignedPermissions: ['USERS:READ', 'PRODUCTS:CREATE'],
      assignedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  data!: {
    roleId: string;
    roleName: string;
    assignedPermissions: string[];
    assignedAt: Date;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
