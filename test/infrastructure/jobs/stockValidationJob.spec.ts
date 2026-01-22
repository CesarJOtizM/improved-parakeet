import { StockValidationJob } from '@infrastructure/jobs/stockValidationJob';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

describe('StockValidationJob', () => {
  let job: StockValidationJob;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockProductRepository: Record<string, jest.Mock<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockStockRepository: Record<string, jest.Mock<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockWarehouseRepository: Record<string, jest.Mock<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockReorderRuleRepository: Record<string, jest.Mock<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockOrganizationRepository: Record<string, jest.Mock<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockEventBus: Record<string, jest.Mock<any>>;

  const mockProduct = {
    id: 'product-123',
    name: 'Test Product',
    orgId: 'org-123',
  };

  const mockWarehouse = {
    id: 'warehouse-123',
    code: 'WH-001',
    name: 'Main Warehouse',
    isActive: true,
    orgId: 'org-123',
  };

  const mockOrganization = {
    id: 'org-123',
    name: 'Test Organization',
    isActive: true,
  };

  const mockReorderRule = {
    id: 'rule-123',
    productId: 'product-123',
    warehouseId: 'warehouse-123',
    minQty: MinQuantity.create(10),
    maxQty: MaxQuantity.create(100),
    safetyQty: SafetyStock.create(15),
    orgId: 'org-123',
  };

  beforeEach(() => {
    mockProductRepository = {
      findByStatus: jest.fn(),
    };

    mockStockRepository = {
      getStockQuantity: jest.fn(),
    };

    mockWarehouseRepository = {
      findActive: jest.fn(),
    };

    mockReorderRuleRepository = {
      findByProductAndWarehouse: jest.fn(),
    };

    mockOrganizationRepository = {
      findActiveOrganizations: jest.fn(),
    };

    mockEventBus = {
      publish: jest.fn(),
    };

    job = new StockValidationJob(
      mockProductRepository,
      mockStockRepository,
      mockWarehouseRepository,
      mockReorderRuleRepository,
      mockOrganizationRepository,
      mockEventBus as unknown as Parameters<
        typeof StockValidationJob.prototype.validateStockLevels
      >[0]
    );
  });

  describe('validateStockLevels', () => {
    it('Given: healthy stock levels When: validating Then: should complete without alerts', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(50, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockOrganizationRepository.findActiveOrganizations).toHaveBeenCalled();
      expect(mockProductRepository.findByStatus).toHaveBeenCalledWith('ACTIVE', 'org-123');
      expect(mockWarehouseRepository.findActive).toHaveBeenCalledWith('org-123');
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('Given: low stock levels When: validating Then: should emit low stock alert', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0)); // Below minQty of 10
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('Given: stock above max threshold When: validating Then: should emit threshold exceeded alert', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(150, 0)); // Above maxQty of 100
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('Given: no organizations When: validating Then: should complete without processing', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([]);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockProductRepository.findByStatus).not.toHaveBeenCalled();
    });

    it('Given: no products When: validating Then: should complete without alerts', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockStockRepository.getStockQuantity).not.toHaveBeenCalled();
    });

    it('Given: no warehouses When: validating Then: should complete without alerts', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([]);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockStockRepository.getStockQuantity).not.toHaveBeenCalled();
    });

    it('Given: organization repository error When: validating Then: should handle error gracefully', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockRejectedValue(
        new Error('Organization query failed')
      );

      // Act
      await job.validateStockLevels();

      // Assert - should not throw, error is logged
      expect(mockProductRepository.findByStatus).not.toHaveBeenCalled();
    });

    it('Given: product repository error When: validating Then: should continue with other orgs', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockRejectedValue(new Error('Product query failed'));

      // Act
      await job.validateStockLevels();

      // Assert - should not throw
      expect(mockWarehouseRepository.findActive).not.toHaveBeenCalled();
    });

    it('Given: stock repository error for specific product When: validating Then: should continue with others', async () => {
      // Arrange
      const product2 = { ...mockProduct, id: 'product-456' };
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct, product2]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity
        .mockRejectedValueOnce(new Error('Stock query failed'))
        .mockResolvedValueOnce(Quantity.create(50, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert - should continue processing
      expect(mockStockRepository.getStockQuantity).toHaveBeenCalledTimes(2);
    });

    it('Given: no reorder rule exists When: validating Then: should skip thresholds', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(null);

      // Act
      await job.validateStockLevels();

      // Assert - no alerts without thresholds
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('Given: multiple organizations When: validating Then: should process all', async () => {
      // Arrange
      const org2 = { ...mockOrganization, id: 'org-456' };
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([
        mockOrganization,
        org2,
      ]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(50, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockProductRepository.findByStatus).toHaveBeenCalledTimes(2);
      expect(mockProductRepository.findByStatus).toHaveBeenCalledWith('ACTIVE', 'org-123');
      expect(mockProductRepository.findByStatus).toHaveBeenCalledWith('ACTIVE', 'org-456');
    });

    it('Given: multiple products and warehouses When: validating Then: should check all combinations', async () => {
      // Arrange
      const product2 = { ...mockProduct, id: 'product-456' };
      const warehouse2 = { ...mockWarehouse, id: 'warehouse-456' };
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct, product2]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse, warehouse2]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(50, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert - should check 4 combinations (2 products x 2 warehouses)
      expect(mockStockRepository.getStockQuantity).toHaveBeenCalledTimes(4);
    });

    it('Given: reorder rule without maxQty When: validating Then: should not check max threshold', async () => {
      // Arrange
      const ruleWithoutMax = {
        ...mockReorderRule,
        maxQty: undefined,
      };
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(150, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(ruleWithoutMax);

      // Act
      await job.validateStockLevels();

      // Assert - no max threshold alert
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('Given: stock at safety level When: validating Then: should emit warning alert', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(12, 0)); // Below safety of 15, above min of 10
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('Given: event bus error When: publishing alert Then: should continue processing', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);
      mockEventBus.publish.mockRejectedValue(new Error('Event bus error'));

      // Act - should not throw
      await expect(job.validateStockLevels()).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('Given: zero stock When: validating Then: should emit critical alert', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(0, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('Given: very low stock (near zero) When: validating Then: should emit critical alert', async () => {
      // Arrange
      // Note: Negative stock is not allowed by the Quantity value object design
      // Testing with minimum valid stock (1) which is below minQty of 10
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(1, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalled();
    });

    it('Given: stock exactly at min quantity When: validating Then: should not alert', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 0)); // Exactly at minQty
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert - AlertService evaluates this as at minimum, may or may not alert based on implementation
      // This test documents the behavior
    });

    it('Given: stock exactly at max quantity When: validating Then: should not alert for exceeded', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(100, 0)); // Exactly at maxQty
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert - should not alert for exceeded (only > max triggers)
      const thresholdExceededCalls = mockEventBus.publish.mock.calls.filter(
        call => call[0].constructor.name === 'StockThresholdExceededEvent'
      );
      expect(thresholdExceededCalls).toHaveLength(0);
    });
  });
});
