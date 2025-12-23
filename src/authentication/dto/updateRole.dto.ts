import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRoleDto {
  @ApiProperty({
    description: 'Role description',
    example: 'Updated role description',
    required: false,
  })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;

  @ApiProperty({
    description: 'Whether the role is active',
    example: true,
    required: false,
  })
  @IsBoolean({ message: 'isActive must be a boolean' })
  @IsOptional()
  isActive?: boolean;
}

export class UpdateRoleResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Role updated successfully' })
  message!: string;

  @ApiProperty({
    description: 'Updated role data',
    example: {
      id: 'role-123',
      name: 'CUSTOM_MANAGER',
      description: 'Updated description',
      isActive: true,
      isSystem: false,
      orgId: 'org-123',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  data!: {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    isSystem: boolean;
    orgId: string;
    updatedAt: Date;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
