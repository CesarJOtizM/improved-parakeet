import { GetAuditLogsUseCase } from '@application/auditUseCases/getAuditLogsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuditLog, type IAuditLogProps } from '@shared/audit/domain/entities/auditLog.entity';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

describe('GetAuditLogsUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockAuditLogId = 'audit-log-123';

  let useCase: GetAuditLogsUseCase;
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

    useCase = new GetAuditLogsUseCase(mockAuditRepository);
  });

  describe('execute', () => {
    const createMockAuditLog = (overrides?: Partial<IAuditLogProps>): AuditLog => {
      const props: IAuditLogProps = {
        entityType: EntityType.create('User'),
        action: AuditAction.create('CREATE'),
        metadata: AuditMetadata.create({ userId: 'user-123' }),
        performedBy: 'user-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: '/api/users',
        httpStatusCode: 201,
        duration: 150,
        ...overrides,
      };
      return AuditLog.reconstitute(props, mockAuditLogId, mockOrgId);
    };

    it('Given: valid request without filters When: getting audit logs Then: should return paginated audit logs', async () => {
      // Arrange
      const mockAuditLogs = [
        createMockAuditLog({ entityId: 'entity-1' }),
        createMockAuditLog({ entityId: 'entity-2' }),
      ];
      mockAuditRepository.findAll.mockResolvedValue(mockAuditLogs);

      const request = {
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
          expect(value.data[0].id).toBe(mockAuditLogId);
          expect(value.data[0].entityType).toBe('User');
          expect(value.data[0].action).toBe('CREATE');
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(50);
          expect(value.pagination.total).toBe(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findAll).toHaveBeenCalledWith(mockOrgId);
    });

    it('Given: request with entityType filter When: getting audit logs Then: should return filtered audit logs', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog({ entityId: 'entity-1' })];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        entityType: 'User',
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
          expect(value.data).toHaveLength(1);
          expect(value.data[0].entityType).toBe('User');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with date range filter When: getting audit logs Then: should return filtered audit logs', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockAuditLogs = [createMockAuditLog({ entityId: 'entity-1' })];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        startDate,
        endDate,
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
          expect(value.data).toHaveLength(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with pagination When: getting audit logs Then: should return paginated results', async () => {
      // Arrange
      const mockAuditLogs = Array.from({ length: 100 }, (_, i) =>
        createMockAuditLog({ entityId: `entity-${i}` })
      );
      mockAuditRepository.findAll.mockResolvedValue(mockAuditLogs);

      const request = {
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
          expect(value.data).toHaveLength(10);
          expect(value.pagination.page).toBe(2);
          expect(value.pagination.limit).toBe(10);
          expect(value.pagination.total).toBe(100);
          expect(value.pagination.hasNext).toBe(true);
          expect(value.pagination.hasPrev).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with all filters When: getting audit logs Then: should apply all filters', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const mockAuditLogs = [createMockAuditLog({ entityId: 'entity-1' })];
      mockAuditRepository.findBySpecification.mockResolvedValue({
        data: mockAuditLogs,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        entityType: 'User',
        entityId: 'entity-1',
        action: 'CREATE',
        performedBy: 'user-123',
        startDate,
        endDate,
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
          expect(value.data).toHaveLength(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findBySpecification).toHaveBeenCalled();
    });
  });
});
