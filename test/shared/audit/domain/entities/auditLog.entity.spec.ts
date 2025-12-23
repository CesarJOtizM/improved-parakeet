import { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { AuditMetadata } from '@shared/audit/domain/valueObjects/auditMetadata.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';

describe('AuditLog Entity', () => {
  describe('Given: valid audit log props When: creating AuditLog Then: should create successfully', () => {
    it('should create audit log with all fields', () => {
      // Arrange
      const props = {
        entityType: EntityType.create('User'),
        entityId: 'user-123',
        action: AuditAction.create('CREATE'),
        performedBy: 'admin-123',
        metadata: AuditMetadata.create({ reason: 'User creation' }),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        httpMethod: 'POST',
        httpUrl: '/api/users',
        httpStatusCode: 201,
        duration: 150,
      };

      // Act
      const auditLog = AuditLog.create(props, 'org-123');

      // Assert
      expect(auditLog.id).toBeDefined();
      expect(auditLog.orgId).toBe('org-123');
      expect(auditLog.entityType.getValue()).toBe('User');
      expect(auditLog.entityId).toBe('user-123');
      expect(auditLog.action.getValue()).toBe('CREATE');
      expect(auditLog.performedBy).toBe('admin-123');
      expect(auditLog.ipAddress).toBe('192.168.1.1');
      expect(auditLog.httpMethod).toBe('POST');
      expect(auditLog.httpStatusCode).toBe(201);
      expect(auditLog.duration).toBe(150);
    });

    it('should create audit log with minimal fields', () => {
      // Arrange
      const props = {
        entityType: EntityType.create('System'),
        action: AuditAction.create('SYSTEM_ACTION'),
        metadata: AuditMetadata.empty(),
      };

      // Act
      const auditLog = AuditLog.create(props);

      // Assert
      expect(auditLog.id).toBeDefined();
      expect(auditLog.entityType.getValue()).toBe('System');
      expect(auditLog.action.getValue()).toBe('SYSTEM_ACTION');
      expect(auditLog.entityId).toBeUndefined();
      expect(auditLog.performedBy).toBeUndefined();
    });
  });

  describe('Given: audit log data When: reconstituting Then: should reconstitute correctly', () => {
    it('should reconstitute audit log from persistence', () => {
      // Arrange
      const props = {
        entityType: EntityType.create('User'),
        entityId: 'user-123',
        action: AuditAction.create('UPDATE'),
        performedBy: 'admin-123',
        metadata: AuditMetadata.create({ field: 'name', oldValue: 'Old', newValue: 'New' }),
      };

      // Act
      const auditLog = AuditLog.reconstitute(props, 'log-123', 'org-123');

      // Assert
      expect(auditLog.id).toBe('log-123');
      expect(auditLog.orgId).toBe('org-123');
      expect(auditLog.entityType.getValue()).toBe('User');
    });
  });
});
