import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name (must be unique within organization)',
    example: 'CUSTOM_MANAGER',
  })
  @IsString({ message: 'Role name must be a string' })
  @IsNotEmpty({ message: 'Role name is required' })
  @MinLength(3, { message: 'Role name must be at least 3 characters long' })
  @MaxLength(50, { message: 'Role name must not exceed 50 characters' })
  name!: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Custom manager role with specific permissions',
    required: false,
  })
  @IsString({ message: 'Description must be a string' })
  @IsOptional()
  @MaxLength(500, { message: 'Description must not exceed 500 characters' })
  description?: string;
}

export class CreateRoleResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({ description: 'Response message', example: 'Role created successfully' })
  message!: string;

  @ApiProperty({
    description: 'Created role data',
    example: {
      id: 'role-123',
      name: 'CUSTOM_MANAGER',
      description: 'Custom manager role',
      isActive: true,
      isSystem: false,
      orgId: 'org-123',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
  })
  data!: {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    isSystem: boolean;
    orgId: string;
    createdAt: Date;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
