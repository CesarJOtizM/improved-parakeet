import { AssignRoleToUserUseCase } from '@application/userUseCases/assignRoleToUserUseCase';
import { ChangeUserStatusUseCase } from '@application/userUseCases/changeUserStatusUseCase';
import { CreateUserUseCase } from '@application/userUseCases/createUserUseCase';
import { GetUsersUseCase } from '@application/userUseCases/getUsersUseCase';
import { GetUserUseCase } from '@application/userUseCases/getUserUseCase';
import { RemoveRoleFromUserUseCase } from '@application/userUseCases/removeRoleFromUserUseCase';
import { UpdateUserUseCase } from '@application/userUseCases/updateUserUseCase';
import {
  AssignRoleDto,
  AssignRoleResponseDto,
  ChangeUserStatusDto,
  ChangeUserStatusResponseDto,
  CreateUserDto,
  CreateUserResponseDto,
  GetUsersQueryDto,
  GetUsersResponseDto,
  UpdateUserDto,
  UpdateUserResponseDto,
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
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SYSTEM_PERMISSIONS } from '@shared/constants/security.constants';
import { OrgId } from '@shared/decorators/orgId.decorator';
import { RequirePermissions } from '@shared/decorators/requirePermissions.decorator';
import { resultToHttpResponse } from '@shared/utils/resultToHttp';

import type { IAuthenticatedUser } from '@shared/types/http.types';
import type { Request } from 'express';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RoleBasedAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly getUsersUseCase: GetUsersUseCase,
    private readonly updateUserUseCase: UpdateUserUseCase,
    private readonly changeUserStatusUseCase: ChangeUserStatusUseCase,
    private readonly assignRoleToUserUseCase: AssignRoleToUserUseCase,
    private readonly removeRoleFromUserUseCase: RemoveRoleFromUserUseCase
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.USERS_CREATE)
  @ApiOperation({
    summary: 'Create new user',
    description: 'Create a new user in the organization. Requires USERS:CREATE permission.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully',
    type: CreateUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or user already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<CreateUserResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Creating user', { email: createUserDto.email, orgId, createdBy: user.id });

    const request = {
      email: createUserDto.email,
      username: createUserDto.username,
      password: createUserDto.password,
      firstName: createUserDto.firstName,
      lastName: createUserDto.lastName,
      orgId,
      createdBy: user.id,
    };

    const result = await this.createUserUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @ApiOperation({
    summary: 'Get current user profile',
    description: "Get the authenticated user's own profile. No special permissions required.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile retrieved successfully',
  })
  async getMyProfile(@Req() req: Request, @OrgId() orgId: string) {
    const authUser = req.user as IAuthenticatedUser;
    this.logger.log('Getting own profile', { userId: authUser.id, orgId });

    const result = await this.getUserUseCase.execute({
      userId: authUser.id,
      orgId,
    });
    return resultToHttpResponse(result);
  }

  @Put('me')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      "Update the authenticated user's own profile (name, phone, timezone, etc.). No special permissions required.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile updated successfully',
    type: UpdateUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  async updateMyProfile(
    @Body() updateUserDto: UpdateUserDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<UpdateUserResponseDto> {
    const authUser = req.user as IAuthenticatedUser;
    this.logger.log('Updating own profile', { userId: authUser.id, orgId });

    const request = {
      userId: authUser.id,
      orgId,
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      phone: updateUserDto.phone,
      timezone: updateUserDto.timezone,
      language: updateUserDto.language,
      jobTitle: updateUserDto.jobTitle,
      department: updateUserDto.department,
      updatedBy: authUser.id,
    };

    const result = await this.updateUserUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.USERS_READ)
  @ApiOperation({
    summary: 'Get all users',
    description:
      'Get a paginated list of users in the organization. Requires USERS:READ permission.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE', 'LOCKED'] })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['email', 'username', 'firstName', 'lastName', 'status', 'createdAt', 'lastLoginAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: GetUsersResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getUsers(
    @Query() query: GetUsersQueryDto,
    @OrgId() orgId: string
  ): Promise<GetUsersResponseDto> {
    this.logger.log('Getting users', { orgId, ...query });

    const request = {
      orgId,
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const result = await this.getUsersUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.USERS_READ)
  @ApiOperation({
    summary: 'Get user by ID',
    description: 'Get a specific user by ID. Requires USERS:READ permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getUser(@Param('id') userId: string, @OrgId() orgId: string) {
    this.logger.log('Getting user', { userId, orgId });

    const request = {
      userId,
      orgId,
    };

    const result = await this.getUserUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.USERS_UPDATE)
  @ApiOperation({
    summary: 'Update user',
    description: 'Update user information. Requires USERS:UPDATE permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully',
    type: UpdateUserResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async updateUser(
    @Param('id') userId: string,
    @Body() updateUserDto: UpdateUserDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<UpdateUserResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Updating user', { userId, orgId, updatedBy: user.id });

    const request = {
      userId,
      orgId,
      firstName: updateUserDto.firstName,
      lastName: updateUserDto.lastName,
      username: updateUserDto.username,
      email: updateUserDto.email,
      phone: updateUserDto.phone,
      timezone: updateUserDto.timezone,
      language: updateUserDto.language,
      jobTitle: updateUserDto.jobTitle,
      department: updateUserDto.department,
      updatedBy: user.id,
    };

    const result = await this.updateUserUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.USERS_UPDATE)
  @ApiOperation({
    summary: 'Change user status',
    description: 'Change user status (ACTIVE, INACTIVE, LOCKED). Requires USERS:UPDATE permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User status changed successfully',
    type: ChangeUserStatusResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot change status',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async changeUserStatus(
    @Param('id') userId: string,
    @Body() changeUserStatusDto: ChangeUserStatusDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<ChangeUserStatusResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Changing user status', {
      userId,
      orgId,
      newStatus: changeUserStatusDto.status,
      changedBy: user.id,
    });

    const request = {
      userId,
      orgId,
      status: changeUserStatusDto.status,
      changedBy: user.id,
      reason: changeUserStatusDto.reason,
      lockDurationMinutes: changeUserStatusDto.lockDurationMinutes,
    };

    const result = await this.changeUserStatusUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Post(':id/roles')
  @HttpCode(HttpStatus.CREATED)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.USERS_MANAGE_ROLES)
  @ApiOperation({
    summary: 'Assign role to user',
    description: 'Assign a role to a user. Requires USERS:MANAGE_ROLES permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Role assigned successfully',
    type: AssignRoleResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User or role not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot assign role',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User already has this role',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async assignRole(
    @Param('id') userId: string,
    @Body() assignRoleDto: AssignRoleDto,
    @OrgId() orgId: string,
    @Req() req: Request
  ): Promise<AssignRoleResponseDto> {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Assigning role to user', {
      userId,
      roleId: assignRoleDto.roleId,
      orgId,
      assignedBy: user.id,
    });

    const request = {
      userId,
      roleId: assignRoleDto.roleId,
      orgId,
      assignedBy: user.id,
    };

    const result = await this.assignRoleToUserUseCase.execute(request);
    return resultToHttpResponse(result);
  }

  @Delete(':id/roles/:roleId')
  @HttpCode(HttpStatus.OK)
  @RateLimited('USER')
  @AllowOrganizationAdmin()
  @RequirePermissions(SYSTEM_PERMISSIONS.USERS_MANAGE_ROLES)
  @ApiOperation({
    summary: 'Remove role from user',
    description: 'Remove a role from a user. Requires USERS:MANAGE_ROLES permission.',
  })
  @ApiParam({ name: 'id', description: 'User ID', example: 'user-123' })
  @ApiParam({ name: 'roleId', description: 'Role ID', example: 'role-123' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Role removed successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User, role, or assignment not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot remove role',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async removeRole(
    @Param('id') userId: string,
    @Param('roleId') roleId: string,
    @OrgId() orgId: string,
    @Req() req: Request
  ) {
    const user = req.user as IAuthenticatedUser;
    this.logger.log('Removing role from user', {
      userId,
      roleId,
      orgId,
      removedBy: user.id,
    });

    const request = {
      userId,
      roleId,
      orgId,
      removedBy: user.id,
    };

    const result = await this.removeRoleFromUserUseCase.execute(request);
    return resultToHttpResponse(result);
  }
}
