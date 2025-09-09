import { RegisterUserUseCase } from '@application/authUseCases/registerUserUseCase';
import { RegisterUserDto, RegisterUserResponseDto } from '@auth/dto';
import { Public, RateLimited } from '@auth/security/decorators/auth.decorators';
import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('User Registration')
@Controller('register')
export class RegisterController {
  private readonly logger = new Logger(RegisterController.name);

  constructor(private readonly registerUserUseCase: RegisterUserUseCase) {}

  @Post()
  @Public()
  @RateLimited('IP')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register new user',
    description:
      'Creates a new user account in the system. The user will be created with INACTIVE status and will require activation by the administrator.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: RegisterUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or user already exists',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'A user with this email already exists in the organization',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Organization not found',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Organization not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  async registerUser(@Body() registerUserDto: RegisterUserDto): Promise<RegisterUserResponseDto> {
    this.logger.log('User registration request', {
      email: registerUserDto.email,
      username: registerUserDto.username,
      organization: registerUserDto.organizationSlug || registerUserDto.organizationId,
    });

    const request = {
      email: registerUserDto.email,
      username: registerUserDto.username,
      password: registerUserDto.password,
      firstName: registerUserDto.firstName,
      lastName: registerUserDto.lastName,
      organizationSlug: registerUserDto.organizationSlug,
      organizationId: registerUserDto.organizationId,
    };

    const result = await this.registerUserUseCase.execute(request);

    this.logger.log('User registered successfully', {
      userId: result.data.id,
      email: result.data.email,
      orgId: result.data.orgId,
    });

    return result;
  }
}
