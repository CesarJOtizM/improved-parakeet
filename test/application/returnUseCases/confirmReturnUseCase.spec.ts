import { ConfirmReturnUseCase } from '@application/returnUseCases/confirmReturnUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { Return } from '@returns/domain/entities/return.entity';
import { InventoryIntegrationService } from '@returns/domain/services/inventoryIntegration.service';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnMapper } from '@returns/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('ConfirmReturnUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockReturnId = 'return-123';

  let useCase: ConfirmReturnUseCase;
  let mockReturnRepository: jest.Mocked<IReturnRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReturnRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByReturnNumber: jest.fn(),
      findByStatus: jest.fn(),
      findByType: jest.fn(),
      findBySaleId: jest.fn(),
      findBySourceMovementId: jest.fn(),
      findByDateRange: jest.fn(),
      getLastReturnNumberForYear: jest.fn(),
      findByReturnMovementId: jest.fn(),
    } as jest.Mocked<IReturnRepository>;

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

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new ConfirmReturnUseCase(
      mockReturnRepository,
      mockMovementRepository,
      mockSaleRepository,
      mockEventDispatcher
    );
  });

  describe('execute', () => {
    const createMockReturn = () => {
      const props = ReturnMapper.toDomainProps(
        {
          type: 'RETURN_CUSTOMER',
          warehouseId: 'warehouse-123',
          saleId: 'sale-123',
          createdBy: 'user-123',
        },
        ReturnNumber.create(2025, 1)
      );
      return Return.reconstitute(props, mockReturnId, mockOrgId);
    };

    it('Given: draft return When: confirming return Then: should return success result', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      // Add a line to the return so it can be confirmed
      const mockReturnLine = {
        id: 'line-123',
        productId: 'product-123',
        locationId: 'location-123',
        quantity: { isPositive: () => true, getNumericValue: () => 5 },
        getTotalPrice: () => ({ getAmount: () => 100, getCurrency: () => 'COP' }),
        originalSalePrice: { getAmount: () => 100 },
        originalUnitCost: undefined,
        currency: 'COP',
      } as unknown as {
        productId: string;
        locationId: string;
        quantity: number;
        originalSalePrice: number;
        originalUnitCost: undefined;
        currency: string;
      };
      (
        mockReturn as unknown as {
          lines: unknown[];
          getLines: () => unknown[];
          getTotalAmount: () => unknown;
        }
      ).lines = [mockReturnLine];
      (
        mockReturn as unknown as {
          lines: unknown[];
          getLines: () => unknown[];
          getTotalAmount: () => unknown;
        }
      ).getLines = jest.fn<() => unknown[]>().mockReturnValue([mockReturnLine]);
      (
        mockReturn as unknown as {
          lines: unknown[];
          getLines: () => unknown[];
          getTotalAmount: () => unknown;
        }
      ).getTotalAmount = jest
        .fn()
        .mockReturnValue({ getAmount: () => 100, getCurrency: () => 'COP' });

      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
        isValid: true,
        errors: [],
      });

      jest.spyOn(ReturnValidationService, 'validateCustomerReturnQuantity').mockResolvedValue({
        isValid: true,
        errors: [],
      });

      // Mock generateMovementFromCustomerReturn to bypass status validation
      const mockMovement: Movement = {
        id: 'movement-123',
        post: jest.fn().mockReturnValue({
          id: 'movement-123',
          getLines: () => [],
        }),
      } as unknown as typeof mockMovement & { post: () => unknown };
      jest
        .spyOn(InventoryIntegrationService, 'generateMovementFromCustomerReturn')
        .mockReturnValue(mockMovement);

      mockMovementRepository.save.mockResolvedValue(mockMovement);

      // Mock the repository to return the modified return
      mockReturnRepository.save.mockImplementation(async returnEntity => returnEntity);

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Return confirmed successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent return When: confirming return Then: should return NotFoundError', async () => {
      // Arrange
      mockReturnRepository.findById.mockResolvedValue(null);

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

    it('Given: return that cannot be confirmed When: confirming return Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
        isValid: false,
        errors: ['Return is already confirmed'],
      });

      const request = {
        id: mockReturnId,
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
