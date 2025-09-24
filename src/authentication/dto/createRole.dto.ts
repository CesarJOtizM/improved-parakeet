import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Role name',
    example: 'MANAGER',
    minLength: 2,
    maxLength: 50,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must have at least 2 characters' })
  @MaxLength(50, { message: 'Name cannot exceed 50 characters' })
  name!: string;

  @ApiProperty({
    description: 'Role description',
    example: 'Manager role with full access to inventory management',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @ApiProperty({
    description: 'Whether the role is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;

  @ApiProperty({
    description: 'Array of permission IDs to assign to the role',
    example: ['permission-id-1', 'permission-id-2'],
    type: [String],
    required: false,
  })
  @IsOptional()
  permissionIds?: string[];
}
