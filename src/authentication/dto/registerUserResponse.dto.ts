import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserResponseDto {
  @ApiProperty({
    description: 'Indicates if the registration was successful',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Registered user information',
    type: 'object',
    properties: {
      id: { type: 'string', example: 'clx1234567890abcdef' },
      email: { type: 'string', example: 'user@company.com' },
      username: { type: 'string', example: 'user123' },
      firstName: { type: 'string', example: 'John' },
      lastName: { type: 'string', example: 'Doe' },
      status: { type: 'string', example: 'INACTIVE' },
      orgId: { type: 'string', example: 'clx1234567890abcdef' },
    },
  })
  user!: {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    status: string;
    orgId: string;
  };

  @ApiProperty({
    description: 'Informative message about the registration result',
    example: 'User registered successfully. Your account requires activation by the administrator.',
  })
  message!: string;

  @ApiProperty({
    description: 'Indicates if the user requires activation by the administrator',
    example: true,
  })
  requiresAdminActivation!: boolean;
}
