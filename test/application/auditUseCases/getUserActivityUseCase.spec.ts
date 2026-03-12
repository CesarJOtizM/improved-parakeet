import { GetUserActivityUseCase } from '@application/auditUseCases/getUserActivityUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuditLog, type IAuditLogProps } from '@shared/audit/domain/entities/auditLog.entity';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

describe('GetUserActivityUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockUserId = 'user-123';

  let useCase: GetUserActivityUseCase;
  let mockAuditRepository: jest.Mocked<IAuditLogRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockAuditRepository = {
      save: jest.fn(),
      saveBatch: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      findByEntity: jest.fn(),
      findByUser: jest.fn(),
      findByAction: jest.fn(),
      findByDateRange: jest.fn(),
      findByFilters: jest.fn(),
      countByFilters: jest.fn(),
      exists: jest.fn(),
    } as jest.Mocked<IAuditLogRepository>;

    useCase = new GetUserActivityUseCase(mockAuditRepository);
  });

  describe('execute', () => {
    const createMockAuditLog = (overrides?: Partial<IAuditLogProps>): AuditLog => {
      const props: IAuditLogProps = {
        entityType: EntityType.create('User'),
        entityId: 'entity-123',
        action: AuditAction.create('CREATE'),
        metadata: AuditMetadata.create({ userId: mockUserId }),
        performedBy: mockUserId,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: '/api/users',
        httpStatusCode: 201,
        duration: 150,
        ...overrides,
      };
      return AuditLog.reconstitute(props, 'audit-log-123', mockOrgId);
    };

    it('Given: valid user id When: getting user activity Then: should return paginated activity', async () => {
      // Arrange
      const mockAuditLogs = [
        createMockAuditLog({ action: AuditAction.create('CREATE') }),
        createMockAuditLog({ action: AuditAction.create('UPDATE') }),
      ];
      mockAuditRepository.findByUser.mockResolvedValue(mockAuditLogs);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        page: 1,
        limit: 50,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(2);
          expect(value.data[0].action).toBe('CREATE');
          expect(value.data[1].action).toBe('UPDATE');
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(50);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findByUser).toHaveBeenCalledWith(mockUserId, mockOrgId, 50, 0);
    });

    it('Given: request with pagination When: getting user activity Then: should return paginated results', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog()];
      mockAuditRepository.findByUser.mockResolvedValue(mockAuditLogs);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        page: 2,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.pagination.page).toBe(2);
          expect(value.pagination.limit).toBe(10);
          expect(value.pagination.hasPrev).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findByUser).toHaveBeenCalledWith(mockUserId, mockOrgId, 10, 10);
    });

    it('Given: empty user activity When: getting user activity Then: should return empty list', async () => {
      // Arrange
      mockAuditRepository.findByUser.mockResolvedValue([]);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        page: 1,
        limit: 50,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data).toHaveLength(0);
          expect(value.pagination.total).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: no page/limit provided When: getting user activity Then: should default to page=1 limit=50', async () => {
      // Arrange
      mockAuditRepository.findByUser.mockResolvedValue([]);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        // no page, no limit
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(50);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findByUser).toHaveBeenCalledWith(mockUserId, mockOrgId, 50, 0);
    });

    it('Given: results equal to limit When: getting user activity Then: hasNext should be true and total should be estimated', async () => {
      // Arrange - return exactly limit number of results (50)
      const mockAuditLogs = Array.from({ length: 50 }, (_) =>
        createMockAuditLog({ action: AuditAction.create('CREATE') })
      );
      mockAuditRepository.findByUser.mockResolvedValue(mockAuditLogs);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        page: 1,
        limit: 50,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.hasNext).toBe(true);
          // total when results === limit: limit * page + 1 = 50*1+1 = 51
          expect(value.pagination.total).toBe(51);
          expect(value.pagination.hasPrev).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: results less than limit When: getting user activity Then: hasNext should be false', async () => {
      // Arrange - return fewer than limit
      const mockAuditLogs = [
        createMockAuditLog({ action: AuditAction.create('CREATE') }),
        createMockAuditLog({ action: AuditAction.create('UPDATE') }),
      ];
      mockAuditRepository.findByUser.mockResolvedValue(mockAuditLogs);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        page: 1,
        limit: 50,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.hasNext).toBe(false);
          // total when results < limit: results + (page-1)*limit = 2 + 0 = 2
          expect(value.pagination.total).toBe(2);
          expect(value.pagination.hasPrev).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: page 3 with limit 10 When: getting user activity Then: should calculate offset correctly and hasPrev=true', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog()];
      mockAuditRepository.findByUser.mockResolvedValue(mockAuditLogs);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        page: 3,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.page).toBe(3);
          expect(value.pagination.limit).toBe(10);
          expect(value.pagination.hasPrev).toBe(true);
          expect(value.pagination.hasNext).toBe(false);
          // total: 1 + (3-1)*10 = 21
          expect(value.pagination.total).toBe(21);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      // offset = (3-1)*10 = 20
      expect(mockAuditRepository.findByUser).toHaveBeenCalledWith(mockUserId, mockOrgId, 10, 20);
    });

    it('Given: audit log with null optional fields When: mapping Then: should return null values', async () => {
      // Arrange
      const mockAuditLogs = [
        createMockAuditLog({
          entityId: undefined,
          ipAddress: undefined,
          userAgent: undefined,
          httpMethod: undefined,
          httpUrl: undefined,
          httpStatusCode: undefined,
          duration: undefined,
        }),
      ];
      mockAuditRepository.findByUser.mockResolvedValue(mockAuditLogs);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].entityId).toBeNull();
          expect(value.data[0].ipAddress).toBeNull();
          expect(value.data[0].userAgent).toBeNull();
          expect(value.data[0].httpMethod).toBeNull();
          expect(value.data[0].httpUrl).toBeNull();
          expect(value.data[0].httpStatusCode).toBeNull();
          expect(value.data[0].duration).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: full page results on page 2 When: getting activity Then: total should be estimated correctly', async () => {
      // Arrange - return exactly limit number on page 2
      const mockAuditLogs = Array.from({ length: 10 }, () => createMockAuditLog());
      mockAuditRepository.findByUser.mockResolvedValue(mockAuditLogs);

      const request = {
        userId: mockUserId,
        orgId: mockOrgId,
        page: 2,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.hasNext).toBe(true);
          // total when results === limit: limit * page + 1 = 10*2+1 = 21
          expect(value.pagination.total).toBe(21);
          expect(value.pagination.hasPrev).toBe(true);
          expect(value.pagination.totalPages).toBe(3); // ceil(21/10) = 3
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
