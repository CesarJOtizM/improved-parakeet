import { GetAuditLogUseCase } from '@application/auditUseCases/getAuditLogUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { AuditLog, type IAuditLogProps } from '@shared/audit/domain/entities/auditLog.entity';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';

describe('GetAuditLogUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockAuditLogId = 'audit-log-123';

  let useCase: GetAuditLogUseCase;
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

    useCase = new GetAuditLogUseCase(mockAuditRepository);
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

    it('Given: valid audit log id When: getting audit log Then: should return audit log', async () => {
      // Arrange
      const mockAuditLog = createMockAuditLog({ entityId: 'entity-1' });
      mockAuditRepository.findById.mockResolvedValue(mockAuditLog);

      const request = {
        id: mockAuditLogId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.id).toBe(mockAuditLogId);
          expect(value.data.entityType).toBe('User');
          expect(value.data.action).toBe('CREATE');
          expect(value.data.performedBy).toBe('user-123');
          expect(value.data.ipAddress).toBe('192.168.1.1');
          expect(value.data.httpStatusCode).toBe(201);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockAuditRepository.findById).toHaveBeenCalledWith(mockAuditLogId, mockOrgId);
    });

    it('Given: non-existent audit log id When: getting audit log Then: should return NotFoundError', async () => {
      // Arrange
      mockAuditRepository.findById.mockResolvedValue(null);

      const request = {
        id: 'non-existent-id',
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Audit log not found');
        }
      );
      expect(mockAuditRepository.findById).toHaveBeenCalledWith('non-existent-id', mockOrgId);
    });

    it('Given: audit log with all null optional fields When: getting Then: should return nulls', async () => {
      // Arrange
      const minimalAuditLog = AuditLog.reconstitute(
        {
          entityType: EntityType.create('Product'),
          action: AuditAction.create('DELETE'),
          metadata: AuditMetadata.create({}),
          // no entityId, performedBy, ipAddress, userAgent, httpMethod, httpUrl, httpStatusCode, duration
        },
        mockAuditLogId,
        mockOrgId
      );
      mockAuditRepository.findById.mockResolvedValue(minimalAuditLog);

      // Act
      const result = await useCase.execute({ id: mockAuditLogId, orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.entityId).toBeNull();
          expect(value.data.performedBy).toBeNull();
          expect(value.data.ipAddress).toBeNull();
          expect(value.data.userAgent).toBeNull();
          expect(value.data.httpMethod).toBeNull();
          expect(value.data.httpUrl).toBeNull();
          expect(value.data.httpStatusCode).toBeNull();
          expect(value.data.duration).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: audit log with orgId undefined When: getting Then: should return orgId null', async () => {
      // Arrange - reconstitute without orgId
      const auditLogNoOrg = AuditLog.reconstitute(
        {
          entityType: EntityType.create('System'),
          action: AuditAction.create('UPDATE'),
          metadata: AuditMetadata.create({ key: 'value' }),
          entityId: 'entity-42',
          performedBy: 'system',
        },
        mockAuditLogId,
        undefined // no orgId
      );
      mockAuditRepository.findById.mockResolvedValue(auditLogNoOrg);

      // Act
      const result = await useCase.execute({ id: mockAuditLogId, orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.orgId).toBeNull();
          expect(value.data.entityId).toBe('entity-42');
          expect(value.data.performedBy).toBe('system');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: audit log with zero httpStatusCode and zero duration When: getting Then: should return null for falsy zero values', async () => {
      // Note: the source uses `|| null`, so 0 becomes null
      const auditLogWithZeros = AuditLog.reconstitute(
        {
          entityType: EntityType.create('Movement'),
          action: AuditAction.create('CREATE'),
          metadata: AuditMetadata.create({}),
          httpStatusCode: 0,
          duration: 0,
        },
        mockAuditLogId,
        mockOrgId
      );
      mockAuditRepository.findById.mockResolvedValue(auditLogWithZeros);

      const result = await useCase.execute({ id: mockAuditLogId, orgId: mockOrgId });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          // 0 || null = null due to falsy check
          expect(value.data.httpStatusCode).toBeNull();
          expect(value.data.duration).toBeNull();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: audit log with all optional fields populated When: getting Then: should return all fields', async () => {
      const fullAuditLog = createMockAuditLog({
        entityId: 'entity-100',
        performedBy: 'user-admin',
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent/1.0',
        httpMethod: 'GET',
        httpUrl: '/api/test',
        httpStatusCode: 200,
        duration: 42,
      });
      mockAuditRepository.findById.mockResolvedValue(fullAuditLog);

      const result = await useCase.execute({ id: mockAuditLogId, orgId: mockOrgId });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.entityId).toBe('entity-100');
          expect(value.data.performedBy).toBe('user-admin');
          expect(value.data.ipAddress).toBe('10.0.0.1');
          expect(value.data.userAgent).toBe('TestAgent/1.0');
          expect(value.data.httpMethod).toBe('GET');
          expect(value.data.httpUrl).toBe('/api/test');
          expect(value.data.httpStatusCode).toBe(200);
          expect(value.data.duration).toBe(42);
          expect(value.data.orgId).toBe(mockOrgId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
