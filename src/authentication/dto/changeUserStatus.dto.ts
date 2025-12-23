import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export enum UserStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  LOCKED = 'LOCKED',
}

export class ChangeUserStatusDto {
  @ApiProperty({
    description: 'New user status',
    example: 'ACTIVE',
    enum: UserStatusEnum,
  })
  @IsEnum(UserStatusEnum, { message: 'Status must be one of: ACTIVE, INACTIVE, LOCKED' })
  @IsNotEmpty({ message: 'Status is required' })
  status!: UserStatusEnum;

  @ApiProperty({
    description: 'Reason for status change',
    example: 'User requested account activation',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reason must be a string' })
  reason?: string;

  @ApiProperty({
    description: 'Lock duration in minutes (only for LOCKED status)',
    example: 30,
    required: false,
    default: 30,
  })
  @IsOptional()
  @IsInt({ message: 'Lock duration must be an integer' })
  @Min(1, { message: 'Lock duration must be at least 1 minute' })
  @Max(1440, { message: 'Lock duration must be at most 1440 minutes (24 hours)' })
  lockDurationMinutes?: number;
}

export class ChangeUserStatusResponseDto {
  @ApiProperty({ description: 'Success indicator', example: true })
  success!: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'User status changed to ACTIVE successfully',
  })
  message!: string;

  @ApiProperty({
    description: 'Updated user data',
    example: {
      id: 'user-123',
      email: 'user@example.com',
      username: 'johndoe',
      status: 'ACTIVE',
      orgId: 'org-123',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  })
  data!: {
    id: string;
    email: string;
    username: string;
    status: string;
    orgId: string;
    updatedAt: Date;
  };

  @ApiProperty({ description: 'Response timestamp', example: '2024-01-01T00:00:00.000Z' })
  timestamp!: string;
}
