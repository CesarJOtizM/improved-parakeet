import { ApiProperty } from '@nestjs/swagger';

export class UserDataDto {
  @ApiProperty({
    description: 'User ID',
    example: 'clx1234567890abcdef',
  })
  id!: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@company.com',
  })
  email!: string;

  @ApiProperty({
    description: 'Username',
    example: 'user123',
  })
  username!: string;

  @ApiProperty({
    description: 'First name',
    example: 'John',
  })
  firstName!: string;

  @ApiProperty({
    description: 'Last name',
    example: 'Doe',
  })
  lastName!: string;

  @ApiProperty({
    description: 'User status',
    example: 'INACTIVE',
  })
  status!: string;

  @ApiProperty({
    description: 'Organization ID',
    example: 'clx1234567890abcdef',
  })
  orgId!: string;
}

export class RegisterUserResponseDto {
  @ApiProperty({
    description: 'Indicates if the registration was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Registered user information',
    type: UserDataDto,
  })
  data!: UserDataDto;

  @ApiProperty({
    description: 'Informative message about the registration result',
    example: 'User registered successfully. Your account requires activation by the administrator.',
  })
  message!: string;

  @ApiProperty({
    description: 'Timestamp of the response',
    example: '2024-12-20T10:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Indicates if the user requires activation by the administrator',
    example: true,
  })
  requiresAdminActivation!: boolean;
}
