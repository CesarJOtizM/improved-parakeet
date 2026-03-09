import { IntegrationConnection } from '../../../src/integrations/shared/domain/entities/integrationConnection.entity';
import { describe, expect, it } from '@jest/globals';

describe('IntegrationConnection', () => {
  const defaultProps = {
    provider: 'VTEX',
    accountName: 'teststore',
    storeName: 'Test Store',
    syncStrategy: 'BOTH',
    syncDirection: 'BIDIRECTIONAL',
    encryptedAppKey: 'encrypted-key',
    encryptedAppToken: 'encrypted-token',
    webhookSecret: 'secret-123',
    defaultWarehouseId: 'wh-1',
    createdBy: 'user-1',
  };

  describe('create', () => {
    it('Given: valid props When: creating Then: should have DISCONNECTED status by default', () => {
      const connection = IntegrationConnection.create(defaultProps, 'org-1');
      expect(connection.status).toBe('DISCONNECTED');
      expect(connection.provider).toBe('VTEX');
      expect(connection.accountName).toBe('teststore');
      expect(connection.orgId).toBe('org-1');
      expect(connection.id).toBeDefined();
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should preserve all fields', () => {
      const connection = IntegrationConnection.reconstitute(
        { ...defaultProps, status: 'CONNECTED', connectedAt: new Date() },
        'conn-1',
        'org-1'
      );
      expect(connection.id).toBe('conn-1');
      expect(connection.status).toBe('CONNECTED');
      expect(connection.connectedAt).toBeDefined();
    });
  });

  describe('connect', () => {
    it('Given: disconnected connection When: connecting Then: should update status and connectedAt', () => {
      const connection = IntegrationConnection.create(defaultProps, 'org-1');
      connection.connect();
      expect(connection.status).toBe('CONNECTED');
      expect(connection.connectedAt).toBeDefined();
      expect(connection.lastSyncError).toBeUndefined();
    });
  });

  describe('disconnect', () => {
    it('Given: connected connection When: disconnecting Then: should update status', () => {
      const connection = IntegrationConnection.create(defaultProps, 'org-1');
      connection.connect();
      connection.disconnect();
      expect(connection.status).toBe('DISCONNECTED');
    });
  });

  describe('markError', () => {
    it('Given: connection When: marking error Then: should set ERROR status and error message', () => {
      const connection = IntegrationConnection.create(defaultProps, 'org-1');
      connection.markError('API connection failed');
      expect(connection.status).toBe('ERROR');
      expect(connection.lastSyncError).toBe('API connection failed');
    });
  });

  describe('updateLastSync', () => {
    it('Given: connection When: updating last sync Then: should set lastSyncAt and clear error', () => {
      const connection = IntegrationConnection.create(defaultProps, 'org-1');
      connection.markError('temp error');
      connection.updateLastSync();
      expect(connection.lastSyncAt).toBeDefined();
      expect(connection.lastSyncError).toBeUndefined();
    });
  });

  describe('updateCredentials', () => {
    it('Given: connection When: updating credentials Then: should update encrypted values', () => {
      const connection = IntegrationConnection.create(defaultProps, 'org-1');
      connection.updateCredentials('new-key', 'new-token');
      expect(connection.encryptedAppKey).toBe('new-key');
      expect(connection.encryptedAppToken).toBe('new-token');
    });
  });

  describe('update', () => {
    it('Given: connection When: updating fields Then: should only update provided fields', () => {
      const connection = IntegrationConnection.create(defaultProps, 'org-1');
      connection.update({ storeName: 'New Name', syncStrategy: 'POLLING' });
      expect(connection.storeName).toBe('New Name');
      expect(connection.syncStrategy).toBe('POLLING');
      expect(connection.syncDirection).toBe('BIDIRECTIONAL'); // unchanged
    });
  });
});
