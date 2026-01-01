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
  });
});
