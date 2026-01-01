import { ConfirmSaleUseCase } from '@application/saleUseCases/confirmSaleUseCase';
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

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

describe('ConfirmSaleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';
  const mockMovementId = 'movement-123';

  let useCase: ConfirmSaleUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockStockRepository: jest.Mocked<IStockRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

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
      findByMovementId: jest.fn(),
    } as jest.Mocked<ISaleRepository>;

    mockMovementRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByWarehouse: jest.fn(),
      findByStatus: jest.fn(),
      findByType: jest.fn(),
      findByDateRange: jest.fn(),
      findByProduct: jest.fn(),
      findDraftMovements: jest.fn(),
      findPostedMovements: jest.fn(),
    } as jest.Mocked<IMovementRepository>;

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

    useCase = new ConfirmSaleUseCase(
      mockSaleRepository,
      mockMovementRepository,
      mockStockRepository,
      mockEventDispatcher
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

      const postedMovement = { ...mockMovement, id: mockMovementId, post: () => mockMovement };
      mockMovementRepository.save.mockResolvedValue(
        postedMovement as unknown as typeof mockMovement
      );

      const confirmedSale = mockSale;
      confirmedSale.confirm = jest.fn();
      mockSaleRepository.save.mockResolvedValue(confirmedSale);

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
