import { CreatePermissionUseCase } from '@application/permissionManagementUseCases/createPermissionUseCase';
import { GetPermissionsUseCase } from '@application/permissionManagementUseCases/getPermissionsUseCase';
import { CreatePermissionDto } from '@auth/dto/createPermission.dto';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { PermissionsGuard } from '@auth/security/guards/permissionsGuard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import type {
  ICreatePermissionRequest,
  ICreatePermissionResponse,
} from '@application/permissionManagementUseCases/createPermissionUseCase';
import type {
  IGetPermissionsRequest,
  IGetPermissionsResponse,
} from '@application/permissionManagementUseCases/getPermissionsUseCase';

@ApiTags('Permissions Management')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionsController {
  private readonly logger = new Logger(PermissionsController.name);

  constructor(
    private readonly getPermissionsUseCase: GetPermissionsUseCase,
    private readonly createPermissionUseCase: CreatePermissionUseCase
  ) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get permissions',
    description: 'Retrieve a paginated list of permissions with optional filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            permissions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  module: { type: 'string' },
                  action: { type: 'string' },
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
  async getPermissions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('module') module?: string,
    @Query('action') action?: string,
    @Query('search') search?: string
  ): Promise<IGetPermissionsResponse> {
    this.logger.log(`Getting permissions`);

    const request: IGetPermissionsRequest = {
      page,
      limit,
      module,
      action,
      search,
    };

    return this.getPermissionsUseCase.execute(request);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create permission',
    description: 'Create a new permission',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Permission created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            module: { type: 'string' },
            action: { type: 'string' },
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
    description: 'Permission with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createPermission(
    @Body() createPermissionDto: CreatePermissionDto
  ): Promise<ICreatePermissionResponse> {
    this.logger.log(`Creating permission with name: ${createPermissionDto.name}`);

    const request: ICreatePermissionRequest = {
      ...createPermissionDto,
    };

    return this.createPermissionUseCase.execute(request);
  }
}
