import { GetEntityHistoryUseCase } from '@application/auditUseCases/getEntityHistoryUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuditLog, type IAuditLogProps } from '@shared/audit/domain/entities/auditLog.entity';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

describe('GetEntityHistoryUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockEntityId = 'entity-123';
  const mockEntityType = 'User';

  let useCase: GetEntityHistoryUseCase;
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

    useCase = new GetEntityHistoryUseCase(mockAuditRepository);
  });

  describe('execute', () => {
    const createMockAuditLog = (overrides?: Partial<IAuditLogProps>): AuditLog => {
      const props: IAuditLogProps = {
        entityType: EntityType.create(mockEntityType),
        entityId: mockEntityId,
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
      return AuditLog.reconstitute(props, 'audit-log-123', mockOrgId);
    };

    it('Given: valid entity type and id When: getting entity history Then: should return paginated history', async () => {
      // Arrange
      const mockAuditLogs = [
        createMockAuditLog({ action: AuditAction.create('CREATE') }),
        createMockAuditLog({ action: AuditAction.create('UPDATE') }),
      ];
      mockAuditRepository.findByEntity.mockResolvedValue(mockAuditLogs);

      const request = {
        entityType: mockEntityType,
        entityId: mockEntityId,
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
      expect(mockAuditRepository.findByEntity).toHaveBeenCalledWith(
        expect.any(EntityType),
        mockEntityId,
        mockOrgId,
        50,
        0
      );
    });

    it('Given: request with pagination When: getting entity history Then: should return paginated results', async () => {
      // Arrange
      const mockAuditLogs = [createMockAuditLog()];
      mockAuditRepository.findByEntity.mockResolvedValue(mockAuditLogs);

      const request = {
        entityType: mockEntityType,
        entityId: mockEntityId,
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
      expect(mockAuditRepository.findByEntity).toHaveBeenCalledWith(
        expect.any(EntityType),
        mockEntityId,
        mockOrgId,
        10,
        10
      );
    });

    it('Given: empty entity history When: getting entity history Then: should return empty list', async () => {
      // Arrange
      mockAuditRepository.findByEntity.mockResolvedValue([]);

      const request = {
        entityType: mockEntityType,
        entityId: mockEntityId,
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
  });
});
