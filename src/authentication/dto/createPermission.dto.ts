import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const VALID_MODULES = [
  'USERS',
  'PRODUCTS',
  'WAREHOUSES',
  'MOVEMENTS',
  'REPORTS',
  'IMPORTS',
  'SETTINGS',
] as const;

const VALID_ACTIONS = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'POST', 'VOID', 'IMPORT'] as const;

export class CreatePermissionDto {
  @ApiProperty({
    description: 'Permission name',
    example: 'USERS_CREATE',
    minLength: 2,
    maxLength: 100,
  })
  @IsString({ message: 'Name must be a string' })
  @MinLength(2, { message: 'Name must have at least 2 characters' })
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name!: string;

  @ApiProperty({
    description: 'Permission description',
    example: 'Create new users',
    maxLength: 255,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @MaxLength(255, { message: 'Description cannot exceed 255 characters' })
  description?: string;

  @ApiProperty({
    description: 'Module this permission belongs to',
    example: 'USERS',
    enum: VALID_MODULES,
  })
  @IsString({ message: 'Module must be a string' })
  @IsIn(VALID_MODULES, {
    message: `Module must be one of: ${VALID_MODULES.join(', ')}`,
  })
  module!: string;

  @ApiProperty({
    description: 'Action this permission allows',
    example: 'CREATE',
    enum: VALID_ACTIONS,
  })
  @IsString({ message: 'Action must be a string' })
  @IsIn(VALID_ACTIONS, {
    message: `Action must be one of: ${VALID_ACTIONS.join(', ')}`,
  })
  action!: string;
}
