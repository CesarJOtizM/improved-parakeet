import { describe, expect, it } from '@jest/globals';
import { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';
import {
  AuditLogByActionSpecification,
  AuditLogByDateRangeSpecification,
  AuditLogByEntityIdSpecification,
  AuditLogByEntityTypeSpecification,
  AuditLogByUserSpecification,
} from '@shared/audit/domain/specifications/auditLogSpecifications';
import {
  AuditAction,
  AuditActionValue,
} from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import {
  EntityType,
  EntityTypeValue,
} from '@shared/audit/domain/valueObjects/entityType.valueObject';

describe('AuditLogSpecifications', () => {
  const mockOrgId = 'org-123';

  const createMockAuditLog = (
    overrides: Partial<{
      id: string;
      entityType: EntityTypeValue;
      action: AuditActionValue;
      performedBy: string;
      entityId: string;
      createdAt: Date;
    }> = {}
  ): AuditLog => {
    const auditLog = AuditLog.reconstitute(
      {
        entityType: EntityType.create(overrides.entityType || 'User'),
        entityId: overrides.entityId || 'entity-123',
        action: AuditAction.create(overrides.action || 'CREATE'),
        performedBy: overrides.performedBy || 'user-123',
        metadata: AuditMetadata.empty(),
      },
      overrides.id || 'audit-123',
      mockOrgId
    );

    if (overrides.createdAt) {
      Object.defineProperty(auditLog, 'createdAt', {
        get: () => overrides.createdAt,
      });
    }

    return auditLog;
  };

  describe('AuditLogByEntityTypeSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a USER entity type audit log and USER specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const auditLog = createMockAuditLog({ entityType: 'User' });
        const specification = new AuditLogByEntityTypeSpecification('User');

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a USER entity type audit log and ORGANIZATION specification When: checking satisfaction Then: should return false', () => {
        // Arrange
        const auditLog = createMockAuditLog({ entityType: 'User' });
        const specification = new AuditLogByEntityTypeSpecification('Organization');

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: entity type specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new AuditLogByEntityTypeSpecification('Product');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          entityType: 'Product',
        });
      });

      it('Given: entity type specification with empty orgId When: converting to Prisma where Then: should set orgId to null', () => {
        // Arrange
        const specification = new AuditLogByEntityTypeSpecification('Product');

        // Act
        const result = specification.toPrismaWhere('');

        // Assert
        expect(result).toEqual({
          orgId: null,
          entityType: 'Product',
        });
      });
    });
  });

  describe('AuditLogByActionSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: a CREATE action audit log and CREATE specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const auditLog = createMockAuditLog({ action: 'CREATE' });
        const specification = new AuditLogByActionSpecification('CREATE');

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: a CREATE action audit log and UPDATE specification When: checking satisfaction Then: should return false', () => {
        // Arrange
        const auditLog = createMockAuditLog({ action: 'CREATE' });
        const specification = new AuditLogByActionSpecification('UPDATE');

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: action specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new AuditLogByActionSpecification('DELETE');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          action: 'DELETE',
        });
      });
    });
  });

  describe('AuditLogByDateRangeSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: an audit log within date range When: checking satisfaction Then: should return true', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const logDate = new Date('2024-06-15');

        const auditLog = createMockAuditLog({ createdAt: logDate });
        const specification = new AuditLogByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: an audit log before date range When: checking satisfaction Then: should return false', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const logDate = new Date('2023-12-15');

        const auditLog = createMockAuditLog({ createdAt: logDate });
        const specification = new AuditLogByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: an audit log after date range When: checking satisfaction Then: should return false', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const logDate = new Date('2025-01-15');

        const auditLog = createMockAuditLog({ createdAt: logDate });
        const specification = new AuditLogByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(false);
      });

      it('Given: an audit log at exact start date When: checking satisfaction Then: should return true', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        const auditLog = createMockAuditLog({ createdAt: startDate });
        const specification = new AuditLogByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: an audit log at exact end date When: checking satisfaction Then: should return true', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');

        const auditLog = createMockAuditLog({ createdAt: endDate });
        const specification = new AuditLogByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: date range specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2024-12-31');
        const specification = new AuditLogByDateRangeSpecification(startDate, endDate);

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        });
      });
    });
  });

  describe('AuditLogByUserSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: an audit log by user-123 and user-123 specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const auditLog = createMockAuditLog({ performedBy: 'user-123' });
        const specification = new AuditLogByUserSpecification('user-123');

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: an audit log by user-123 and user-456 specification When: checking satisfaction Then: should return false', () => {
        // Arrange
        const auditLog = createMockAuditLog({ performedBy: 'user-123' });
        const specification = new AuditLogByUserSpecification('user-456');

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: user specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new AuditLogByUserSpecification('specific-user');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          performedBy: 'specific-user',
        });
      });
    });
  });

  describe('AuditLogByEntityIdSpecification', () => {
    describe('isSatisfiedBy', () => {
      it('Given: an audit log with entity-123 and entity-123 specification When: checking satisfaction Then: should return true', () => {
        // Arrange
        const auditLog = createMockAuditLog({ entityId: 'entity-123' });
        const specification = new AuditLogByEntityIdSpecification('entity-123');

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(true);
      });

      it('Given: an audit log with entity-123 and entity-456 specification When: checking satisfaction Then: should return false', () => {
        // Arrange
        const auditLog = createMockAuditLog({ entityId: 'entity-123' });
        const specification = new AuditLogByEntityIdSpecification('entity-456');

        // Act
        const result = specification.isSatisfiedBy(auditLog);

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('toPrismaWhere', () => {
      it('Given: entity id specification When: converting to Prisma where Then: should return correct where clause', () => {
        // Arrange
        const specification = new AuditLogByEntityIdSpecification('specific-entity');

        // Act
        const result = specification.toPrismaWhere(mockOrgId);

        // Assert
        expect(result).toEqual({
          orgId: mockOrgId,
          entityId: 'specific-entity',
        });
      });
    });
  });
});
