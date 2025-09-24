import { AssignRoleToUserUseCase } from '@application/userRoleManagementUseCases/assignRoleToUserUseCase';
import { RemoveRoleFromUserUseCase } from '@application/userRoleManagementUseCases/removeRoleFromUserUseCase';
import { JwtAuthGuard } from '@auth/security/guards/jwtAuthGuard';
import { PermissionsGuard } from '@auth/security/guards/permissionsGuard';
import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrgId } from '@shared/decorators/orgId.decorator';

import type {
  IAssignRoleToUserRequest,
  IAssignRoleToUserResponse,
} from '@application/userRoleManagementUseCases/assignRoleToUserUseCase';
import type {
  IRemoveRoleFromUserRequest,
  IRemoveRoleFromUserResponse,
} from '@application/userRoleManagementUseCases/removeRoleFromUserUseCase';

@ApiTags('User Roles Management')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserRolesController {
  private readonly logger = new Logger(UserRolesController.name);

  constructor(
    private readonly assignRoleToUserUseCase: AssignRoleToUserUseCase,
    private readonly removeRoleFromUserUseCase: RemoveRoleFromUserUseCase
  ) {}

  @Post(':id/roles')
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Assign role to user',
    description: 'Assign a role to a specific user',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role assigned to user successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            roleId: { type: 'string' },
            roleName: { type: 'string' },
            assignedAt: { type: 'string', format: 'date-time' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or role not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already has this role or role is inactive',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async assignRoleToUser(
    @Param('id') userId: string,
    @Body('roleId') roleId: string,
    @OrgId() orgId?: string
  ): Promise<IAssignRoleToUserResponse> {
    this.logger.log(`Assigning role ${roleId} to user ${userId} for org: ${orgId}`);

    const request: IAssignRoleToUserRequest = {
      userId,
      roleId,
      orgId: orgId!,
    };

    return this.assignRoleToUserUseCase.execute(request);
  }

  @Delete(':id/roles/:roleId')
  @UseGuards(PermissionsGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove role from user',
    description: 'Remove a role from a specific user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role removed from user successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            roleId: { type: 'string' },
            roleName: { type: 'string' },
            removedAt: { type: 'string', format: 'date-time' },
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or role not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User does not have this role',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized access',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async removeRoleFromUser(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
    @OrgId() orgId?: string
  ): Promise<IRemoveRoleFromUserResponse> {
    this.logger.log(`Removing role ${roleId} from user ${userId} for org: ${orgId}`);

    const request: IRemoveRoleFromUserRequest = {
      userId,
      roleId,
      orgId: orgId!,
    };

    return this.removeRoleFromUserUseCase.execute(request);
  }
}
