import { IntegrationSkuMapping } from '../../../src/integrations/shared/domain/entities/integrationSkuMapping.entity';
import { describe, expect, it } from '@jest/globals';

describe('IntegrationSkuMapping', () => {
  describe('create', () => {
    it('Given: valid props When: creating Then: should create mapping with generated ID', () => {
      const mapping = IntegrationSkuMapping.create(
        {
          connectionId: 'conn-1',
          externalSku: 'VTEX-SKU-001',
          productId: 'prod-1',
        },
        'org-1'
      );
      expect(mapping.connectionId).toBe('conn-1');
      expect(mapping.externalSku).toBe('VTEX-SKU-001');
      expect(mapping.productId).toBe('prod-1');
      expect(mapping.orgId).toBe('org-1');
      expect(mapping.id).toBeDefined();
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should preserve all fields', () => {
      const mapping = IntegrationSkuMapping.reconstitute(
        {
          connectionId: 'conn-1',
          externalSku: 'VTEX-SKU-001',
          productId: 'prod-1',
        },
        'mapping-1',
        'org-1'
      );
      expect(mapping.id).toBe('mapping-1');
      expect(mapping.connectionId).toBe('conn-1');
      expect(mapping.externalSku).toBe('VTEX-SKU-001');
      expect(mapping.productId).toBe('prod-1');
    });
  });
});
