import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Sale } from '@sale/domain/entities/sale.entity';
import { InventoryIntegrationService } from '@sale/domain/services/inventoryIntegration.service';
import { SaleValidationService } from '@sale/domain/services/saleValidation.service';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

describe('ConfirmSaleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';
  const mockMovementId = 'movement-123';

  let useCase: ConfirmSaleUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockStockRepository: jest.Mocked<IStockRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSaleRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySaleNumber: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findByDateRange: jest.fn(),
      getLastSaleNumberForYear: jest.fn(),
      getNextSaleNumber: jest.fn(),
      findByMovementId: jest.fn(),
      addLine: jest.fn(),
    } as jest.Mocked<ISaleRepository>;

    mockStockRepository = {
      getStockQuantity: jest.fn(),
      getStockWithCost: jest.fn(),
      updateStock: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
    } as jest.Mocked<IStockRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    mockUnitOfWork = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWork>;

    useCase = new ConfirmSaleUseCase(
      mockSaleRepository,
      mockStockRepository,
      mockEventDispatcher,
      mockUnitOfWork
    );
  });

  describe('execute', () => {
    const createMockSale = () => {
      const saleNumber = SaleNumber.create(2025, 1);
      const props = SaleMapper.toDomainProps(
        {
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        saleNumber
      );
      return Sale.reconstitute(props, mockSaleId, mockOrgId);
    };

    it('Given: draft sale with valid stock When: confirming sale Then: should return success result', async () => {
      // Arrange
      const mockSale = createMockSale();
      // Add a mock line to the sale so it can be confirmed
      const mockSaleLine = {
        id: 'line-123',
        productId: 'product-123',
        locationId: 'location-123',
        quantity: { isPositive: () => true, getNumericValue: () => 5 },
        getTotalPrice: () => ({ getAmount: () => 100, getCurrency: () => 'COP' }),
        unitPrice: { getAmount: () => 20 },
        unitCost: { getAmount: () => 15 },
        currency: 'COP',
      };
      (
        mockSale as unknown as {
          lines: unknown[];
          getLines: () => unknown[];
          getTotalAmount: () => unknown;
        }
      ).lines = [mockSaleLine];
      (
        mockSale as unknown as {
          lines: unknown[];
          getLines: () => unknown[];
          getTotalAmount: () => unknown;
        }
      ).getLines = jest.fn<() => unknown[]>().mockReturnValue([mockSaleLine]);
      (
        mockSale as unknown as {
          lines: unknown[];
          getLines: () => unknown[];
          getTotalAmount: () => unknown;
        }
      ).getTotalAmount = jest
        .fn()
        .mockReturnValue({ getAmount: () => 100, getCurrency: () => 'COP' });

      mockSaleRepository.findById.mockResolvedValue(mockSale);

      jest.spyOn(SaleValidationService, 'validateSaleCanBeConfirmed').mockReturnValue({
        isValid: true,
        errors: [],
      });

      jest.spyOn(SaleValidationService, 'validateStockAvailability').mockResolvedValue({
        isValid: true,
        errors: [],
      });

      const mockMovement = Movement.create(
        {
          type: MovementType.create('OUT'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        mockOrgId
      );

      jest
        .spyOn(InventoryIntegrationService, 'generateMovementFromSale')
        .mockReturnValue(mockMovement);

      // Mock unitOfWork.execute to return the confirmed sale and posted movement
      mockUnitOfWork.execute.mockImplementation(async _callback => {
        // Return mock data that simulates the transaction result
        return {
          confirmedSale: {
            id: mockSaleId,
            saleNumber: 'SALE-2025-001',
            status: 'CONFIRMED',
            warehouseId: 'warehouse-123',
            customerReference: null,
            externalReference: null,
            note: null,
            confirmedAt: new Date(),
            cancelledAt: null,
            movementId: mockMovementId,
            createdBy: 'user-123',
            orgId: mockOrgId,
            createdAt: new Date(),
            updatedAt: new Date(),
            lines: [],
          },
          postedMovement: {
            id: mockMovementId,
            type: 'OUT',
            status: 'POSTED',
            warehouseId: 'warehouse-123',
            orgId: mockOrgId,
          },
        };
      });

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Sale confirmed successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent sale When: confirming sale Then: should return NotFoundError', async () => {
      // Arrange
      mockSaleRepository.findById.mockResolvedValue(null);

      const request = {
        id: 'non-existent-id',
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
        }
      );
    });

    it('Given: sale that cannot be confirmed When: confirming sale Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      jest.spyOn(SaleValidationService, 'validateSaleCanBeConfirmed').mockReturnValue({
        isValid: false,
        errors: ['Sale is already confirmed'],
      });

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
        }
      );
    });
  });
});
