import { PrismaReorderRuleRepository } from '@infrastructure/database/repositories/reorderRule.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

describe('PrismaReorderRuleRepository', () => {
  let repository: PrismaReorderRuleRepository;

  let mockPrismaService: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    reorderRule: Record<string, jest.Mock<any>>;
  };

  const mockReorderRuleData = {
    id: 'rule-123',
    productId: 'product-123',
    warehouseId: 'wh-123',
    minQty: 10,
    maxQty: 100,
    safetyQty: 20,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    product: { id: 'product-123', name: 'Test Product', sku: 'SKU-001' },
    warehouse: { id: 'wh-123', name: 'Main Warehouse' },
  };

  beforeEach(() => {
    mockPrismaService = {
      reorderRule: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaReorderRuleRepository(mockPrismaService as any);
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return reorder rules', async () => {
      // Arrange
      mockPrismaService.reorderRule.findMany.mockResolvedValue([mockReorderRuleData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rule-123');
      expect(result[0].productId).toBe('product-123');
      expect(result[0].warehouseId).toBe('wh-123');
      expect(mockPrismaService.reorderRule.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        include: { product: true, warehouse: true },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: no rules When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.reorderRule.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: prisma throws error When: finding all Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.reorderRule.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('DB Error');
    });

    it('Given: non-Error thrown When: finding all Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.reorderRule.findMany.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('string-error');
    });
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return reorder rule', async () => {
      // Arrange
      mockPrismaService.reorderRule.findFirst.mockResolvedValue(mockReorderRuleData);

      // Act
      const result = await repository.findById('rule-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('rule-123');
      expect(result?.minQty.getNumericValue()).toBe(10);
      expect(result?.maxQty.getNumericValue()).toBe(100);
      expect(result?.safetyQty.getNumericValue()).toBe(20);
      expect(mockPrismaService.reorderRule.findFirst).toHaveBeenCalledWith({
        where: { id: 'rule-123', orgId: 'org-123' },
        include: { product: true, warehouse: true },
      });
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.reorderRule.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findByProductAndWarehouse', () => {
    it('Given: valid productId and warehouseId When: finding Then: should return rule', async () => {
      // Arrange
      mockPrismaService.reorderRule.findUnique.mockResolvedValue(mockReorderRuleData);

      // Act
      const result = await repository.findByProductAndWarehouse('product-123', 'wh-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.productId).toBe('product-123');
      expect(result?.warehouseId).toBe('wh-123');
      expect(mockPrismaService.reorderRule.findUnique).toHaveBeenCalledWith({
        where: {
          productId_warehouseId_orgId: {
            productId: 'product-123',
            warehouseId: 'wh-123',
            orgId: 'org-123',
          },
        },
      });
    });

    it('Given: no matching rule When: finding by product and warehouse Then: should return null', async () => {
      // Arrange
      mockPrismaService.reorderRule.findUnique.mockResolvedValue(null);

      // Act
      const result = await repository.findByProductAndWarehouse('unknown', 'unknown', 'org-123');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('Given: valid reorder rule When: creating Then: should create and return rule', async () => {
      // Arrange
      mockPrismaService.reorderRule.create.mockResolvedValue(mockReorderRuleData);

      const rule = ReorderRule.reconstitute(
        {
          productId: 'product-123',
          warehouseId: 'wh-123',
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(20),
        },
        'rule-123',
        'org-123'
      );

      // Act
      const result = await repository.create(rule);

      // Assert
      expect(result).not.toBeNull();
      expect(result.productId).toBe('product-123');
      expect(mockPrismaService.reorderRule.create).toHaveBeenCalledWith({
        data: {
          productId: 'product-123',
          warehouseId: 'wh-123',
          minQty: 10,
          maxQty: 100,
          safetyQty: 20,
          orgId: 'org-123',
        },
        include: { product: true, warehouse: true },
      });
    });
  });

  describe('update', () => {
    it('Given: existing rule When: updating Then: should update and return rule', async () => {
      // Arrange
      const updatedData = { ...mockReorderRuleData, minQty: 15 };
      mockPrismaService.reorderRule.update.mockResolvedValue(updatedData);

      const rule = ReorderRule.reconstitute(
        {
          productId: 'product-123',
          warehouseId: 'wh-123',
          minQty: MinQuantity.create(15),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(20),
        },
        'rule-123',
        'org-123'
      );

      // Act
      const result = await repository.update(rule);

      // Assert
      expect(result).not.toBeNull();
      expect(result.minQty.getNumericValue()).toBe(15);
      expect(mockPrismaService.reorderRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-123' },
        data: {
          minQty: 15,
          maxQty: 100,
          safetyQty: 20,
        },
        include: { product: true, warehouse: true },
      });
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should delete rule', async () => {
      // Arrange
      mockPrismaService.reorderRule.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('rule-123', 'org-123');

      // Assert
      expect(mockPrismaService.reorderRule.deleteMany).toHaveBeenCalledWith({
        where: { id: 'rule-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent rule When: deleting Then: should not throw', async () => {
      // Arrange
      mockPrismaService.reorderRule.deleteMany.mockResolvedValue({ count: 0 });

      // Act & Assert
      await expect(repository.delete('non-existent', 'org-123')).resolves.not.toThrow();
    });

    it('Given: prisma throws error When: deleting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.reorderRule.deleteMany.mockRejectedValue(new Error('Delete Error'));

      // Act & Assert
      await expect(repository.delete('rule-123', 'org-123')).rejects.toThrow('Delete Error');
    });

    it('Given: non-Error thrown When: deleting Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.reorderRule.deleteMany.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.delete('rule-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findById - error handling', () => {
    it('Given: prisma throws error When: finding by id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.reorderRule.findFirst.mockRejectedValue(new Error('FindById Error'));

      // Act & Assert
      await expect(repository.findById('rule-123', 'org-123')).rejects.toThrow('FindById Error');
    });

    it('Given: non-Error thrown When: finding by id Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.reorderRule.findFirst.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findById('rule-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findByProductAndWarehouse - error handling', () => {
    it('Given: prisma throws error When: finding by product and warehouse Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.reorderRule.findUnique.mockRejectedValue(new Error('FindByPW Error'));

      // Act & Assert
      await expect(
        repository.findByProductAndWarehouse('product-123', 'wh-123', 'org-123')
      ).rejects.toThrow('FindByPW Error');
    });

    it('Given: non-Error thrown When: finding by product and warehouse Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.reorderRule.findUnique.mockRejectedValue('string-error');

      // Act & Assert
      await expect(
        repository.findByProductAndWarehouse('product-123', 'wh-123', 'org-123')
      ).rejects.toBe('string-error');
    });
  });

  describe('create - error handling', () => {
    it('Given: prisma throws error When: creating Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.reorderRule.create.mockRejectedValue(new Error('Create Error'));

      const rule = ReorderRule.reconstitute(
        {
          productId: 'product-123',
          warehouseId: 'wh-123',
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(20),
        },
        'rule-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.create(rule)).rejects.toThrow('Create Error');
    });

    it('Given: non-Error thrown When: creating Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.reorderRule.create.mockRejectedValue('string-error');

      const rule = ReorderRule.reconstitute(
        {
          productId: 'product-123',
          warehouseId: 'wh-123',
          minQty: MinQuantity.create(10),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(20),
        },
        'rule-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.create(rule)).rejects.toBe('string-error');
    });
  });

  describe('update - error handling', () => {
    it('Given: prisma throws error When: updating Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.reorderRule.update.mockRejectedValue(new Error('Update Error'));

      const rule = ReorderRule.reconstitute(
        {
          productId: 'product-123',
          warehouseId: 'wh-123',
          minQty: MinQuantity.create(15),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(20),
        },
        'rule-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.update(rule)).rejects.toThrow('Update Error');
    });

    it('Given: non-Error thrown When: updating Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.reorderRule.update.mockRejectedValue('string-error');

      const rule = ReorderRule.reconstitute(
        {
          productId: 'product-123',
          warehouseId: 'wh-123',
          minQty: MinQuantity.create(15),
          maxQty: MaxQuantity.create(100),
          safetyQty: SafetyStock.create(20),
        },
        'rule-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.update(rule)).rejects.toBe('string-error');
    });
  });

  describe('findAll - multiple rules', () => {
    it('Given: multiple rules When: finding all Then: should return all mapped rules', async () => {
      // Arrange
      const rule2 = {
        ...mockReorderRuleData,
        id: 'rule-456',
        productId: 'product-456',
        minQty: 5,
        maxQty: 50,
        safetyQty: 10,
      };
      mockPrismaService.reorderRule.findMany.mockResolvedValue([mockReorderRuleData, rule2]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('rule-123');
      expect(result[1].id).toBe('rule-456');
      expect(result[1].minQty.getNumericValue()).toBe(5);
    });
  });
});
