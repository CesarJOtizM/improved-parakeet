/* eslint-disable @typescript-eslint/no-explicit-any */
import { PrismaIntegrationSkuMappingRepository } from '@infrastructure/database/repositories/integrationSkuMapping.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IntegrationSkuMapping } from '../../../../src/integrations/shared/domain/entities/integrationSkuMapping.entity';

describe('PrismaIntegrationSkuMappingRepository', () => {
  let repository: PrismaIntegrationSkuMappingRepository;

  let mockPrismaService: {
    integrationSkuMapping: Record<string, jest.Mock<any>>;
  };

  const mockMappingData = {
    id: 'map-1',
    connectionId: 'conn-1',
    externalSku: 'VTEX-001',
    productId: 'prod-1',
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      integrationSkuMapping: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    repository = new PrismaIntegrationSkuMappingRepository(mockPrismaService as any);
  });

  describe('findByConnectionId', () => {
    it('Given: valid connectionId When: finding Then: should return mappings', async () => {
      mockPrismaService.integrationSkuMapping.findMany.mockResolvedValue([mockMappingData]);

      const result = await repository.findByConnectionId('conn-1');

      expect(result).toHaveLength(1);
      expect(result[0].externalSku).toBe('VTEX-001');
      expect(result[0].productId).toBe('prod-1');
      expect(mockPrismaService.integrationSkuMapping.findMany).toHaveBeenCalledWith({
        where: { connectionId: 'conn-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: no mappings When: finding Then: should return empty array', async () => {
      mockPrismaService.integrationSkuMapping.findMany.mockResolvedValue([]);

      const result = await repository.findByConnectionId('conn-1');

      expect(result).toHaveLength(0);
    });
  });

  describe('findByExternalSku', () => {
    it('Given: existing mapping When: finding by SKU Then: should return mapping', async () => {
      mockPrismaService.integrationSkuMapping.findFirst.mockResolvedValue(mockMappingData);

      const result = await repository.findByExternalSku('conn-1', 'VTEX-001');

      expect(result).not.toBeNull();
      expect(result?.externalSku).toBe('VTEX-001');
      expect(mockPrismaService.integrationSkuMapping.findFirst).toHaveBeenCalledWith({
        where: { connectionId: 'conn-1', externalSku: 'VTEX-001' },
      });
    });

    it('Given: no mapping When: finding by SKU Then: should return null', async () => {
      mockPrismaService.integrationSkuMapping.findFirst.mockResolvedValue(null);

      const result = await repository.findByExternalSku('conn-1', 'UNKNOWN');

      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('Given: mapping entity When: saving Then: should create in prisma', async () => {
      const mapping = IntegrationSkuMapping.create(
        { connectionId: 'conn-1', externalSku: 'VTEX-002', productId: 'prod-2' },
        'org-123'
      );
      mockPrismaService.integrationSkuMapping.create.mockResolvedValue({
        ...mockMappingData,
        id: mapping.id,
        externalSku: 'VTEX-002',
        productId: 'prod-2',
      });

      const result = await repository.save(mapping);

      expect(result).not.toBeNull();
      expect(result.externalSku).toBe('VTEX-002');
      expect(mockPrismaService.integrationSkuMapping.create).toHaveBeenCalledWith({
        data: {
          id: mapping.id,
          connectionId: 'conn-1',
          externalSku: 'VTEX-002',
          productId: 'prod-2',
          orgId: 'org-123',
        },
      });
    });
  });

  describe('findByConnectionId - non-Error throw', () => {
    it('Given: non-Error thrown When: finding by connectionId Then: should propagate non-Error', async () => {
      mockPrismaService.integrationSkuMapping.findMany.mockRejectedValue('string-error');

      await expect(repository.findByConnectionId('conn-1')).rejects.toBe('string-error');
    });
  });

  describe('delete', () => {
    it('Given: valid id When: deleting Then: should call prisma delete', async () => {
      mockPrismaService.integrationSkuMapping.delete.mockResolvedValue(mockMappingData);

      await repository.delete('map-1');

      expect(mockPrismaService.integrationSkuMapping.delete).toHaveBeenCalledWith({
        where: { id: 'map-1' },
      });
    });
  });
});
