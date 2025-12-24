import { describe, expect, it, jest } from '@jest/globals';
import { Location } from '@warehouse/domain/entities/location.entity';
import { ILocationRepository } from '@warehouse/domain/repositories/locationRepository.interface';
import { WarehouseAssignmentService } from '@warehouse/domain/services/warehouseAssignment.service';
import { LocationCode } from '@warehouse/domain/valueObjects/locationCode.valueObject';

import { LocationFactory } from '../../factories/location.factory';
import { WarehouseFactory } from '../../factories/warehouse.factory';

describe('WarehouseAssignmentService', () => {
  const mockOrgId = 'test-org-id';

  describe('validateWarehouseForLocation', () => {
    it('Given: active warehouse When: validating for location Then: should return valid', () => {
      // Arrange
      const warehouse = WarehouseFactory.create({}, mockOrgId);

      // Act
      const result = WarehouseAssignmentService.validateWarehouseForLocation(warehouse);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: inactive warehouse When: validating for location Then: should return errors', () => {
      // Arrange
      const warehouse = WarehouseFactory.createInactive({}, mockOrgId);

      // Act
      const result = WarehouseAssignmentService.validateWarehouseForLocation(warehouse);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Warehouse must be active');
    });
  });

  describe('validateLocationCodeUniqueness', () => {
    it('Given: unique location code When: validating uniqueness Then: should return true', async () => {
      // Arrange
      const code = LocationCode.create('LOC-001');
      const warehouseId = 'warehouse-123';
      const mockRepository: ILocationRepository = {
        findByCode: jest.fn<() => Promise<Location | null>>().mockResolvedValue(null),
      } as unknown as ILocationRepository;

      // Act
      const result = await WarehouseAssignmentService.validateLocationCodeUniqueness(
        code,
        warehouseId,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRepository.findByCode).toHaveBeenCalledWith('LOC-001', warehouseId, mockOrgId);
    });

    it('Given: existing location code When: validating uniqueness Then: should return false', async () => {
      // Arrange
      const code = LocationCode.create('LOC-001');
      const warehouseId = 'warehouse-123';
      const existingLocation = LocationFactory.create({ code }, mockOrgId);
      const mockRepository: ILocationRepository = {
        findByCode: jest.fn<() => Promise<Location | null>>().mockResolvedValue(existingLocation),
      } as unknown as ILocationRepository;

      // Act
      const result = await WarehouseAssignmentService.validateLocationCodeUniqueness(
        code,
        warehouseId,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('validateLocationAssignment', () => {
    it('Given: valid location assignment data When: validating assignment Then: should return valid', () => {
      // Arrange
      const data = {
        code: 'LOC-001',
        warehouseId: 'warehouse-123',
        isDefault: false,
      };

      // Act
      const result = WarehouseAssignmentService.validateLocationAssignment(data);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: invalid location code When: validating assignment Then: should return errors', () => {
      // Arrange
      const data = {
        code: 'L', // Too short
        warehouseId: 'warehouse-123',
        isDefault: false,
      };

      // Act
      const result = WarehouseAssignmentService.validateLocationAssignment(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid location code');
    });

    it('Given: empty warehouse ID When: validating assignment Then: should return errors', () => {
      // Arrange
      const data = {
        code: 'LOC-001',
        warehouseId: '',
        isDefault: false,
      };

      // Act
      const result = WarehouseAssignmentService.validateLocationAssignment(data);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Warehouse ID is required');
    });
  });

  describe('validateDefaultLocationUniqueness', () => {
    it('Given: no default location When: validating default uniqueness Then: should return valid', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const mockRepository: ILocationRepository = {
        findDefaultLocation: jest.fn<() => Promise<Location | null>>().mockResolvedValue(null),
      } as unknown as ILocationRepository;

      // Act
      const result = await WarehouseAssignmentService.validateDefaultLocationUniqueness(
        warehouseId,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockRepository.findDefaultLocation).toHaveBeenCalledWith(warehouseId, mockOrgId);
    });

    it('Given: existing default location When: validating default uniqueness Then: should return errors', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const defaultLocation = LocationFactory.createDefault(warehouseId, {}, mockOrgId);
      const mockRepository: ILocationRepository = {
        findDefaultLocation: jest
          .fn<() => Promise<Location | null>>()
          .mockResolvedValue(defaultLocation),
      } as unknown as ILocationRepository;

      // Act
      const result = await WarehouseAssignmentService.validateDefaultLocationUniqueness(
        warehouseId,
        mockOrgId,
        mockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('A default location already exists');
    });

    it('Given: existing default location with excludeLocationId When: validating default uniqueness Then: should return valid', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const defaultLocation = LocationFactory.createDefault(warehouseId, {}, mockOrgId);
      const mockRepository: ILocationRepository = {
        findDefaultLocation: jest
          .fn<() => Promise<Location | null>>()
          .mockResolvedValue(defaultLocation),
      } as unknown as ILocationRepository;

      // Act
      const result = await WarehouseAssignmentService.validateDefaultLocationUniqueness(
        warehouseId,
        mockOrgId,
        mockRepository,
        defaultLocation.id
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('canSetAsDefault', () => {
    it('Given: active location with no default When: checking if can set as default Then: should return valid', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const location = LocationFactory.create({ warehouseId }, mockOrgId);
      const mockRepository: ILocationRepository = {
        findDefaultLocation: jest.fn<() => Promise<Location | null>>().mockResolvedValue(null),
      } as unknown as ILocationRepository;

      // Act
      const result = await WarehouseAssignmentService.canSetAsDefault(location, mockRepository);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: inactive location When: checking if can set as default Then: should return errors', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const location = LocationFactory.createInactive(warehouseId, {}, mockOrgId);
      const mockRepository: ILocationRepository = {
        findDefaultLocation: jest.fn<() => Promise<Location | null>>().mockResolvedValue(null),
      } as unknown as ILocationRepository;

      // Act
      const result = await WarehouseAssignmentService.canSetAsDefault(location, mockRepository);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Location must be active');
    });

    it('Given: active location with existing default When: checking if can set as default Then: should return errors', async () => {
      // Arrange
      const warehouseId = 'warehouse-123';
      const location = LocationFactory.create({ warehouseId }, mockOrgId);
      const existingDefault = LocationFactory.createDefault(warehouseId, {}, mockOrgId);
      const mockRepository: ILocationRepository = {
        findDefaultLocation: jest
          .fn<() => Promise<Location | null>>()
          .mockResolvedValue(existingDefault),
      } as unknown as ILocationRepository;

      // Act
      const result = await WarehouseAssignmentService.canSetAsDefault(location, mockRepository);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Another default location already exists');
    });
  });
});
