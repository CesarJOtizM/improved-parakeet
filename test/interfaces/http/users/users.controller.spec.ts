/* eslint-disable @typescript-eslint/no-explicit-any */
import { AssignRoleToUserUseCase } from '@application/userUseCases/assignRoleToUserUseCase';
import { ChangePasswordUseCase } from '@application/authUseCases/changePasswordUseCase';
import { ChangeUserStatusUseCase } from '@application/userUseCases/changeUserStatusUseCase';
import { CreateUserUseCase } from '@application/userUseCases/createUserUseCase';
import { GetUsersUseCase } from '@application/userUseCases/getUsersUseCase';
import { GetUserUseCase } from '@application/userUseCases/getUserUseCase';
import { RemoveRoleFromUserUseCase } from '@application/userUseCases/removeRoleFromUserUseCase';
import { UpdateUserUseCase } from '@application/userUseCases/updateUserUseCase';
import { UsersController } from '@interface/http/routes/users.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { HttpException } from '@nestjs/common';
import { ok, err } from '@shared/domain/result';
import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/result/domainError';

describe('UsersController', () => {
  let usersController: UsersController;
  let mockCreateUserUseCase: jest.Mocked<CreateUserUseCase>;
  let mockGetUserUseCase: jest.Mocked<GetUserUseCase>;
  let mockGetUsersUseCase: jest.Mocked<GetUsersUseCase>;
  let mockUpdateUserUseCase: jest.Mocked<UpdateUserUseCase>;
  let mockChangeUserStatusUseCase: jest.Mocked<ChangeUserStatusUseCase>;
  let mockAssignRoleToUserUseCase: jest.Mocked<AssignRoleToUserUseCase>;
  let mockRemoveRoleFromUserUseCase: jest.Mocked<RemoveRoleFromUserUseCase>;
  let mockChangePasswordUseCase: jest.Mocked<ChangePasswordUseCase>;

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

    mockChangePasswordUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ChangePasswordUseCase>;

    // Create controller instance
    usersController = new UsersController(
      mockCreateUserUseCase,
      mockGetUserUseCase,
      mockGetUsersUseCase,
      mockUpdateUserUseCase,
      mockChangeUserStatusUseCase,
      mockAssignRoleToUserUseCase,
      mockRemoveRoleFromUserUseCase,
      mockChangePasswordUseCase
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
        HttpException
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

    it('Given: non-existent role When: removing role Then: should throw not found', async () => {
      // Arrange
      const mockRequest = { user: mockAdminUser } as any;
      mockRemoveRoleFromUserUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Role assignment not found'))
      );

      // Act & Assert
      await expect(
        usersController.removeRole(mockUserId, 'non-existent', mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getMyProfile', () => {
    it('Given: authenticated user When: getting own profile Then: should return user profile', async () => {
      // Arrange
      const mockRequest = { user: mockAdminUser } as any;
      const mockResponseData = {
        success: true as const,
        data: {
          id: mockAdminUser.id,
          email: mockAdminUser.email,
          username: mockAdminUser.username,
          status: 'ACTIVE',
        },
        message: 'User retrieved successfully',
        timestamp: new Date().toISOString(),
      };
      mockGetUserUseCase.execute.mockResolvedValue(ok(mockResponseData) as any);

      // Act
      const result = await usersController.getMyProfile(mockRequest, mockOrgId);

      // Assert
      expect(mockGetUserUseCase.execute).toHaveBeenCalledWith({
        userId: mockAdminUser.id,
        orgId: mockOrgId,
      });
      expect(result).toEqual(mockResponseData);
    });

    it('Given: error from use case When: getting own profile Then: should throw', async () => {
      // Arrange
      const mockRequest = { user: mockAdminUser } as any;
      mockGetUserUseCase.execute.mockResolvedValue(err(new NotFoundError('User not found')));

      // Act & Assert
      await expect(usersController.getMyProfile(mockRequest, mockOrgId)).rejects.toThrow(
        HttpException
      );
    });
  });

  describe('updateMyProfile', () => {
    it('Given: valid update data When: updating own profile Then: should return updated profile', async () => {
      // Arrange
      const updateDto = {
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567890',
        timezone: 'America/New_York',
        language: 'en',
        jobTitle: 'Developer',
        department: 'Engineering',
      };
      const mockRequest = { user: mockAdminUser } as any;
      const mockResponseData = {
        success: true as const,
        data: {
          id: mockAdminUser.id,
          firstName: 'Updated',
          lastName: 'Name',
        },
        message: 'Profile updated successfully',
        timestamp: new Date().toISOString(),
      };
      mockUpdateUserUseCase.execute.mockResolvedValue(ok(mockResponseData) as any);

      // Act
      const result = await usersController.updateMyProfile(updateDto, mockOrgId, mockRequest);

      // Assert
      expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith({
        userId: mockAdminUser.id,
        orgId: mockOrgId,
        firstName: 'Updated',
        lastName: 'Name',
        phone: '+1234567890',
        timezone: 'America/New_York',
        language: 'en',
        jobTitle: 'Developer',
        department: 'Engineering',
        updatedBy: mockAdminUser.id,
      });
      expect(result).toEqual(mockResponseData);
    });

    it('Given: error from use case When: updating own profile Then: should throw', async () => {
      // Arrange
      const updateDto = { firstName: '' };
      const mockRequest = { user: mockAdminUser } as any;
      mockUpdateUserUseCase.execute.mockResolvedValue(
        err(new ValidationError('First name is required'))
      );

      // Act & Assert
      await expect(
        usersController.updateMyProfile(updateDto, mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('changeMyPassword', () => {
    it('Given: valid password change When: changing password Then: should return success', async () => {
      // Arrange
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const mockRequest = { user: mockAdminUser } as any;
      const mockResponseData = {
        success: true as const,
        data: {},
        message: 'Password changed successfully',
        timestamp: new Date().toISOString(),
      };
      mockChangePasswordUseCase.execute.mockResolvedValue(ok(mockResponseData) as any);

      // Act
      const result = await usersController.changeMyPassword(
        changePasswordDto,
        mockOrgId,
        mockRequest
      );

      // Assert
      expect(mockChangePasswordUseCase.execute).toHaveBeenCalledWith({
        userId: mockAdminUser.id,
        orgId: mockOrgId,
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      });
      expect(result).toEqual(mockResponseData);
    });

    it('Given: incorrect current password When: changing password Then: should throw', async () => {
      // Arrange
      const changePasswordDto = {
        currentPassword: 'WrongPass',
        newPassword: 'NewPass456!',
        confirmPassword: 'NewPass456!',
      };
      const mockRequest = { user: mockAdminUser } as any;
      mockChangePasswordUseCase.execute.mockResolvedValue(
        err(new ValidationError('Current password is incorrect'))
      );

      // Act & Assert
      await expect(
        usersController.changeMyPassword(changePasswordDto, mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getUsers - additional branches', () => {
    it('Given: sortBy and sortOrder When: getting users Then: should pass sort params', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        sortBy: 'email' as const,
        sortOrder: 'desc' as const,
      };
      const mockResponse = {
        success: true as const,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'Users retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetUsersUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act
      const result = await usersController.getUsers(query, mockOrgId);

      // Assert
      expect(mockGetUsersUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: undefined,
        search: undefined,
        sortBy: 'email',
        sortOrder: 'desc',
      });
      expect(result).toEqual(mockResponse);
    });

    it('Given: error from use case When: getting users Then: should throw', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      mockGetUsersUseCase.execute.mockResolvedValue(err(new ValidationError('Invalid query')));

      // Act & Assert
      await expect(usersController.getUsers(query, mockOrgId)).rejects.toThrow(HttpException);
    });
  });

  describe('updateUser - error branches', () => {
    it('Given: non-existent user When: updating Then: should throw not found', async () => {
      // Arrange
      const updateDto = { firstName: 'Test' };
      const mockRequest = { user: mockAdminUser } as any;
      mockUpdateUserUseCase.execute.mockResolvedValue(err(new NotFoundError('User not found')));

      // Act & Assert
      await expect(
        usersController.updateUser('non-existent', updateDto, mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });

    it('Given: all update fields When: updating Then: should pass all fields', async () => {
      // Arrange
      const updateDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'jane',
        email: 'jane@example.com',
        phone: '+1234567890',
        timezone: 'America/New_York',
        language: 'en',
        jobTitle: 'Manager',
        department: 'Sales',
      };
      const mockRequest = { user: mockAdminUser } as any;
      const mockResponseData = {
        success: true as const,
        data: { id: mockUserId, ...updateDto },
        message: 'User updated',
        timestamp: new Date().toISOString(),
      };
      mockUpdateUserUseCase.execute.mockResolvedValue(ok(mockResponseData) as any);

      // Act
      const result = await usersController.updateUser(
        mockUserId,
        updateDto,
        mockOrgId,
        mockRequest
      );

      // Assert
      expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        orgId: mockOrgId,
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'jane',
        email: 'jane@example.com',
        phone: '+1234567890',
        timezone: 'America/New_York',
        language: 'en',
        jobTitle: 'Manager',
        department: 'Sales',
        updatedBy: mockAdminUser.id,
      });
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('changeUserStatus - error branches', () => {
    it('Given: non-existent user When: changing status Then: should throw not found', async () => {
      // Arrange
      const statusDto = { status: 'INACTIVE' as const } as any;
      const mockRequest = { user: mockAdminUser } as any;
      mockChangeUserStatusUseCase.execute.mockResolvedValue(
        err(new NotFoundError('User not found'))
      );

      // Act & Assert
      await expect(
        usersController.changeUserStatus('non-existent', statusDto, mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });

    it('Given: lockDurationMinutes When: changing status to LOCKED Then: should pass lock duration', async () => {
      // Arrange
      const statusDto = {
        status: 'LOCKED' as const,
        reason: 'Suspicious activity',
        lockDurationMinutes: 60,
      } as any;
      const mockRequest = { user: mockAdminUser } as any;
      const mockResponseData = {
        success: true as const,
        data: { id: mockUserId, status: 'LOCKED' },
        message: 'User locked',
        timestamp: new Date().toISOString(),
      };
      mockChangeUserStatusUseCase.execute.mockResolvedValue(ok(mockResponseData) as any);

      // Act
      const result = await usersController.changeUserStatus(
        mockUserId,
        statusDto,
        mockOrgId,
        mockRequest
      );

      // Assert
      expect(mockChangeUserStatusUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        orgId: mockOrgId,
        status: 'LOCKED',
        changedBy: mockAdminUser.id,
        reason: 'Suspicious activity',
        lockDurationMinutes: 60,
      });
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('createUser - validation branch', () => {
    it('Given: invalid email When: creating user Then: should throw validation error', async () => {
      // Arrange
      const createUserDto = {
        email: 'invalid',
        username: 'user',
        password: 'pass',
        firstName: 'F',
        lastName: 'L',
      };
      const mockRequest = { user: mockAdminUser } as any;
      mockCreateUserUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid email format'))
      );

      // Act & Assert
      await expect(
        usersController.createUser(createUserDto, mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('getUsers - no filters branch', () => {
    it('Given: empty query When: getting users Then: should pass undefined for all optional params', async () => {
      // Arrange
      const query = {} as any;
      const mockResponse = {
        success: true as const,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'Users retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetUsersUseCase.execute.mockResolvedValue(ok(mockResponse));

      // Act
      const result = await usersController.getUsers(query, mockOrgId);

      // Assert
      expect(mockGetUsersUseCase.execute).toHaveBeenCalledWith({
        orgId: mockOrgId,
        page: undefined,
        limit: undefined,
        status: undefined,
        search: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateMyProfile - partial fields branch', () => {
    it('Given: only firstName When: updating profile Then: should pass undefined for other fields', async () => {
      // Arrange
      const updateDto = { firstName: 'OnlyFirst' } as any;
      const mockRequest = { user: mockAdminUser } as any;
      const mockResponseData = {
        success: true as const,
        data: { id: mockAdminUser.id, firstName: 'OnlyFirst' },
        message: 'Profile updated',
        timestamp: new Date().toISOString(),
      };
      mockUpdateUserUseCase.execute.mockResolvedValue(ok(mockResponseData) as any);

      // Act
      const result = await usersController.updateMyProfile(updateDto, mockOrgId, mockRequest);

      // Assert
      expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith({
        userId: mockAdminUser.id,
        orgId: mockOrgId,
        firstName: 'OnlyFirst',
        lastName: undefined,
        phone: undefined,
        timezone: undefined,
        language: undefined,
        jobTitle: undefined,
        department: undefined,
        updatedBy: mockAdminUser.id,
      });
      expect(result).toEqual(mockResponseData);
    });
  });

  describe('changeUserStatus - validation error branch', () => {
    it('Given: invalid status value When: changing status Then: should throw validation error', async () => {
      // Arrange
      const statusDto = { status: 'INVALID_STATUS' } as any;
      const mockRequest = { user: mockAdminUser } as any;
      mockChangeUserStatusUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid status'))
      );

      // Act & Assert
      await expect(
        usersController.changeUserStatus(mockUserId, statusDto, mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('updateUser - partial fields branch', () => {
    it('Given: only email When: updating user Then: should pass undefined for other fields', async () => {
      // Arrange
      const updateDto = { email: 'new@example.com' } as any;
      const mockRequest = { user: mockAdminUser } as any;
      const mockResponseData = {
        success: true as const,
        data: { id: mockUserId, email: 'new@example.com' },
        message: 'User updated',
        timestamp: new Date().toISOString(),
      };
      mockUpdateUserUseCase.execute.mockResolvedValue(ok(mockResponseData) as any);

      // Act
      await usersController.updateUser(
        mockUserId,
        updateDto,
        mockOrgId,
        mockRequest
      );

      // Assert
      expect(mockUpdateUserUseCase.execute).toHaveBeenCalledWith({
        userId: mockUserId,
        orgId: mockOrgId,
        firstName: undefined,
        lastName: undefined,
        username: undefined,
        email: 'new@example.com',
        phone: undefined,
        timezone: undefined,
        language: undefined,
        jobTitle: undefined,
        department: undefined,
        updatedBy: mockAdminUser.id,
      });
    });
  });

  describe('changeMyPassword - mismatched passwords branch', () => {
    it('Given: mismatched passwords When: changing Then: should throw validation error', async () => {
      // Arrange
      const changePasswordDto = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass456!',
        confirmPassword: 'DifferentPass!',
      };
      const mockRequest = { user: mockAdminUser } as any;
      mockChangePasswordUseCase.execute.mockResolvedValue(
        err(new ValidationError('Passwords do not match'))
      );

      // Act & Assert
      await expect(
        usersController.changeMyPassword(changePasswordDto, mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });
  });

  describe('assignRole - error branches', () => {
    it('Given: duplicate role When: assigning Then: should throw conflict', async () => {
      // Arrange
      const assignRoleDto = { roleId: 'role-456' };
      const mockRequest = { user: mockAdminUser } as any;
      mockAssignRoleToUserUseCase.execute.mockResolvedValue(
        err(new ConflictError('User already has this role'))
      );

      // Act & Assert
      await expect(
        usersController.assignRole(mockUserId, assignRoleDto, mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });

    it('Given: non-existent user When: assigning role Then: should throw not found', async () => {
      // Arrange
      const assignRoleDto = { roleId: 'role-456' };
      const mockRequest = { user: mockAdminUser } as any;
      mockAssignRoleToUserUseCase.execute.mockResolvedValue(
        err(new NotFoundError('User not found'))
      );

      // Act & Assert
      await expect(
        usersController.assignRole('non-existent', assignRoleDto, mockOrgId, mockRequest)
      ).rejects.toThrow(HttpException);
    });
  });
});
