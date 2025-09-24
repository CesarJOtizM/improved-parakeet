import { CreateRoleUseCase } from '@application/roleManagementUseCases/createRoleUseCase';
import { GetRolesUseCase } from '@application/roleManagementUseCases/getRolesUseCase';
import { UpdateRoleUseCase } from '@application/roleManagementUseCases/updateRoleUseCase';
import { CreateRoleDto } from '@auth/dto/createRole.dto';
import { UpdateRoleDto } from '@auth/dto/updateRole.dto';
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
  ICreateRoleRequest,
  ICreateRoleResponse,
} from '@application/roleManagementUseCases/createRoleUseCase';
import type {
  IGetRolesRequest,
  IGetRolesResponse,
} from '@application/roleManagementUseCases/getRolesUseCase';
import type {
  IUpdateRoleRequest,
  IUpdateRoleResponse,
} from '@application/roleManagementUseCases/updateRoleUseCase';

@ApiTags('Roles Management')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RolesController {
  private readonly logger = new Logger(RolesController.name);

  constructor(
    private readonly getRolesUseCase: GetRolesUseCase,
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase
  ) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get roles',
    description: 'Retrieve a paginated list of roles with optional filtering',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            roles: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  isActive: { type: 'boolean' },
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
  async getRoles(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
    @OrgId() orgId?: string
  ): Promise<IGetRolesResponse> {
    this.logger.log(`Getting roles for org: ${orgId}`);

    const request: IGetRolesRequest = {
      orgId: orgId!,
      page,
      limit,
      isActive,
      search,
    };

    return this.getRolesUseCase.execute(request);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create role',
    description: 'Create a new role with optional permission assignments',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role created successfully',
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
            isActive: { type: 'boolean' },
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
    description: 'Role with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @OrgId() orgId?: string
  ): Promise<ICreateRoleResponse> {
    this.logger.log(`Creating role with name: ${createRoleDto.name} for org: ${orgId}`);

    const request: ICreateRoleRequest = {
      ...createRoleDto,
      orgId: orgId!,
    };

    return this.createRoleUseCase.execute(request);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update role',
    description: 'Update an existing role by ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
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
            isActive: { type: 'boolean' },
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
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Role with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async updateRole(
    @Param('id') roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @OrgId() orgId?: string
  ): Promise<IUpdateRoleResponse> {
    this.logger.log(`Updating role with ID: ${roleId} for org: ${orgId}`);

    const request: IUpdateRoleRequest = {
      roleId,
      ...updateRoleDto,
      orgId: orgId!,
    };

    return this.updateRoleUseCase.execute(request);
  }
}
