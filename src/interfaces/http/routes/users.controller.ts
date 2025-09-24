import { CreateUserUseCase } from '@application/userManagementUseCases/createUserUseCase';
import { GetUsersUseCase } from '@application/userManagementUseCases/getUsersUseCase';
import { UpdateUserUseCase } from '@application/userManagementUseCases/updateUserUseCase';
import { CreateUserDto } from '@auth/dto/createUser.dto';
import { UpdateUserDto } from '@auth/dto/updateUser.dto';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { PermissionsGuard } from '@auth/security/guards/permissionsGuard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrgId } from '@shared/decorators/orgId.decorator';

import type {
  ICreateUserRequest,
  ICreateUserResponse,
} from '@application/userManagementUseCases/createUserUseCase';
import type {
  IGetUsersRequest,
  IGetUsersResponse,
} from '@application/userManagementUseCases/getUsersUseCase';
import type {
  IUpdateUserRequest,
  IUpdateUserResponse,
} from '@application/userManagementUseCases/updateUserUseCase';

@ApiTags('Users Management')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase
  ) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get users',
    description: 'Retrieve a paginated list of users with optional filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  username: { type: 'string' },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  status: { type: 'string' },
                  lastLoginAt: { type: 'string', format: 'date-time' },
                  roles: { type: 'array', items: { type: 'string' } },
                  permissions: { type: 'array', items: { type: 'string' } },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                totalPages: { type: 'number' },
              },
            },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @OrgId() orgId?: string
  ): Promise<IGetUsersResponse> {
    this.logger.log(`Getting users for org: ${orgId}`);

    const request: IGetUsersRequest = {
      orgId: orgId!,
      page,
      limit,
      status,
      search,
    };

    return this.getUsersUseCase.execute(request);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create user',
    description: 'Create a new user with optional role assignments',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            status: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with email or username already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @OrgId() orgId?: string
  ): Promise<ICreateUserResponse> {
    this.logger.log(`Creating user with email: ${createUserDto.email} for org: ${orgId}`);

    const request: ICreateUserRequest = {
      ...createUserDto,
      orgId: orgId!,
    };

    return this.createUserUseCase.execute(request);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user',
    description: 'Update an existing user by ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            username: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            status: { type: 'string' },
            roles: { type: 'array', items: { type: 'string' } },
            permissions: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with email or username already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @OrgId() orgId?: string
  ): Promise<IUpdateUserResponse> {
    this.logger.log(`Updating user with ID: ${userId} for org: ${orgId}`);

    const request: IUpdateUserRequest = {
      userId,
      ...updateUserDto,
      orgId: orgId!,
    };

    return this.updateUserUseCase.execute(request);
  }
}
