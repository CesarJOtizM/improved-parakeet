import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleValidationService } from '@sale/domain/services/saleValidation.service';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('SaleValidationService', () => {
  const mockOrgId = 'org-123';
  const mockWarehouseId = 'warehouse-123';

  describe('validateSaleCanBeConfirmed', () => {
    it('Given: a DRAFT sale with lines When: validating confirmation Then: should return valid result', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-001'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'sale-123',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-123',
              locationId: 'location-123',
              quantity: Quantity.create(5, 2),
              salePrice: SalePrice.create(100, 'USD'),
            },
            'line-123',
            mockOrgId
          ),
        ]
      );

      // Act
      const result = SaleValidationService.validateSaleCanBeConfirmed(sale);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: a CONFIRMED sale When: validating confirmation Then: should return invalid result', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-002'),
          status: SaleStatus.create('CONFIRMED'),
          warehouseId: mockWarehouseId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'sale-456',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-456',
              locationId: 'location-456',
              quantity: Quantity.create(2, 2),
              salePrice: SalePrice.create(50, 'USD'),
            },
            'line-456',
            mockOrgId
          ),
        ]
      );

      // Act
      const result = SaleValidationService.validateSaleCanBeConfirmed(sale);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Sale cannot be confirmed. Only DRAFT sales can be confirmed.'
      );
    });

    it('Given: a DRAFT sale without lines When: validating confirmation Then: should return invalid result', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-003'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'sale-789',
        mockOrgId,
        []
      );

      // Act
      const result = SaleValidationService.validateSaleCanBeConfirmed(sale);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sale must have at least one line before confirming');
    });

    it('Given: a CANCELLED sale When: validating confirmation Then: should return invalid result', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-004'),
          status: SaleStatus.create('CANCELLED'),
          warehouseId: mockWarehouseId,
          cancelledAt: new Date(),
          createdBy: 'user-123',
        },
        'sale-cancelled',
        mockOrgId
      );

      // Act
      const result = SaleValidationService.validateSaleCanBeConfirmed(sale);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Sale cannot be confirmed. Only DRAFT sales can be confirmed.'
      );
    });
  });

  describe('validateSaleCanBeCancelled', () => {
    it('Given: a DRAFT sale When: validating cancellation Then: should return valid result', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-010'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'sale-101',
        mockOrgId
      );

      // Act
      const result = SaleValidationService.validateSaleCanBeCancelled(sale);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: a CONFIRMED sale When: validating cancellation Then: should return valid result', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-011'),
          status: SaleStatus.create('CONFIRMED'),
          warehouseId: mockWarehouseId,
          confirmedAt: new Date(),
          createdBy: 'user-123',
        },
        'sale-102',
        mockOrgId
      );

      // Act
      const result = SaleValidationService.validateSaleCanBeCancelled(sale);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('Given: a CANCELLED sale When: validating cancellation Then: should return invalid result', () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-012'),
          status: SaleStatus.create('CANCELLED'),
          warehouseId: mockWarehouseId,
          cancelledAt: new Date(),
          createdBy: 'user-123',
        },
        'sale-103',
        mockOrgId
      );

      // Act
      const result = SaleValidationService.validateSaleCanBeCancelled(sale);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Sale is already cancelled');
    });
  });

  describe('validateStockAvailability', () => {
    let mockStockRepository: jest.Mocked<IStockRepository>;

    beforeEach(() => {
      mockStockRepository = {
        getStockQuantity: jest.fn(),
        getStock: jest.fn(),
        updateStock: jest.fn(),
        createStock: jest.fn(),
        findStockByProduct: jest.fn(),
        findStockByWarehouse: jest.fn(),
        getStockHistory: jest.fn(),
      } as unknown as jest.Mocked<IStockRepository>;
    });

    it('Given: a sale with sufficient stock When: validating stock availability Then: should return valid result', async () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-020'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'sale-stock-1',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-stock-1',
              locationId: 'location-stock-1',
              quantity: Quantity.create(5, 2),
              salePrice: SalePrice.create(100, 'USD'),
            },
            'line-stock-1',
            mockOrgId
          ),
        ]
      );

      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));

      // Act
      const result = await SaleValidationService.validateStockAvailability(
        sale,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(mockStockRepository.getStockQuantity).toHaveBeenCalledWith(
        'product-stock-1',
        mockWarehouseId,
        mockOrgId,
        'location-stock-1'
      );
    });

    it('Given: a sale with insufficient stock When: validating stock availability Then: should return invalid result', async () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-021'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'sale-stock-2',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-stock-2',
              locationId: 'location-stock-2',
              quantity: Quantity.create(15, 2),
              salePrice: SalePrice.create(100, 'USD'),
            },
            'line-stock-2',
            mockOrgId
          ),
        ]
      );

      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(5, 2));

      // Act
      const result = await SaleValidationService.validateStockAvailability(
        sale,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Insufficient stock for product product-stock-2');
      expect(result.errors[0]).toContain('Available: 5');
      expect(result.errors[0]).toContain('Requested: 15');
    });

    it('Given: a sale with stock repository error When: validating stock availability Then: should return error message', async () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-022'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'sale-stock-3',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-stock-3',
              locationId: 'location-stock-3',
              quantity: Quantity.create(5, 2),
              salePrice: SalePrice.create(100, 'USD'),
            },
            'line-stock-3',
            mockOrgId
          ),
        ]
      );

      mockStockRepository.getStockQuantity.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act
      const result = await SaleValidationService.validateStockAvailability(
        sale,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Error checking stock for product product-stock-3');
      expect(result.errors[0]).toContain('Database connection failed');
    });

    it('Given: a sale with multiple lines and mixed stock availability When: validating stock availability Then: should return all errors', async () => {
      // Arrange
      const sale = Sale.reconstitute(
        {
          saleNumber: SaleNumber.fromString('SALE-2024-023'),
          status: SaleStatus.create('DRAFT'),
          warehouseId: mockWarehouseId,
          createdBy: 'user-123',
        },
        'sale-stock-4',
        mockOrgId,
        [
          SaleLine.reconstitute(
            {
              productId: 'product-a',
              locationId: 'location-a',
              quantity: Quantity.create(5, 2),
              salePrice: SalePrice.create(100, 'USD'),
            },
            'line-a',
            mockOrgId
          ),
          SaleLine.reconstitute(
            {
              productId: 'product-b',
              locationId: 'location-b',
              quantity: Quantity.create(20, 2),
              salePrice: SalePrice.create(50, 'USD'),
            },
            'line-b',
            mockOrgId
          ),
        ]
      );

      mockStockRepository.getStockQuantity
        .mockResolvedValueOnce(Quantity.create(10, 2)) // Sufficient for product-a
        .mockResolvedValueOnce(Quantity.create(5, 2)); // Insufficient for product-b

      // Act
      const result = await SaleValidationService.validateStockAvailability(
        sale,
        mockStockRepository
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('product-b');
    });
  });
});
