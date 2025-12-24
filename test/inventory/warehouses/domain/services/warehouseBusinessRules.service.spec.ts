import { describe, expect, it, jest } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';
import {
  WarehouseBusinessRulesService,
  type IWarehouseStockRepository,
  type IWarehouseLocationRepository,
} from '@warehouse/domain/services/warehouseBusinessRules.service';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import { WarehouseFactory } from '../../factories/warehouse.factory';

describe('WarehouseBusinessRulesService', () => {
  const mockOrgId = 'test-org-id';

  describe('validateWarehouseCreationRules', () => {
    it('Given: unique warehouse code When: validating creation rules Then: should return valid', async () => {
      // Arrange
      const code = WarehouseCode.create('WH-001');
      const mockRepository: IWarehouseRepository = {
        findByCode: jest.fn<() => Promise<Warehouse | null>>().mockResolvedValue(null),
      } as unknown as IWarehouseRepository;

      // Act
      const result = await WarehouseBusinessRulesService.validateWarehouseCreationRules(
        code,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockRepository.findByCode).toHaveBeenCalledWith('WH-001', mockOrgId);
    });

    it('Given: existing warehouse code When: validating creation rules Then: should return errors', async () => {
      // Arrange
      const code = WarehouseCode.create('WH-001');
      const existingWarehouse = WarehouseFactory.create({ code }, mockOrgId);
      const mockRepository: IWarehouseRepository = {
        findByCode: jest.fn<() => Promise<Warehouse | null>>().mockResolvedValue(existingWarehouse),
      } as unknown as IWarehouseRepository;

      // Act
      const result = await WarehouseBusinessRulesService.validateWarehouseCreationRules(
        code,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("Warehouse code 'WH-001' already exists");
    });
  });

  describe('validateWarehouseUpdateRules', () => {
    it('Given: unique warehouse code When: validating update rules Then: should return valid', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const code = WarehouseCode.create('WH-002');
      const mockRepository: IWarehouseRepository = {
        findByCode: jest.fn<() => Promise<Warehouse | null>>().mockResolvedValue(null),
      } as unknown as IWarehouseRepository;

      // Act
      const result = await WarehouseBusinessRulesService.validateWarehouseUpdateRules(
        warehouseId,
        code,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: existing warehouse code for different warehouse When: validating update rules Then: should return errors', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const code = WarehouseCode.create('WH-001');
      const existingWarehouse = WarehouseFactory.create({ code }, mockOrgId);
      const mockRepository: IWarehouseRepository = {
        findByCode: jest.fn<() => Promise<Warehouse | null>>().mockResolvedValue(existingWarehouse),
      } as unknown as IWarehouseRepository;

      // Act
      const result = await WarehouseBusinessRulesService.validateWarehouseUpdateRules(
        warehouseId,
        code,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('Given: existing warehouse code for same warehouse When: validating update rules Then: should return valid', async () => {
      // Arrange
      const existingWarehouse = WarehouseFactory.create({}, mockOrgId);
      const code = existingWarehouse.code;
      const mockRepository: IWarehouseRepository = {
        findByCode: jest.fn<() => Promise<Warehouse | null>>().mockResolvedValue(existingWarehouse),
      } as unknown as IWarehouseRepository;

      // Act
      const result = await WarehouseBusinessRulesService.validateWarehouseUpdateRules(
        existingWarehouse.id,
        code,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateCodeUniquenessOrThrow', () => {
    it('Given: unique warehouse code When: validating uniqueness Then: should not throw', async () => {
      // Arrange
      const code = WarehouseCode.create('WH-001');
      const mockRepository: IWarehouseRepository = {
        findByCode: jest.fn<() => Promise<Warehouse | null>>().mockResolvedValue(null),
      } as unknown as IWarehouseRepository;

      // Act & Assert
      await expect(
        WarehouseBusinessRulesService.validateCodeUniquenessOrThrow(code, mockOrgId, mockRepository)
      ).resolves.not.toThrow();
    });

    it('Given: existing warehouse code When: validating uniqueness Then: should throw ConflictException', async () => {
      // Arrange
      const code = WarehouseCode.create('WH-001');
      const existingWarehouse = WarehouseFactory.create({ code }, mockOrgId);
      const mockRepository: IWarehouseRepository = {
        findByCode: jest.fn<() => Promise<Warehouse | null>>().mockResolvedValue(existingWarehouse),
      } as unknown as IWarehouseRepository;

      // Act & Assert
      await expect(
        WarehouseBusinessRulesService.validateCodeUniquenessOrThrow(code, mockOrgId, mockRepository)
      ).rejects.toThrow(ConflictException);
      await expect(
        WarehouseBusinessRulesService.validateCodeUniquenessOrThrow(code, mockOrgId, mockRepository)
      ).rejects.toThrow("Warehouse code 'WH-001' already exists in this organization");
    });

    it('Given: existing warehouse code with excludeWarehouseId matching When: validating uniqueness Then: should not throw', async () => {
      // Arrange
      const existingWarehouse = WarehouseFactory.create({}, mockOrgId);
      const code = existingWarehouse.code;
      const mockRepository: IWarehouseRepository = {
        findByCode: jest.fn<() => Promise<Warehouse | null>>().mockResolvedValue(existingWarehouse),
      } as unknown as IWarehouseRepository;

      // Act & Assert
      await expect(
        WarehouseBusinessRulesService.validateCodeUniquenessOrThrow(
          code,
          mockOrgId,
          mockRepository,
          existingWarehouse.id
        )
      ).resolves.not.toThrow();
    });
  });

  describe('validateWarehouseDeletion', () => {
    it('Given: warehouse without stock When: validating deletion Then: should return valid', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const mockStockRepository: IWarehouseStockRepository = {
        hasStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
        getTotalStock: jest.fn<() => Promise<number>>().mockResolvedValue(0),
        hasActiveStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      };

      // Act
      const result = await WarehouseBusinessRulesService.validateWarehouseDeletion(
        warehouseId,
        mockOrgId,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockStockRepository.hasStock).toHaveBeenCalledWith(warehouseId, mockOrgId);
    });

    it('Given: warehouse with stock When: validating deletion Then: should return errors', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const mockStockRepository: IWarehouseStockRepository = {
        hasStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        getTotalStock: jest.fn<() => Promise<number>>().mockResolvedValue(10),
        hasActiveStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      };

      // Act
      const result = await WarehouseBusinessRulesService.validateWarehouseDeletion(
        warehouseId,
        mockOrgId,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('cannot be deleted because it has stock');
    });
  });

  describe('validateWarehouseDeactivation', () => {
    it('Given: warehouse without active stock When: validating deactivation Then: should return valid', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const mockStockRepository: IWarehouseStockRepository = {
        hasStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
        getTotalStock: jest.fn<() => Promise<number>>().mockResolvedValue(0),
        hasActiveStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(false),
      };

      // Act
      const result = await WarehouseBusinessRulesService.validateWarehouseDeactivation(
        warehouseId,
        mockOrgId,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockStockRepository.hasActiveStock).toHaveBeenCalledWith(warehouseId, mockOrgId);
    });

    it('Given: warehouse with active stock When: validating deactivation Then: should return errors', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const mockStockRepository: IWarehouseStockRepository = {
        hasStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
        getTotalStock: jest.fn<() => Promise<number>>().mockResolvedValue(10),
        hasActiveStock: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
      };

      // Act
      const result = await WarehouseBusinessRulesService.validateWarehouseDeactivation(
        warehouseId,
        mockOrgId,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('cannot be deactivated because it has active stock');
    });
  });

  describe('validateWarehouseForLocation', () => {
    it('Given: active warehouse When: validating for location Then: should return valid', () => {
      // Arrange
      const warehouse = WarehouseFactory.create({}, mockOrgId);

      // Act
      const result = WarehouseBusinessRulesService.validateWarehouseForLocation(warehouse);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: inactive warehouse When: validating for location Then: should return errors', () => {
      // Arrange
      const warehouse = WarehouseFactory.createInactive({}, mockOrgId);

      // Act
      const result = WarehouseBusinessRulesService.validateWarehouseForLocation(warehouse);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Warehouse must be active');
    });
  });

  describe('validateDefaultLocationUniqueness', () => {
    it('Given: no default location When: validating default uniqueness Then: should return valid', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const mockLocationRepository: IWarehouseLocationRepository = {
        findDefaultLocation: jest
          .fn<() => Promise<{ id: string } | null>>()
          .mockResolvedValue(null),
      } as unknown as IWarehouseLocationRepository;

      // Act
      const result = await WarehouseBusinessRulesService.validateDefaultLocationUniqueness(
        warehouseId,
        mockOrgId,
        mockLocationRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockLocationRepository.findDefaultLocation).toHaveBeenCalledWith(
        warehouseId,
        mockOrgId
      );
    });

    it('Given: existing default location When: validating default uniqueness Then: should return errors', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const defaultLocation = { id: 'location-123' };
      const mockLocationRepository: IWarehouseLocationRepository = {
        findDefaultLocation: jest
          .fn<() => Promise<{ id: string } | null>>()
          .mockResolvedValue(defaultLocation),
      } as unknown as IWarehouseLocationRepository;

      // Act
      const result = await WarehouseBusinessRulesService.validateDefaultLocationUniqueness(
        warehouseId,
        mockOrgId,
        mockLocationRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('A default location already exists');
    });

    it('Given: existing default location with excludeLocationId When: validating default uniqueness Then: should return valid', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const defaultLocation = { id: 'location-123' };
      const mockLocationRepository: IWarehouseLocationRepository = {
        findDefaultLocation: jest
          .fn<() => Promise<{ id: string } | null>>()
          .mockResolvedValue(defaultLocation),
      } as unknown as IWarehouseLocationRepository;

      // Act
      const result = await WarehouseBusinessRulesService.validateDefaultLocationUniqueness(
        warehouseId,
        mockOrgId,
        mockLocationRepository,
        defaultLocation.id
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
