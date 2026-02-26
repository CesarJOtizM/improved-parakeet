import { AssignPermissionsToRoleUseCase } from '@application/roleUseCases/assignPermissionsToRoleUseCase';
import { CreateRoleUseCase } from '@application/roleUseCases/createRoleUseCase';
import { DeleteRoleUseCase } from '@application/roleUseCases/deleteRoleUseCase';
import { GetPermissionsUseCase } from '@application/roleUseCases/getPermissionsUseCase';
import { GetRolePermissionsUseCase } from '@application/roleUseCases/getRolePermissionsUseCase';
import { GetRolesUseCase } from '@application/roleUseCases/getRolesUseCase';
import { GetRoleUseCase } from '@application/roleUseCases/getRoleUseCase';
import { UpdateRoleUseCase } from '@application/roleUseCases/updateRoleUseCase';
import {
  AssignPermissionsToRoleDto,
  AssignPermissionsToRoleResponseDto,
  CreateRoleDto,
  CreateRoleResponseDto,
  GetPermissionsResponseDto,
  GetRoleResponseDto,
  GetRolesResponseDto,
  UpdateRoleDto,
  UpdateRoleResponseDto,
} from '@auth/dto';
import { RateLimited } from '@auth/security/decorators/auth.decorators';
import { AllowOrganizationAdmin } from '@auth/security/decorators/roleBasedAuth.decorator';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { RoleBasedAuthGuard } from '@auth/security/guards/roleBasedAuthGuard';
import { PermissionGuard } from '@shared/guards/permission.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

import type { IAuthenticatedUser } from '@shared/types/http.types';
import type { Request } from 'express';

@ApiTags('Roles')
@Controller('roles')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class RolesController {
  private readonly logger = new Logger(RolesController.name);

  constructor(
    private readonly createRoleUseCase: CreateRoleUseCase,
    private readonly getRolesUseCase: GetRolesUseCase,
    private readonly getRoleUseCase: GetRoleUseCase,
    private readonly updateRoleUseCase: UpdateRoleUseCase,
    private readonly deleteRoleUseCase: DeleteRoleUseCase,
    private readonly assignPermissionsToRoleUseCase: AssignPermissionsToRoleUseCase,
    private readonly getPermissionsUseCase: GetPermissionsUseCase,
    private readonly getRolePermissionsUseCase: GetRolePermissionsUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.ROLES_CREATE)
  @ApiOperation({
    summary: 'Create new custom role',
    description: 'Create a new custom role for the organization. Requires ROLES:CREATE permission.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role created successfully',
    type: CreateRoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or role name already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createRole(
    @Body() createRoleDto: CreateRoleDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<CreateRoleResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Creating role', { name: createRoleDto.name, orgId, createdBy: user.id });

    const request = {
      name: createRoleDto.name,
      description: createRoleDto.description,
      orgId,
      createdBy: user.id,
    };

    const result = await this.createRoleUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @RequirePermissions(SYSTEM_PERMISSIONS.ROLES_READ)
  @ApiOperation({
    summary: 'Get available roles',
    description:
      'Get all available roles for the organization (system + custom). Requires ROLES:READ permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Roles retrieved successfully',
    type: GetRolesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getRoles(@OrgId() orgId: string): Promise<GetRolesResponseDto> {
    this.logger.log('Getting roles', { orgId });

    const request = { orgId };
    const result = await this.getRolesUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get('permissions')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @RequirePermissions(SYSTEM_PERMISSIONS.ROLES_READ)
  @ApiOperation({
    summary: 'Get all available permissions',
    description: 'Get all system permissions grouped by module. Requires ROLES:READ permission.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions retrieved successfully',
    type: GetPermissionsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getPermissions(): Promise<GetPermissionsResponseDto> {
    this.logger.log('Getting all permissions');

    const result = await this.getPermissionsUseCase.execute();
    return resultToHttpResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @RequirePermissions(SYSTEM_PERMISSIONS.ROLES_READ)
  @ApiOperation({
    summary: 'Get role by ID',
    description: 'Get a specific role by ID. Requires ROLES:READ permission.',
  })
  @ApiParam({ name: 'id', description: 'Role ID', example: 'role-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role retrieved successfully',
    type: GetRoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getRole(@Param('id') roleId: string, @OrgId() orgId: string): Promise<GetRoleResponseDto> {
    this.logger.log('Getting role', { roleId, orgId });

    const request = { roleId, orgId };
    const result = await this.getRoleUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.ROLES_UPDATE)
  @ApiOperation({
    summary: 'Update custom role',
    description:
      'Update a custom role. System roles cannot be updated. Requires ROLES:UPDATE permission.',
  })
  @ApiParam({ name: 'id', description: 'Role ID', example: 'role-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role updated successfully',
    type: UpdateRoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot update system roles or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async updateRole(
    @Param('id') roleId: string,
    @Body() updateRoleDto: UpdateRoleDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<UpdateRoleResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Updating role', { roleId, orgId, updatedBy: user.id });

    const request = {
      roleId,
      description: updateRoleDto.description,
      isActive: updateRoleDto.isActive,
      orgId,
      updatedBy: user.id,
    };

    const result = await this.updateRoleUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.ROLES_DELETE)
  @ApiOperation({
    summary: 'Delete custom role',
    description:
      'Delete a custom role. System roles cannot be deleted. Requires ROLES:DELETE permission.',
  })
  @ApiParam({ name: 'id', description: 'Role ID', example: 'role-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete system roles or role is assigned to users',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async deleteRole(
    @Param('id') roleId: string,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<{ success: boolean; message: string; timestamp: string }> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Deleting role', { roleId, orgId, deletedBy: user.id });

    const request = {
      roleId,
      orgId,
      deletedBy: user.id,
    };

    const result = await this.deleteRoleUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @RequirePermissions(SYSTEM_PERMISSIONS.ROLES_READ)
  @ApiOperation({
    summary: 'Get role permissions',
    description: 'Get all permissions assigned to a specific role. Requires ROLES:READ permission.',
  })
  @ApiParam({ name: 'id', description: 'Role ID', example: 'role-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role permissions retrieved successfully',
    type: GetPermissionsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getRolePermissions(
    @Param('id') roleId: string,
    @OrgId() orgId: string
  ): Promise<GetPermissionsResponseDto> {
    this.logger.log('Getting role permissions', { roleId, orgId });

    const request = { roleId, orgId };
    const result = await this.getRolePermissionsUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Post(':id/permissions')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.ROLES_UPDATE)
  @ApiOperation({
    summary: 'Assign permissions to role',
    description: 'Assign permissions to a role. Requires ROLES:UPDATE permission.',
  })
  @ApiParam({ name: 'id', description: 'Role ID', example: 'role-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Permissions assigned successfully',
    type: AssignPermissionsToRoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Role or permissions not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async assignPermissionsToRole(
    @Param('id') roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsToRoleDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<AssignPermissionsToRoleResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Assigning permissions to role', {
      roleId,
      permissionCount: assignPermissionsDto.permissionIds.length,
      orgId,
      assignedBy: user.id,
    });

    const request = {
      roleId,
      permissionIds: assignPermissionsDto.permissionIds,
      orgId,
      assignedBy: user.id,
    };

    const result = await this.assignPermissionsToRoleUseCase.execute(request);
    return resultToHttpResponse(result);
  }
}
