import { IntegrationSyncLog } from '../../../src/integrations/shared/domain/entities/integrationSyncLog.entity';
import { describe, expect, it } from '@jest/globals';

describe('IntegrationSyncLog', () => {
  describe('create', () => {
    it('Given: valid props When: creating Then: should set processedAt to now by default', () => {
      const log = IntegrationSyncLog.create(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-123',
          action: 'SYNCED',
        },
        'org-1'
      );
      expect(log.connectionId).toBe('conn-1');
      expect(log.externalOrderId).toBe('ORD-123');
      expect(log.action).toBe('SYNCED');
      expect(log.processedAt).toBeDefined();
      expect(log.orgId).toBe('org-1');
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should preserve all fields', () => {
      const now = new Date();
      const log = IntegrationSyncLog.reconstitute(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-123',
          action: 'FAILED',
          errorMessage: 'SKU mismatch',
          processedAt: now,
        },
        'log-1',
        'org-1'
      );
      expect(log.id).toBe('log-1');
      expect(log.action).toBe('FAILED');
      expect(log.errorMessage).toBe('SKU mismatch');
      expect(log.processedAt).toBe(now);
    });
  });

  describe('markSuccess', () => {
    it('Given: failed log When: marking success Then: should update action and set saleId', () => {
      const log = IntegrationSyncLog.create(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-123',
          action: 'FAILED',
          errorMessage: 'temp error',
        },
        'org-1'
      );
      log.markSuccess('sale-1', 'contact-1');
      expect(log.action).toBe('SYNCED');
      expect(log.saleId).toBe('sale-1');
      expect(log.contactId).toBe('contact-1');
      expect(log.errorMessage).toBeUndefined();
    });
  });

  describe('markFailed', () => {
    it('Given: log When: marking failed Then: should set FAILED action and error message', () => {
      const log = IntegrationSyncLog.create(
        {
          connectionId: 'conn-1',
          externalOrderId: 'ORD-123',
          action: 'SYNCED',
        },
        'org-1'
      );
      log.markFailed('Connection timeout');
      expect(log.action).toBe('FAILED');
      expect(log.errorMessage).toBe('Connection timeout');
    });
  });
});
