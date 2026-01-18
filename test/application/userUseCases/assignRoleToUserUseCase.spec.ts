/* eslint-disable @typescript-eslint/no-explicit-any */
import { AssignRoleToUserUseCase } from '@application/userUseCases/assignRoleToUserUseCase';
import { Role } from '@auth/domain/entities/role.entity';
import { User } from '@auth/domain/entities/user.entity';
import { IRoleRepository } from '@auth/domain/repositories/roleRepository.interface';
import { IUserRepository } from '@auth/domain/repositories/userRepository.interface';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

describe('AssignRoleToUserUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'user-123';
  const mockRoleId = 'role-456';
  const mockAssignedBy = 'admin-789';

  let useCase: AssignRoleToUserUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockRoleRepository: jest.Mocked<IRoleRepository>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockEventDispatcher: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByStatus: jest.fn(),
      findByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      findLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      countByStatus: jest.fn(),
      save: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
      findAll: jest.fn(),
    } as jest.Mocked<IUserRepository>;

    mockRoleRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findByStatus: jest.fn(),
      findActiveRoles: jest.fn(),
      findRolesByUser: jest.fn(),
      existsByName: jest.fn(),
      countByStatus: jest.fn(),
      findRolesWithPermissions: jest.fn(),
      findAll: jest.fn(),
      count: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
    } as unknown as jest.Mocked<IRoleRepository>;

    mockPrismaService = {
      userRole: {
        findUnique: jest.fn(),
        create: jest.fn(),
      } as any,
    } as jest.Mocked<PrismaService>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as any;

    useCase = new AssignRoleToUserUseCase(
      mockUserRepository,
      mockRoleRepository,
      mockPrismaService,
      mockEventDispatcher
    );
  });

  describe('execute', () => {
    const createMockUser = (roles: string[] = []) => {
      const user = User.reconstitute(
        {
          email: Email.create('test@example.com'),
          username: 'testuser',
          passwordHash: User.create(
            {
              email: Email.create('test@example.com'),
              username: 'testuser',
              password: 'SecurePass123!',
              firstName: 'Test',
              lastName: 'User',
              status: UserStatus.create('ACTIVE'),
              failedLoginAttempts: 0,
            },
            mockOrgId
          ).passwordHash as any,
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockUserId,
        mockOrgId
      );

      (user as any).props.roles = roles;
      return user;
    };

    const createMockRole = (name: string, isActive: boolean = true) => {
      return Role.reconstitute(
        {
          name,
          description: `Role ${name}`,
          isActive,
          isSystem: false,
        },
        mockRoleId,
        mockOrgId
      );
    };

    it('Given: valid user and role When: assigning role Then: should return success result', async () => {
      // Arrange
      const user = createMockUser([]); // User receiving the role
      const assigningUser = createMockUser(['ADMIN']); // User making the assignment (needs ADMIN role)
      const role = createMockRole('SUPERVISOR');

      // Mock repository calls: first for the user receiving the role, then for the user assigning
      mockUserRepository.findById
        .mockResolvedValueOnce(user) // First call: user receiving the role
        .mockResolvedValueOnce(assigningUser); // Second call: user making the assignment
      mockRoleRepository.findById.mockResolvedValue(role);
      mockPrismaService.userRole.findUnique.mockResolvedValue(null);
      mockPrismaService.userRole.create.mockResolvedValue({} as any);

      const request = {
        userId: mockUserId,
        roleId: mockRoleId,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Role assigned successfully');
          expect(value.data.roleName).toBe('SUPERVISOR');
        },
        () => fail('Should not return error')
      );
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockUserId, mockOrgId);
      expect(mockUserRepository.findById).toHaveBeenCalledWith(mockAssignedBy, mockOrgId);
      expect(mockRoleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(mockPrismaService.userRole.create).toHaveBeenCalled();
    });

    it('Given: non-existent user When: assigning role Then: should return NotFoundError result', async () => {
      // Arrange
      mockUserRepository.findById.mockResolvedValue(null);

      const request = {
        userId: mockUserId,
        roleId: mockRoleId,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('User not found');
        }
      );
      expect(mockPrismaService.userRole.create).not.toHaveBeenCalled();
    });

    it('Given: non-existent role When: assigning role Then: should return NotFoundError result', async () => {
      // Arrange
      const user = createMockUser([]);
      mockUserRepository.findById.mockResolvedValue(user);
      mockRoleRepository.findById.mockResolvedValue(null);

      const request = {
        userId: mockUserId,
        roleId: mockRoleId,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('Role not found');
        }
      );
    });

    it('Given: user already has role When: assigning role Then: should return error result', async () => {
      // Arrange
      const user = createMockUser(['SUPERVISOR']); // User already has the role
      const assigningUser = createMockUser(['ADMIN']); // User making the assignment
      const role = createMockRole('SUPERVISOR');

      // Mock repository calls: first for the user receiving the role, then for the user assigning
      mockUserRepository.findById
        .mockResolvedValueOnce(user) // First call: user receiving the role
        .mockResolvedValueOnce(assigningUser); // Second call: user making the assignment
      mockRoleRepository.findById.mockResolvedValue(role);

      const request = {
        userId: mockUserId,
        roleId: mockRoleId,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
        }
      );
      expect(mockPrismaService.userRole.create).not.toHaveBeenCalled();
    });

    it('Given: inactive role When: assigning role Then: should return error result', async () => {
      // Arrange
      const user = createMockUser([]); // User receiving the role
      const assigningUser = createMockUser(['ADMIN']); // User making the assignment
      const role = createMockRole('SUPERVISOR', false);

      // Mock repository calls: first for the user receiving the role, then for the user assigning
      mockUserRepository.findById
        .mockResolvedValueOnce(user) // First call: user receiving the role
        .mockResolvedValueOnce(assigningUser); // Second call: user making the assignment
      mockRoleRepository.findById.mockResolvedValue(role);

      const request = {
        userId: mockUserId,
        roleId: mockRoleId,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
        }
      );
    });

    it('Given: assigning user not found When: assigning role Then: should return NotFoundError result', async () => {
      // Arrange
      const user = createMockUser([]); // User receiving the role
      const role = createMockRole('SUPERVISOR');

      // Mock repository calls: user exists, but assigning user does not
      mockUserRepository.findById
        .mockResolvedValueOnce(user) // First call: user receiving the role
        .mockResolvedValueOnce(null); // Second call: user making the assignment (not found)
      mockRoleRepository.findById.mockResolvedValue(role);

      const request = {
        userId: mockUserId,
        roleId: mockRoleId,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('User assigning the role not found');
        }
      );
      expect(mockPrismaService.userRole.create).not.toHaveBeenCalled();
    });

    it('Given: assigning user without ADMIN role When: assigning role Then: should return BusinessRuleError', async () => {
      // Arrange
      const user = createMockUser([]); // User receiving the role
      const assigningUser = createMockUser(['SUPERVISOR']); // User making the assignment (no ADMIN role)
      const role = createMockRole('SUPERVISOR');

      // Mock repository calls: first for the user receiving the role, then for the user assigning
      mockUserRepository.findById
        .mockResolvedValueOnce(user) // First call: user receiving the role
        .mockResolvedValueOnce(assigningUser); // Second call: user making the assignment
      mockRoleRepository.findById.mockResolvedValue(role);

      const request = {
        userId: mockUserId,
        roleId: mockRoleId,
        orgId: mockOrgId,
        assignedBy: mockAssignedBy,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => fail('Should not return success'),
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('Insufficient permissions to assign roles');
        }
      );
      expect(mockPrismaService.userRole.create).not.toHaveBeenCalled();
    });
  });
});
