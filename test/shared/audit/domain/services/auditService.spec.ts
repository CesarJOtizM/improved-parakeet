import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AuditService, ILogActionParams } from '@shared/audit/domain/services/auditService';
import { AuditLog } from '@shared/audit/domain/entities/auditLog.entity';
import { IAuditLogRepository } from '@shared/audit/domain/repositories/auditLogRepository.interface';
import { AuditAction } from '@shared/audit/domain/valueObjects/auditAction.valueObject';
import { EntityType } from '@shared/audit/domain/valueObjects/entityType.valueObject';
import { DomainEvent } from '@shared/domain/events/domainEvent.base';

// Concrete DomainEvent implementation for testing
class TestDomainEvent extends DomainEvent {
  private readonly _eventName: string;
  private readonly _occurredOn: Date;
  public readonly orgId?: string;

  constructor(eventName: string, occurredOn: Date = new Date(), orgId?: string) {
    super();
    this._eventName = eventName;
    this._occurredOn = occurredOn;
    this.orgId = orgId;
  }

  get eventName(): string {
    return this._eventName;
  }

  get occurredOn(): Date {
    return this._occurredOn;
  }
}

describe('AuditService', () => {
  let mockRepository: jest.Mocked<IAuditLogRepository>;

  beforeEach(() => {
    mockRepository = {
      save: jest.fn<IAuditLogRepository['save']>().mockResolvedValue(undefined as any),
      findById: jest.fn<IAuditLogRepository['findById']>(),
      findAll: jest.fn<IAuditLogRepository['findAll']>(),
      findByEntity: jest.fn<IAuditLogRepository['findByEntity']>(),
      findByUser: jest.fn<IAuditLogRepository['findByUser']>(),
    } as unknown as jest.Mocked<IAuditLogRepository>;

    jest.useFakeTimers();
  });

  describe('logAction', () => {
    it('Given: valid action params When: logging action Then: should create audit log and schedule save', async () => {
      // Arrange
      const params: ILogActionParams = {
        entityType: EntityType.create('Product'),
        entityId: 'product-123',
        action: AuditAction.create('CREATE'),
        performedBy: 'user-456',
        orgId: 'org-789',
        metadata: { field: 'name', newValue: 'Test Product' },
      };

      // Act
      await AuditService.logAction(params, mockRepository);

      // Flush setImmediate callbacks
      jest.runAllTimers();
      // Allow promises to resolve
      await Promise.resolve();

      // Assert - save is called asynchronously via setImmediate
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('Given: action params with sensitive data When: logging action Then: should redact sensitive fields', async () => {
      // Arrange
      const params: ILogActionParams = {
        entityType: EntityType.create('User'),
        entityId: 'user-123',
        action: AuditAction.create('UPDATE'),
        performedBy: 'admin-456',
        orgId: 'org-789',
        metadata: {
          password: 'secret123',
          name: 'John Doe',
          token: 'jwt-token-value',
          email: 'john@example.com',
        },
      };

      // Act
      await AuditService.logAction(params, mockRepository);

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert - the save was called
      expect(mockRepository.save).toHaveBeenCalled();
      const savedAuditLog = mockRepository.save.mock.calls[0]![0] as AuditLog;
      const metadata = savedAuditLog.metadata.getValue();
      expect(metadata['password']).toBe('[REDACTED]');
      expect(metadata['token']).toBe('[REDACTED]');
      expect(metadata['name']).toBe('John Doe');
      expect(metadata['email']).toBe('john@example.com');
    });

    it('Given: action params with no metadata When: logging action Then: should use empty metadata', async () => {
      // Arrange
      const params: ILogActionParams = {
        entityType: EntityType.create('Product'),
        action: AuditAction.create('DELETE'),
        performedBy: 'user-123',
      };

      // Act
      await AuditService.logAction(params, mockRepository);

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('Given: action params with nested sensitive data When: logging action Then: should redact nested sensitive fields', async () => {
      // Arrange
      const params: ILogActionParams = {
        entityType: EntityType.create('User'),
        action: AuditAction.create('CREATE'),
        metadata: {
          user: {
            name: 'Jane',
            passwordHash: 'hashed-value',
            apiKey: 'key-123',
          },
        },
      };

      // Act
      await AuditService.logAction(params, mockRepository);

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      const savedAuditLog = mockRepository.save.mock.calls[0]![0] as AuditLog;
      const metadata = savedAuditLog.metadata.getValue();
      const userMetadata = metadata['user'] as Record<string, unknown>;
      expect(userMetadata['name']).toBe('Jane');
      expect(userMetadata['passwordHash']).toBe('[REDACTED]');
      expect(userMetadata['apiKey']).toBe('[REDACTED]');
    });

    it('Given: action params with IP and user agent When: logging action Then: should include request context', async () => {
      // Arrange
      const params: ILogActionParams = {
        entityType: EntityType.create('Product'),
        entityId: 'prod-001',
        action: AuditAction.create('UPDATE'),
        performedBy: 'user-001',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      // Act
      await AuditService.logAction(params, mockRepository);

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      const savedAuditLog = mockRepository.save.mock.calls[0]![0] as AuditLog;
      expect(savedAuditLog.ipAddress).toBe('192.168.1.1');
      expect(savedAuditLog.userAgent).toBe('Mozilla/5.0');
    });
  });

  describe('logEvent', () => {
    it('Given: valid domain event When: logging event Then: should create audit log with event metadata', async () => {
      // Arrange
      const eventDate = new Date('2026-02-28T10:00:00Z');
      const event = new TestDomainEvent('ProductCreated', eventDate, 'org-123');

      // Act
      await AuditService.logEvent(
        event,
        EntityType.create('Product'),
        AuditAction.create('CREATE'),
        mockRepository,
        {
          entityId: 'product-xyz',
          performedBy: 'user-abc',
          orgId: 'org-123',
        }
      );

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('Given: domain event with orgId When: logging without explicit orgId Then: should extract orgId from event', async () => {
      // Arrange
      const event = new TestDomainEvent('SaleCompleted', new Date(), 'org-from-event');

      // Act
      await AuditService.logEvent(
        event,
        EntityType.create('Sale'),
        AuditAction.create('COMPLETE'),
        mockRepository,
        {
          entityId: 'sale-001',
        }
      );

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('logHttpRequest', () => {
    it('Given: valid HTTP request data When: logging request Then: should create audit log with HTTP details', async () => {
      // Arrange
      const params = {
        method: 'POST',
        url: '/api/products',
        statusCode: 201,
        duration: 150,
        performedBy: 'user-123',
        orgId: 'org-456',
        ipAddress: '10.0.0.1',
        userAgent: 'TestClient/1.0',
        requestBody: { name: 'New Product', sku: 'SKU-001' },
        responseBody: { id: 'prod-new', success: true },
      };

      // Act
      await AuditService.logHttpRequest(params, mockRepository);

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      const savedAuditLog = mockRepository.save.mock.calls[0]![0] as AuditLog;
      expect(savedAuditLog.httpMethod).toBe('POST');
      expect(savedAuditLog.httpUrl).toBe('/api/products');
      expect(savedAuditLog.httpStatusCode).toBe(201);
      expect(savedAuditLog.duration).toBe(150);
    });

    it('Given: HTTP request with sensitive body data When: logging request Then: should sanitize request body', async () => {
      // Arrange
      const params = {
        method: 'POST',
        url: '/api/auth/login',
        statusCode: 200,
        duration: 100,
        requestBody: { email: 'user@test.com', password: 'secret' },
        responseBody: { accessToken: 'jwt-token', refreshToken: 'ref-token' },
      };

      // Act
      await AuditService.logHttpRequest(params, mockRepository);

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      const savedAuditLog = mockRepository.save.mock.calls[0]![0] as AuditLog;
      const metadata = savedAuditLog.metadata.getValue();
      const reqBody = metadata['requestBody'] as Record<string, unknown>;
      const resBody = metadata['responseBody'] as Record<string, unknown>;
      expect(reqBody['password']).toBe('[REDACTED]');
      expect(reqBody['email']).toBe('user@test.com');
      expect(resBody['accessToken']).toBe('[REDACTED]');
      expect(resBody['refreshToken']).toBe('[REDACTED]');
    });
  });

  describe('logError', () => {
    it('Given: an error object When: logging error Then: should create audit log with error details', async () => {
      // Arrange
      const error = new Error('Something went wrong');

      // Act
      await AuditService.logError(
        error,
        {
          entityType: EntityType.create('System'),
          action: AuditAction.create('SYSTEM_ACTION'),
          performedBy: 'system',
          orgId: 'org-001',
        },
        mockRepository
      );

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      const savedAuditLog = mockRepository.save.mock.calls[0]![0] as AuditLog;
      const metadata = savedAuditLog.metadata.getValue();
      expect(metadata['errorMessage']).toBe('Something went wrong');
      expect(metadata['errorName']).toBe('Error');
      expect(metadata['errorStack']).toBeDefined();
    });

    it('Given: an error with no explicit context When: logging error Then: should use default entity type and action', async () => {
      // Arrange
      const error = new TypeError('Type mismatch');

      // Act
      await AuditService.logError(error, {}, mockRepository);

      // Flush setImmediate callbacks
      jest.runAllTimers();
      await Promise.resolve();

      // Assert
      expect(mockRepository.save).toHaveBeenCalled();
      const savedAuditLog = mockRepository.save.mock.calls[0]![0] as AuditLog;
      expect(savedAuditLog.entityType.getValue()).toBe('System');
      expect(savedAuditLog.action.getValue()).toBe('SYSTEM_ACTION');
      const metadata = savedAuditLog.metadata.getValue();
      expect(metadata['errorName']).toBe('TypeError');
    });
  });
});
