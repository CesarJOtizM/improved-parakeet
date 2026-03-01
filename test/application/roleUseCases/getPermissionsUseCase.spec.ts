import { GetPermissionsUseCase } from '@application/roleUseCases/getPermissionsUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('GetPermissionsUseCase', () => {
  let useCase: GetPermissionsUseCase;
  let mockPrismaService: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrismaService = {
      permission: {
        findMany: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetPermissionsUseCase(mockPrismaService);
  });

  describe('execute', () => {
    it('Given: permissions exist When: getting all permissions Then: should return success with mapped data', async () => {
      // Arrange
      const permissions = [
        {
          id: 'perm-1',
          name: 'USERS:CREATE',
          description: 'Create users',
          module: 'USERS',
          action: 'CREATE',
        },
        {
          id: 'perm-2',
          name: 'USERS:READ',
          description: 'Read users',
          module: 'USERS',
          action: 'READ',
        },
        {
          id: 'perm-3',
          name: 'SALES:CREATE',
          description: null,
          module: 'SALES',
          action: 'CREATE',
        },
      ];
      mockPrismaService.permission.findMany.mockResolvedValue(permissions);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Permissions retrieved successfully');
          expect(value.data).toHaveLength(3);

          expect(value.data[0].id).toBe('perm-1');
          expect(value.data[0].name).toBe('USERS:CREATE');
          expect(value.data[0].description).toBe('Create users');
          expect(value.data[0].module).toBe('USERS');
          expect(value.data[0].action).toBe('CREATE');

          expect(value.data[2].description).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledWith({
        orderBy: [{ module: 'asc' }, { action: 'asc' }],
      });
    });

    it('Given: no permissions exist When: getting all permissions Then: should return success with empty array', async () => {
      // Arrange
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(0);
          expect(value.data).toEqual([]);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: permissions exist When: getting all permissions Then: response should include timestamp', async () => {
      // Arrange
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.timestamp).toBeDefined();
          expect(typeof value.timestamp).toBe('string');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: permissions exist When: getting all permissions Then: should query ordered by module then action', async () => {
      // Arrange
      mockPrismaService.permission.findMany.mockResolvedValue([]);

      // Act
      await useCase.execute();

      // Assert
      expect(mockPrismaService.permission.findMany).toHaveBeenCalledTimes(1);
      const callArgs = mockPrismaService.permission.findMany.mock.calls[0][0];
      expect(callArgs).toEqual({
        orderBy: [{ module: 'asc' }, { action: 'asc' }],
      });
    });
  });
});
