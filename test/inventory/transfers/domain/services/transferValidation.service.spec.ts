import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { describe, expect, it, jest } from '@jest/globals';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { TransferValidationService } from '@transfer/domain/services/transferValidation.service';

import type { IProductRepository } from '@product/domain/repositories/productRepository.interface';
import type { ILocationRepository } from '@warehouse/domain/repositories/locationRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

describe('TransferValidationService', () => {
  const orgId = 'org-123';

  const createTransferLine = () =>
    TransferLine.create(
      {
        productId: 'product-1',
        quantity: Quantity.create(5),
        fromLocationId: 'loc-1',
        toLocationId: 'loc-2',
      },
      orgId
    );

  describe('validateTransferCreation', () => {
    it('Given: same warehouses When: validating Then: should return error', async () => {
      const warehouseRepository = {
        findById: jest.fn<any>().mockResolvedValue({ isActive: true }),
      } as unknown as IWarehouseRepository;

      const result = await TransferValidationService.validateTransferCreation(
        {
          fromWarehouseId: 'wh-1',
          toWarehouseId: 'wh-1',
          orgId,
        },
        warehouseRepository
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('From warehouse and to warehouse must be different');
    });

    it('Given: missing and inactive warehouses When: validating Then: should return errors', async () => {
      const warehouseRepository = {
        findById: jest.fn<any>().mockResolvedValueOnce(null).mockResolvedValueOnce({ isActive: false }),
      } as unknown as IWarehouseRepository;

      const result = await TransferValidationService.validateTransferCreation(
        {
          fromWarehouseId: 'wh-1',
          toWarehouseId: 'wh-2',
          orgId,
        },
        warehouseRepository
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('From warehouse with id wh-1 not found');
      expect(result.errors).toContain('To warehouse is not active');
    });
  });

  describe('validateTransferLines', () => {
    it('Given: empty lines When: validating Then: should return error', async () => {
      const productRepository = {
        findById: jest.fn<any>(),
      } as unknown as IProductRepository;

      const result = await TransferValidationService.validateTransferLines(
        [],
        orgId,
        productRepository
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Transfer must have at least one line');
    });

    it('Given: invalid quantity or missing product When: validating Then: should return errors', async () => {
      const productRepository = {
        findById: jest.fn<any>().mockResolvedValue(null),
      } as unknown as IProductRepository;

      const invalidLine = {
        productId: 'product-1',
        quantity: Quantity.create(0),
      } as unknown as TransferLine;

      const result = await TransferValidationService.validateTransferLines(
        [invalidLine],
        orgId,
        productRepository
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Line for product product-1 has invalid quantity');
      expect(result.errors).toContain('Product with id product-1 not found');
    });

    it('Given: inactive product When: validating Then: should return error', async () => {
      const productRepository = {
        findById: jest.fn<any>().mockResolvedValue({ isActive: false }),
      } as unknown as IProductRepository;

      const line = createTransferLine();
      const result = await TransferValidationService.validateTransferLines(
        [line],
        orgId,
        productRepository
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product product-1 is not active');
    });
  });

  describe('validateStockAvailability', () => {
    it('Given: insufficient stock When: validating Then: should return error', async () => {
      const stockRepository = {
        getStockQuantity: jest.fn<any>().mockResolvedValue(Quantity.create(2)),
      } as any;
      const line = createTransferLine();

      const result = await TransferValidationService.validateStockAvailability(
        [line],
        'wh-1',
        orgId,
        stockRepository
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Insufficient stock for product');
    });

    it('Given: enough stock When: validating Then: should return valid result', async () => {
      const stockRepository = {
        getStockQuantity: jest.fn<any>().mockResolvedValue(Quantity.create(10)),
      } as any;
      const line = createTransferLine();

      const result = await TransferValidationService.validateStockAvailability(
        [line],
        'wh-1',
        orgId,
        stockRepository
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateLocations', () => {
    it('Given: invalid locations When: validating Then: should return errors', async () => {
      const locationRepository = {
        findById: jest
          .fn<any>()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ warehouseId: 'wrong-warehouse', isActive: true }),
      } as unknown as ILocationRepository;

      const line = createTransferLine();
      const result = await TransferValidationService.validateLocations(
        [line],
        'wh-1',
        'wh-2',
        orgId,
        locationRepository
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('From location with id loc-1 not found');
      expect(result.errors[1]).toContain('To location loc-2 does not belong to to warehouse wh-2');
    });

    it('Given: inactive locations When: validating Then: should return errors', async () => {
      const locationRepository = {
        findById: jest
          .fn<any>()
          .mockResolvedValueOnce({ warehouseId: 'wh-1', isActive: false })
          .mockResolvedValueOnce({ warehouseId: 'wh-2', isActive: false }),
      } as unknown as ILocationRepository;

      const line = createTransferLine();
      const result = await TransferValidationService.validateLocations(
        [line],
        'wh-1',
        'wh-2',
        orgId,
        locationRepository
      );

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('From location loc-1 is not active');
      expect(result.errors[1]).toContain('To location loc-2 is not active');
    });

    it('Given: valid locations When: validating Then: should return valid result', async () => {
      const locationRepository = {
        findById: jest
          .fn<any>()
          .mockResolvedValueOnce({ warehouseId: 'wh-1', isActive: true })
          .mockResolvedValueOnce({ warehouseId: 'wh-2', isActive: true }),
      } as unknown as ILocationRepository;

      const line = createTransferLine();
      const result = await TransferValidationService.validateLocations(
        [line],
        'wh-1',
        'wh-2',
        orgId,
        locationRepository
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
