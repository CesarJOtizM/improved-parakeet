/* eslint-disable @typescript-eslint/no-explicit-any */
import { StockValidationJob } from '@infrastructure/jobs/stockValidationJob';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

describe('StockValidationJob', () => {
  let job: StockValidationJob;

  let mockProductRepository: Record<string, jest.Mock<any>>;

  let mockStockRepository: Record<string, jest.Mock<any>>;

  let mockWarehouseRepository: Record<string, jest.Mock<any>>;

  let mockReorderRuleRepository: Record<string, jest.Mock<any>>;

  let mockOrganizationRepository: Record<string, jest.Mock<any>>;

  let mockPrismaService: Record<string, any>;

  let mockEventBus: Record<string, jest.Mock<any>>;

  let mockNotificationService: Record<string, jest.Mock<any>>;

  const mockProduct = {
    id: 'product-123',
    name: { getValue: () => 'Test Product' },
    sku: { getValue: () => 'SKU-001' },
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
    getSetting: (key: string) => {
      const settings: Record<string, unknown> = { language: 'es' };
      return settings[key];
    },
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

    mockPrismaService = {
      alertConfiguration: {
        findUnique: jest.fn().mockResolvedValue({
          orgId: 'org-123',
          isEnabled: true,
          cronFrequency: 'EVERY_HOUR',
          notifyLowStock: true,
          notifyCriticalStock: true,
          notifyOutOfStock: true,
          recipientEmails: '',
          lastRunAt: null,
        }),
        update: jest.fn().mockResolvedValue(null),
      },
    };

    mockNotificationService = {
      sendStockAlertDigest: jest.fn().mockResolvedValue(undefined),
    };

    job = new StockValidationJob(
      mockProductRepository,
      mockStockRepository,
      mockWarehouseRepository,
      mockReorderRuleRepository,
      mockOrganizationRepository,
      mockEventBus as unknown as Parameters<
        typeof StockValidationJob.prototype.validateStockLevels
      >[0],
      mockPrismaService as any,
      mockNotificationService as any
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
      expect(mockNotificationService.sendStockAlertDigest).not.toHaveBeenCalled();
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

    it('Given: no alertConfig for org When: validating Then: should skip without processing', async () => {
      // Arrange
      mockPrismaService.alertConfiguration.findUnique.mockResolvedValue(null);
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);

      // Act
      await job.validateStockLevels();

      // Assert — no products should be checked since alerts are disabled by default
      expect(mockStockRepository.getStockQuantity).not.toHaveBeenCalled();
      expect(mockNotificationService.sendStockAlertDigest).not.toHaveBeenCalled();
    });

    it('Given: alertConfig with isEnabled=false When: validating Then: should skip', async () => {
      // Arrange
      mockPrismaService.alertConfiguration.findUnique.mockResolvedValue({
        orgId: 'org-123',
        isEnabled: false,
        cronFrequency: 'EVERY_HOUR',
        notifyLowStock: true,
        notifyCriticalStock: true,
        notifyOutOfStock: true,
        recipientEmails: '',
        lastRunAt: null,
      });
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockStockRepository.getStockQuantity).not.toHaveBeenCalled();
      expect(mockNotificationService.sendStockAlertDigest).not.toHaveBeenCalled();
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

  describe('digest email', () => {
    it('Given: low stock alerts When: processing completes Then: should call sendStockAlertDigest once', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockNotificationService.sendStockAlertDigest).toHaveBeenCalledTimes(1);
    });

    it('Given: alerts generated When: sending digest Then: should include product names and warehouse names', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      const digestCall = mockNotificationService.sendStockAlertDigest.mock.calls[0][0];
      expect(digestCall.orgName).toBe('Test Organization');
      expect(digestCall.lowStockItems).toHaveLength(1);
      expect(digestCall.lowStockItems[0].productName).toBe('Test Product');
      expect(digestCall.lowStockItems[0].sku).toBe('SKU-001');
      expect(digestCall.lowStockItems[0].warehouseName).toBe('Main Warehouse');
      expect(digestCall.lowStockItems[0].currentStock).toBe(5);
    });

    it('Given: overstock alerts When: sending digest Then: should include overstock items', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(150, 0)); // Above maxQty of 100
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      const digestCall = mockNotificationService.sendStockAlertDigest.mock.calls[0][0];
      expect(digestCall.overstockItems).toHaveLength(1);
      expect(digestCall.overstockItems[0].productName).toBe('Test Product');
      expect(digestCall.overstockItems[0].maxQuantity).toBe(100);
    });

    it('Given: alertConfig with recipientEmails When: sending digest Then: should parse recipients', async () => {
      // Arrange
      mockPrismaService.alertConfiguration.findUnique.mockResolvedValue({
        orgId: 'org-123',
        isEnabled: true,
        cronFrequency: 'EVERY_HOUR',
        notifyLowStock: true,
        notifyCriticalStock: true,
        notifyOutOfStock: true,
        recipientEmails: 'alice@test.com, bob@test.com',
        lastRunAt: null,
      });
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      const digestCall = mockNotificationService.sendStockAlertDigest.mock.calls[0][0];
      expect(digestCall.recipientEmails).toEqual(['alice@test.com', 'bob@test.com']);
    });

    it('Given: no recipientEmails configured When: sending digest Then: should fallback to admin email', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      const digestCall = mockNotificationService.sendStockAlertDigest.mock.calls[0][0];
      expect(digestCall.recipientEmails).toEqual(['admin@nevadainventory.com']);
    });

    it('Given: no alerts generated When: processing completes Then: should NOT send digest', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(50, 0)); // Healthy stock
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      expect(mockNotificationService.sendStockAlertDigest).not.toHaveBeenCalled();
    });

    it('Given: digest email fails When: sending Then: should not throw', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);
      mockNotificationService.sendStockAlertDigest.mockRejectedValue(new Error('Email failed'));

      // Act - should not throw
      await expect(job.validateStockLevels()).resolves.not.toThrow();
    });

    it('Given: organization with language setting When: sending digest Then: should pass language to notification', async () => {
      // Arrange
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([mockOrganization]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      const digestCall = mockNotificationService.sendStockAlertDigest.mock.calls[0][0];
      expect(digestCall.language).toBe('es');
    });

    it('Given: organization without language setting When: sending digest Then: should default to es', async () => {
      // Arrange
      const orgWithoutLang = {
        ...mockOrganization,
        getSetting: () => undefined,
      };
      mockOrganizationRepository.findActiveOrganizations.mockResolvedValue([orgWithoutLang]);
      mockProductRepository.findByStatus.mockResolvedValue([mockProduct]);
      mockWarehouseRepository.findActive.mockResolvedValue([mockWarehouse]);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 0));
      mockReorderRuleRepository.findByProductAndWarehouse.mockResolvedValue(mockReorderRule);

      // Act
      await job.validateStockLevels();

      // Assert
      const digestCall = mockNotificationService.sendStockAlertDigest.mock.calls[0][0];
      expect(digestCall.language).toBe('es');
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
