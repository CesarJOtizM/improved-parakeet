import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    description: 'Role ID to assign to the user',
    example: 'role-123',
  })
  @IsString({ message: 'Role ID must be a string' })
  @IsNotEmpty({ message: 'Role ID is required' })
  roleId!: string;
}

export class AssignRoleResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Role assigned successfully' })
  message!: string;

  @ApiProperty({
    description: 'Role assignment data',
    example: {
      userId: 'user-123',
      roleId: 'role-123',
      roleName: 'ADMIN',
      assignedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  data!: {
    userId: string;
    roleId: string;
    roleName: string;
    assignedAt: Date;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
