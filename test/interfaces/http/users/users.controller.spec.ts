/* eslint-disable @typescript-eslint/no-explicit-any */
import { AssignRoleToUserUseCase } from '@application/userUseCases/assignRoleToUserUseCase';
import { ChangeUserStatusUseCase } from '@application/userUseCases/changeUserStatusUseCase';
import { CreateUserUseCase } from '@application/userUseCases/createUserUseCase';
import { GetUsersUseCase } from '@application/userUseCases/getUsersUseCase';
import { GetUserUseCase } from '@application/userUseCases/getUserUseCase';
import { RemoveRoleFromUserUseCase } from '@application/userUseCases/removeRoleFromUserUseCase';
import { UpdateUserUseCase } from '@application/userUseCases/updateUserUseCase';
import { UsersController } from '@interface/http/routes/users.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import { ok, err } from '@shared/domain/result';
import { ConflictError, NotFoundError } from '@shared/domain/result/domainError';

describe('UsersController', () => {
  let usersController: UsersController;
  let mockCreateUserUseCase: jest.Mocked<CreateUserUseCase>;
  let mockGetUserUseCase: jest.Mocked<GetUserUseCase>;
  let mockGetUsersUseCase: jest.Mocked<GetUsersUseCase>;
  let mockUpdateUserUseCase: jest.Mocked<UpdateUserUseCase>;
  let mockChangeUserStatusUseCase: jest.Mocked<ChangeUserStatusUseCase>;
  let mockAssignRoleToUserUseCase: jest.Mocked<AssignRoleToUserUseCase>;
  let mockRemoveRoleFromUserUseCase: jest.Mocked<RemoveRoleFromUserUseCase>;

  const mockOrgId = 'org-123';
  const mockUserId = 'user-123';
  const mockAdminUser = {
    id: 'admin-123',
    email: 'admin@example.com',
    username: 'admin',
    roles: ['ADMIN'],
    permissions: ['USERS:CREATE', 'USERS:READ', 'USERS:UPDATE'],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock use cases
    mockCreateUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateUserUseCase>;

    mockGetUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetUserUseCase>;

    mockGetUsersUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetUsersUseCase>;

    mockUpdateUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UpdateUserUseCase>;

    mockChangeUserStatusUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ChangeUserStatusUseCase>;

    mockAssignRoleToUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<AssignRoleToUserUseCase>;

    mockRemoveRoleFromUserUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<RemoveRoleFromUserUseCase>;

    // Create controller instance
    usersController = new UsersController(
      mockCreateUserUseCase,
      mockGetUserUseCase,
      mockGetUsersUseCase,
      mockUpdateUserUseCase,
      mockChangeUserStatusUseCase,
      mockAssignRoleToUserUseCase,
      mockRemoveRoleFromUserUseCase
    );
  });

  describe('createUser', () => {
    it('Given: valid user data When: creating user Then: should return created user', async () => {
      // Arrange
      const createUserDto = {
        email: 'newuser@example.com',
        username: 'newuser',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      const mockResponseData = {
        success: true as const,
        data: {
          id: mockUserId,
          email: createUserDto.email,
          username: createUserDto.username,
          firstName: createUserDto.firstName,
          lastName: createUserDto.lastName,
          status: 'ACTIVE',
          orgId: mockOrgId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        message: 'User created successfully',
        timestamp: new Date().toISOString(),
      };

      mockCreateUserUseCase.execute.mockResolvedValue(ok(mockResponseData));

      // Act
      const result = await usersController.createUser(createUserDto, mockOrgId, mockRequest);

      // Assert
      expect(mockCreateUserUseCase.execute).toHaveBeenCalledWith({
        email: createUserDto.email,
        username: createUserDto.username,
        password: createUserDto.password,
        firstName: createUserDto.firstName,
        lastName: createUserDto.lastName,
        orgId: mockOrgId,
        createdBy: mockAdminUser.id,
      });
      expect(result).toEqual(mockResponseData);
    });

    it('Given: duplicate email When: creating user Then: should throw ConflictException', async () => {
      // Arrange
      const createUserDto = {
        email: 'existing@example.com',
        username: 'newuser',
        password: 'ValidPass123!',
        firstName: 'John',
        lastName: 'Doe',
      };

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      mockCreateUserUseCase.execute.mockResolvedValue(
        err(new ConflictError('User with this email already exists'))
      );

      // Act & Assert - Controller converts DomainError to HttpException
      await expect(
        usersController.createUser(createUserDto, mockOrgId, mockRequest)
      ).rejects.toThrow();
    });
  });

  describe('getUsers', () => {
    it('Given: valid query parameters When: getting users Then: should return paginated users', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        status: 'ACTIVE' as const,
        search: 'john',
      };

      const mockResponse = {
        success: true as const,
        data: [
          {
            id: mockUserId,
            email: 'john@example.com',
            username: 'john',
            firstName: 'John',
            lastName: 'Doe',
            status: 'ACTIVE',
            roles: [],
            createdAt: new Date(),
          },
        ],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        message: 'Users retrieved successfully',
        timestamp: new Date().toISOString(),
      };

      mockGetUsersUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act
      const result = await usersController.getUsers(query, mockOrgId);

      // Assert
      expect(mockGetUsersUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        page: query.page,
        limit: query.limit,
        status: query.status,
        search: query.search,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getUser', () => {
    it('Given: valid user ID When: getting user Then: should return user', async () => {
      // Arrange
      const mockResponseData = {
        success: true as const,
        data: {
          id: mockUserId,
          email: 'user@example.com',
          username: 'user',
          firstName: 'John',
          lastName: 'Doe',
          status: 'ACTIVE',
          orgId: mockOrgId,
          roles: [],
          permissions: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        message: 'User retrieved successfully',
        timestamp: new Date().toISOString(),
      };

      mockGetUserUseCase.execute.mockResolvedValue(ok(mockResponseData));

      // Act
      const result = await usersController.getUser(mockUserId, mockOrgId);

      // Assert
      expect(mockGetUserUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        orgId: mockOrgId,
      });
      expect(result).toEqual(mockResponseData);
    });

    it('Given: non-existent user ID When: getting user Then: should throw NotFoundException', async () => {
      // Arrange
      mockGetUserUseCase.execute.mockResolvedValue(err(new NotFoundError('User not found')));

      // Act & Assert
      await expect(usersController.getUser('non-existent', mockOrgId)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateUser', () => {
    it('Given: valid user data When: updating user Then: should return updated user', async () => {
      // Arrange
      const updateUserDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'jane',
        email: 'jane@example.com',
      };

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      const mockResponseData = {
        success: true as const,
        data: {
          id: mockUserId,
          email: updateUserDto.email,
          username: updateUserDto.username,
          firstName: updateUserDto.firstName,
          lastName: updateUserDto.lastName,
          status: 'ACTIVE',
          orgId: mockOrgId,
          updatedAt: new Date(),
        },
        message: 'User updated successfully',
        timestamp: new Date().toISOString(),
      };

      mockUpdateUserUseCase.execute.mockResolvedValue(ok(mockResponseData));

      // Act
      const result = await usersController.updateUser(
        mockUserId,
        updateUserDto,
        mockOrgId,
        mockRequest
      );

      // Assert
      expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        orgId: mockOrgId,
        firstName: updateUserDto.firstName,
        lastName: updateUserDto.lastName,
        username: updateUserDto.username,
        email: updateUserDto.email,
        updatedBy: mockAdminUser.id,
      });
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('changeUserStatus', () => {
    it('Given: valid status change When: changing user status Then: should return updated user', async () => {
      // Arrange
      const changeUserStatusDto = {
        status: 'INACTIVE' as const,
        reason: 'User requested deactivation',
      } as any;

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      const mockResponseData = {
        success: true as const,
        data: {
          id: mockUserId,
          email: 'user@example.com',
          username: 'user',
          status: 'INACTIVE',
          orgId: mockOrgId,
          updatedAt: new Date(),
        },
        message: 'User status changed to INACTIVE successfully',
        timestamp: new Date().toISOString(),
      };

      mockChangeUserStatusUseCase.execute.mockResolvedValue(ok(mockResponseData));

      // Act
      const result = await usersController.changeUserStatus(
        mockUserId,
        changeUserStatusDto,
        mockOrgId,
        mockRequest
      );

      // Assert
      expect(mockChangeUserStatusUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        orgId: mockOrgId,
        status: changeUserStatusDto.status,
        changedBy: mockAdminUser.id,
        reason: changeUserStatusDto.reason,
      });
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('assignRole', () => {
    it('Given: valid role assignment When: assigning role Then: should return success response', async () => {
      // Arrange
      const assignRoleDto = {
        roleId: 'role-456',
      };

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      const mockResponseData = {
        success: true as const,
        data: {
          userId: mockUserId,
          roleId: assignRoleDto.roleId,
          roleName: 'SUPERVISOR',
          assignedAt: new Date(),
        },
        message: 'Role assigned successfully',
        timestamp: new Date().toISOString(),
      };

      mockAssignRoleToUserUseCase.execute.mockResolvedValue(ok(mockResponseData));

      // Act
      const result = await usersController.assignRole(
        mockUserId,
        assignRoleDto,
        mockOrgId,
        mockRequest
      );

      // Assert
      expect(mockAssignRoleToUserUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        roleId: assignRoleDto.roleId,
        orgId: mockOrgId,
        assignedBy: mockAdminUser.id,
      });
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('removeRole', () => {
    it('Given: valid role removal When: removing role Then: should return success response', async () => {
      // Arrange
      const roleId = 'role-456';

      const mockRequest = {
        user: mockAdminUser,
      } as any;

      const mockResponseData = {
        success: true as const,
        data: {
          userId: mockUserId,
          roleId,
          roleName: 'SUPERVISOR',
          removedAt: new Date(),
        },
        message: 'Role removed successfully',
        timestamp: new Date().toISOString(),
      };

      mockRemoveRoleFromUserUseCase.execute.mockResolvedValue(ok(mockResponseData));

      // Act
      const result = await usersController.removeRole(mockUserId, roleId, mockOrgId, mockRequest);

      // Assert
      expect(mockRemoveRoleFromUserUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        roleId,
        orgId: mockOrgId,
        removedBy: mockAdminUser.id,
      });
      expect(result).toEqual(mockResponseData);
    });
  });
});
