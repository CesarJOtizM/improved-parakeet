/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConfirmReturnUseCase } from '@application/returnUseCases/confirmReturnUseCase';
import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { InventoryIntegrationService } from '@returns/domain/services/inventoryIntegration.service';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnMapper } from '@returns/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import {
  BusinessRuleError,
  InsufficientStockError,
  NotFoundError,
} from '@shared/domain/result/domainError';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

describe('ConfirmReturnUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockReturnId = 'return-123';
  const mockMovementId = 'movement-123';

  let useCase: ConfirmReturnUseCase;
  let mockReturnRepository: jest.Mocked<IReturnRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;
  let mockUnitOfWork: jest.Mocked<UnitOfWork>;

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
      getNextReturnNumber: jest.fn(),
      findByReturnMovementId: jest.fn(),
      addLine: jest.fn(),
    } as jest.Mocked<IReturnRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    mockUnitOfWork = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWork>;

    useCase = new ConfirmReturnUseCase(mockReturnRepository, mockEventDispatcher, mockUnitOfWork);
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
        id: mockMovementId,
        post: jest.fn().mockReturnValue({
          id: mockMovementId,
          getLines: () => [],
        }),
      } as unknown as typeof mockMovement & { post: () => unknown };
      jest
        .spyOn(InventoryIntegrationService, 'generateMovementFromCustomerReturn')
        .mockReturnValue(mockMovement);

      // Mock unitOfWork.execute to return the confirmed return and posted movement
      mockUnitOfWork.execute.mockImplementation(async _callback => {
        return {
          confirmedReturn: {
            id: mockReturnId,
            returnNumber: 'RETURN-2025-001',
            status: 'CONFIRMED',
            type: 'RETURN_CUSTOMER',
            reason: null,
            warehouseId: 'warehouse-123',
            saleId: 'sale-123',
            sourceMovementId: null,
            returnMovementId: mockMovementId,
            note: null,
            confirmedAt: new Date(),
            cancelledAt: null,
            createdBy: 'user-123',
            orgId: mockOrgId,
            createdAt: new Date(),
            updatedAt: new Date(),
            lines: [],
          },
          postedMovement: {
            id: mockMovementId,
            type: 'IN',
            status: 'POSTED',
            warehouseId: 'warehouse-123',
            orgId: mockOrgId,
          },
        };
      });

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

    it('Given: supplier return When: confirming Then: should use generateMovementFromSupplierReturn', async () => {
      // Arrange
      const supplierProps = ReturnMapper.toDomainProps(
        {
          type: 'RETURN_SUPPLIER',
          warehouseId: 'warehouse-123',
          sourceMovementId: 'source-movement-123',
          createdBy: 'user-123',
        },
        ReturnNumber.create(2025, 2)
      );
      const mockReturnLine = {
        id: 'line-123',
        productId: 'product-123',
        locationId: 'location-123',
        quantity: { isPositive: () => true, getNumericValue: () => 3 },
        getTotalPrice: () => ({ getAmount: () => 50, getCurrency: () => 'COP' }),
        originalSalePrice: undefined,
        originalUnitCost: { getAmount: () => 50 },
        currency: 'COP',
      };
      const mockReturn = Return.reconstitute(supplierProps, mockReturnId, mockOrgId);
      // Inject lines so confirm() doesn't throw "must have at least one line"
      (mockReturn as any).lines = [mockReturnLine];
      (mockReturn as any).getLines = jest.fn().mockReturnValue([mockReturnLine]);
      (mockReturn as any).getTotalAmount = jest
        .fn()
        .mockReturnValue({ getAmount: () => 50, getCurrency: () => 'COP' });

      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
        isValid: true,
        errors: [],
      });

      const mockMovement = {
        id: 'movement-out-123',
        type: { getValue: () => 'OUT' },
        warehouseId: 'warehouse-123',
        reference: 'REF-001',
        reason: 'SUPPLIER_RETURN',
        note: null,
        createdBy: 'user-123',
        orgId: mockOrgId,
        getLines: () => [
          {
            id: 'ml-1',
            productId: 'product-123',
            locationId: 'location-123',
            quantity: { getNumericValue: () => 3 },
            unitCost: { getAmount: () => 50 },
            currency: 'COP',
          },
        ],
      };
      jest
        .spyOn(InventoryIntegrationService, 'generateMovementFromSupplierReturn')
        .mockReturnValue(mockMovement as any);

      mockUnitOfWork.execute.mockImplementation(async _callback => {
        return {
          confirmedReturn: {
            id: mockReturnId,
            returnNumber: 'RETURN-2025-002',
            status: 'CONFIRMED',
            type: 'RETURN_SUPPLIER',
            reason: null,
            warehouseId: 'warehouse-123',
            saleId: null,
            sourceMovementId: 'source-movement-123',
            returnMovementId: 'movement-out-123',
            note: null,
            confirmedAt: new Date(),
            cancelledAt: null,
            createdBy: 'user-123',
            orgId: mockOrgId,
            createdAt: new Date(),
            updatedAt: new Date(),
            lines: [],
          },
          postedMovement: {
            id: 'movement-out-123',
            type: 'OUT',
            status: 'POSTED',
            warehouseId: 'warehouse-123',
            orgId: mockOrgId,
          },
        };
      });

      // Act
      const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

      // Assert
      expect(result.isOk()).toBe(true);
      expect(InventoryIntegrationService.generateMovementFromSupplierReturn).toHaveBeenCalled();
    });

    it('Given: BusinessRuleError in transaction When: confirming Then: should return err', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      const mockReturnLine = {
        id: 'line-123',
        productId: 'product-123',
        locationId: 'location-123',
        quantity: { isPositive: () => true, getNumericValue: () => 5 },
        getTotalPrice: () => ({ getAmount: () => 100, getCurrency: () => 'COP' }),
        originalSalePrice: { getAmount: () => 100 },
        originalUnitCost: undefined,
        currency: 'COP',
      };
      (mockReturn as any).getLines = jest.fn().mockReturnValue([mockReturnLine]);
      (mockReturn as any).getTotalAmount = jest
        .fn()
        .mockReturnValue({ getAmount: () => 100, getCurrency: () => 'COP' });

      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
        isValid: true,
        errors: [],
      });

      const mockMovement = {
        id: mockMovementId,
        type: { getValue: () => 'IN' },
        warehouseId: 'warehouse-123',
        reference: null,
        reason: null,
        note: null,
        createdBy: 'user-123',
        orgId: mockOrgId,
        getLines: () => [],
      };
      jest
        .spyOn(InventoryIntegrationService, 'generateMovementFromCustomerReturn')
        .mockReturnValue(mockMovement as any);

      mockUnitOfWork.execute.mockRejectedValue(new BusinessRuleError('Sale not found'));

      // Act
      const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('Sale not found');
        }
      );
    });

    it('Given: InsufficientStockError in transaction When: confirming Then: should map to BusinessRuleError', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      const mockReturnLine = {
        id: 'line-123',
        productId: 'product-123',
        locationId: 'location-123',
        quantity: { isPositive: () => true, getNumericValue: () => 5 },
        getTotalPrice: () => ({ getAmount: () => 100, getCurrency: () => 'COP' }),
        originalSalePrice: { getAmount: () => 100 },
        originalUnitCost: undefined,
        currency: 'COP',
      };
      (mockReturn as any).getLines = jest.fn().mockReturnValue([mockReturnLine]);
      (mockReturn as any).getTotalAmount = jest
        .fn()
        .mockReturnValue({ getAmount: () => 100, getCurrency: () => 'COP' });

      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
        isValid: true,
        errors: [],
      });

      const mockMovement = {
        id: mockMovementId,
        type: { getValue: () => 'IN' },
        warehouseId: 'warehouse-123',
        reference: null,
        reason: null,
        note: null,
        createdBy: 'user-123',
        orgId: mockOrgId,
        getLines: () => [],
      };
      jest
        .spyOn(InventoryIntegrationService, 'generateMovementFromCustomerReturn')
        .mockReturnValue(mockMovement as any);

      mockUnitOfWork.execute.mockRejectedValue(
        new InsufficientStockError('product-123', 'warehouse-123', 10, 5)
      );

      // Act
      const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('Insufficient stock');
          expect(error.message).toContain('product-123');
        }
      );
    });

    it('Given: generic error in transaction When: confirming Then: should rethrow', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      const mockReturnLine = {
        id: 'line-123',
        productId: 'product-123',
        locationId: 'location-123',
        quantity: { isPositive: () => true, getNumericValue: () => 5 },
        getTotalPrice: () => ({ getAmount: () => 100, getCurrency: () => 'COP' }),
        originalSalePrice: { getAmount: () => 100 },
        originalUnitCost: undefined,
        currency: 'COP',
      };
      (mockReturn as any).getLines = jest.fn().mockReturnValue([mockReturnLine]);
      (mockReturn as any).getTotalAmount = jest
        .fn()
        .mockReturnValue({ getAmount: () => 100, getCurrency: () => 'COP' });

      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
        isValid: true,
        errors: [],
      });

      const mockMovement = {
        id: mockMovementId,
        type: { getValue: () => 'IN' },
        warehouseId: 'warehouse-123',
        reference: null,
        reason: null,
        note: null,
        createdBy: 'user-123',
        orgId: mockOrgId,
        getLines: () => [],
      };
      jest
        .spyOn(InventoryIntegrationService, 'generateMovementFromCustomerReturn')
        .mockReturnValue(mockMovement as any);

      mockUnitOfWork.execute.mockRejectedValue(new Error('DB connection lost'));

      // Act & Assert
      await expect(useCase.execute({ id: mockReturnId, orgId: mockOrgId })).rejects.toThrow(
        'DB connection lost'
      );
    });
  });
});
