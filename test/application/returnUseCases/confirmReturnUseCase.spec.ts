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

    it('Given: non-Error throw in transaction When: confirming Then: should rethrow', async () => {
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

      mockUnitOfWork.execute.mockRejectedValue('string-error');

      // Act & Assert
      await expect(useCase.execute({ id: mockReturnId, orgId: mockOrgId })).rejects.toBe(
        'string-error'
      );
    });

    it('Given: InsufficientStockError without availableQuantity When: confirming Then: should show unknown in message', async () => {
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

      // No availableQuantity passed (undefined)
      mockUnitOfWork.execute.mockRejectedValue(
        new InsufficientStockError('product-123', 'warehouse-123', 10, undefined, 'loc-1')
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
          expect(error.message).toContain('unknown');
        }
      );
    });

    describe('transaction callback - customer return path', () => {
      const setupCustomerReturnWithTransactionExec = () => {
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
        (mockReturn as any).lines = [mockReturnLine];
        (mockReturn as any).getLines = jest.fn().mockReturnValue([mockReturnLine]);
        (mockReturn as any).getTotalAmount = jest
          .fn()
          .mockReturnValue({ getAmount: () => 100, getCurrency: () => 'COP' });

        mockReturnRepository.findById.mockResolvedValue(mockReturn);

        jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
          isValid: true,
          errors: [],
        });

        const mockMovementLine = {
          id: 'ml-1',
          productId: 'product-123',
          locationId: 'location-123',
          quantity: { getNumericValue: () => 5 },
          unitCost: { getAmount: () => 100 },
          currency: 'COP',
        };
        const mockMovement = {
          id: mockMovementId,
          type: { getValue: () => 'IN' },
          warehouseId: 'warehouse-123',
          reference: 'REF-001',
          reason: 'RETURN_CUSTOMER',
          note: 'Customer return',
          createdBy: 'user-123',
          orgId: mockOrgId,
          getLines: () => [mockMovementLine],
        };
        jest
          .spyOn(InventoryIntegrationService, 'generateMovementFromCustomerReturn')
          .mockReturnValue(mockMovement as any);

        return { mockReturn, mockMovement, mockReturnLine };
      };

      it('Given: customer return with saleId When: tx callback runs Then: should lock sale and validate quantities', async () => {
        const { mockReturn } = setupCustomerReturnWithTransactionExec();

        // Capture the transaction callback and execute it
        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            sale: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'sale-123',
                status: 'COMPLETED',
                lines: [{ productId: 'product-123', quantity: 10 }],
              } as never),
              update: jest.fn().mockResolvedValue({} as never),
            },
            movement: {
              create: jest.fn().mockResolvedValue({
                id: mockMovementId,
                type: 'IN',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalled();
      });

      it('Given: customer return with sale not found in tx When: tx callback runs Then: should throw BusinessRuleError', async () => {
        setupCustomerReturnWithTransactionExec();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
            },
            sale: {
              findUnique: jest.fn().mockResolvedValue(null as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isErr()).toBe(true);
        result.match(
          () => {
            throw new Error('Expected Err result');
          },
          error => {
            expect(error).toBeInstanceOf(BusinessRuleError);
            expect(error.message).toContain('Sale with ID');
          }
        );
      });

      it('Given: customer return with product not in sale When: tx callback runs Then: should throw BusinessRuleError', async () => {
        setupCustomerReturnWithTransactionExec();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
            },
            sale: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'sale-123',
                lines: [{ productId: 'other-product', quantity: 10 }],
              } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isErr()).toBe(true);
        result.match(
          () => {
            throw new Error('Expected Err result');
          },
          error => {
            expect(error).toBeInstanceOf(BusinessRuleError);
            expect(error.message).toContain('was not sold');
          }
        );
      });

      it('Given: customer return exceeding sold quantity When: tx callback runs Then: should throw BusinessRuleError', async () => {
        setupCustomerReturnWithTransactionExec();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([
                {
                  saleId: 'sale-123',
                  status: 'CONFIRMED',
                  lines: [{ productId: 'product-123', quantity: 8 }],
                },
              ] as never),
            },
            sale: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'sale-123',
                lines: [{ productId: 'product-123', quantity: 10 }],
              } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isErr()).toBe(true);
        result.match(
          () => {
            throw new Error('Expected Err result');
          },
          error => {
            expect(error).toBeInstanceOf(BusinessRuleError);
            expect(error.message).toContain('Cannot return');
            expect(error.message).toContain('Already returned');
          }
        );
      });

      it('Given: customer return with existing returns for multiple products When: tx callback Then: should accumulate returned quantities', async () => {
        setupCustomerReturnWithTransactionExec();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([
                {
                  saleId: 'sale-123',
                  status: 'CONFIRMED',
                  lines: [
                    { productId: 'product-123', quantity: 2 },
                    { productId: 'product-123', quantity: 1 },
                  ],
                },
              ] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            sale: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'sale-123',
                status: 'COMPLETED',
                lines: [{ productId: 'product-123', quantity: 20 }],
              } as never),
              update: jest.fn().mockResolvedValue({} as never),
            },
            movement: {
              create: jest.fn().mockResolvedValue({
                id: mockMovementId,
                type: 'IN',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
      });

      it('Given: customer return with sale status SHIPPED When: tx callback runs Then: should update sale to RETURNED', async () => {
        setupCustomerReturnWithTransactionExec();

        const saleFindUniqueMock = jest.fn<() => Promise<any>>();
        const saleUpdateMock = jest.fn<() => Promise<any>>().mockResolvedValue({} as never);
        // First call for quantity validation, second call for status update
        saleFindUniqueMock
          .mockResolvedValueOnce({
            id: 'sale-123',
            status: 'COMPLETED',
            lines: [{ productId: 'product-123', quantity: 10 }],
          } as never)
          .mockResolvedValueOnce({
            id: 'sale-123',
            status: 'SHIPPED',
          } as never);

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            sale: {
              findUnique: saleFindUniqueMock,
              update: saleUpdateMock,
            },
            movement: {
              create: jest.fn().mockResolvedValue({
                id: mockMovementId,
                type: 'IN',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        expect(saleUpdateMock).toHaveBeenCalled();
      });

      it('Given: customer return with sale in non-updatable status When: tx callback runs Then: should NOT update sale', async () => {
        setupCustomerReturnWithTransactionExec();

        const saleUpdateMock = jest.fn<() => Promise<any>>().mockResolvedValue({} as never);
        const saleFindUniqueMock = jest.fn<() => Promise<any>>();
        saleFindUniqueMock
          .mockResolvedValueOnce({
            id: 'sale-123',
            status: 'COMPLETED',
            lines: [{ productId: 'product-123', quantity: 10 }],
          } as never)
          .mockResolvedValueOnce({
            id: 'sale-123',
            status: 'CANCELLED',
          } as never);

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            sale: {
              findUnique: saleFindUniqueMock,
              update: saleUpdateMock,
            },
            movement: {
              create: jest.fn().mockResolvedValue({
                id: mockMovementId,
                type: 'IN',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        // sale.update should NOT be called since status is CANCELLED
        expect(saleUpdateMock).not.toHaveBeenCalled();
      });

      it('Given: customer return with sale not found for status update When: tx callback runs Then: should still succeed', async () => {
        setupCustomerReturnWithTransactionExec();

        const saleFindUniqueMock = jest.fn<() => Promise<any>>();
        saleFindUniqueMock
          .mockResolvedValueOnce({
            id: 'sale-123',
            status: 'COMPLETED',
            lines: [{ productId: 'product-123', quantity: 10 }],
          } as never)
          .mockResolvedValueOnce(null as never);

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            sale: {
              findUnique: saleFindUniqueMock,
            },
            movement: {
              create: jest.fn().mockResolvedValue({
                id: mockMovementId,
                type: 'IN',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
      });

      it('Given: customer return with no movement lines When: tx callback runs Then: should skip createMany and stock update', async () => {
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
        (mockReturn as any).lines = [mockReturnLine];
        (mockReturn as any).getLines = jest.fn().mockReturnValue([mockReturnLine]);
        (mockReturn as any).getTotalAmount = jest
          .fn()
          .mockReturnValue({ getAmount: () => 100, getCurrency: () => 'COP' });

        mockReturnRepository.findById.mockResolvedValue(mockReturn);

        jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
          isValid: true,
          errors: [],
        });

        // Movement with NO lines
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

        const createManyMock = jest.fn<() => Promise<any>>();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            sale: {
              findUnique: jest
                .fn<() => Promise<any>>()
                .mockResolvedValueOnce({
                  id: 'sale-123',
                  status: 'COMPLETED',
                  lines: [{ productId: 'product-123', quantity: 10 }],
                } as never)
                .mockResolvedValueOnce({
                  id: 'sale-123',
                  status: 'COMPLETED',
                } as never),
              update: jest.fn<() => Promise<any>>().mockResolvedValue({} as never),
            },
            movement: {
              create: jest.fn().mockResolvedValue({
                id: mockMovementId,
                type: 'IN',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: createManyMock,
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        expect(createManyMock).not.toHaveBeenCalled();
      });

      it('Given: customer return with movement line without locationId or unitCost When: tx callback runs Then: should use null', async () => {
        const mockReturn = createMockReturn();
        const mockReturnLine = {
          id: 'line-123',
          productId: 'product-123',
          locationId: null,
          quantity: { isPositive: () => true, getNumericValue: () => 5 },
          getTotalPrice: () => ({ getAmount: () => 100, getCurrency: () => 'COP' }),
          originalSalePrice: { getAmount: () => 100 },
          originalUnitCost: undefined,
          currency: 'COP',
        };
        (mockReturn as any).lines = [mockReturnLine];
        (mockReturn as any).getLines = jest.fn().mockReturnValue([mockReturnLine]);
        (mockReturn as any).getTotalAmount = jest
          .fn()
          .mockReturnValue({ getAmount: () => 100, getCurrency: () => 'COP' });

        mockReturnRepository.findById.mockResolvedValue(mockReturn);

        jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
          isValid: true,
          errors: [],
        });

        // Movement with line that has no locationId and no unitCost
        const mockMovementLine = {
          id: 'ml-1',
          productId: 'product-123',
          locationId: undefined,
          quantity: { getNumericValue: () => 5 },
          unitCost: undefined,
          currency: 'COP',
        };
        const mockMovement = {
          id: mockMovementId,
          type: { getValue: () => 'IN' },
          warehouseId: 'warehouse-123',
          reference: null,
          reason: null,
          note: null,
          createdBy: 'user-123',
          orgId: mockOrgId,
          getLines: () => [mockMovementLine],
        };
        jest
          .spyOn(InventoryIntegrationService, 'generateMovementFromCustomerReturn')
          .mockReturnValue(mockMovement as any);

        const createManyMock = jest
          .fn<() => Promise<any>>()
          .mockResolvedValue({ count: 1 } as never);

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            sale: {
              findUnique: jest
                .fn<() => Promise<any>>()
                .mockResolvedValueOnce({
                  id: 'sale-123',
                  status: 'COMPLETED',
                  lines: [{ productId: 'product-123', quantity: 10 }],
                } as never)
                .mockResolvedValueOnce({
                  id: 'sale-123',
                  status: 'COMPLETED',
                } as never),
              update: jest.fn<() => Promise<any>>().mockResolvedValue({} as never),
            },
            movement: {
              create: jest.fn().mockResolvedValue({
                id: mockMovementId,
                type: 'IN',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: createManyMock,
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        // Verify createMany was called with null locationId and null unitCost
        expect(createManyMock).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({
              locationId: null,
              unitCost: null,
            }),
          ],
        });
      });
    });

    describe('transaction callback - supplier return path', () => {
      const createMockSupplierReturn = () => {
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

        const mockMovementLine = {
          id: 'ml-1',
          productId: 'product-123',
          locationId: 'location-123',
          quantity: { getNumericValue: () => 3 },
          unitCost: { getAmount: () => 50 },
          currency: 'COP',
        };
        const mockMovement = {
          id: 'movement-out-123',
          type: { getValue: () => 'OUT' },
          warehouseId: 'warehouse-123',
          reference: 'REF-002',
          reason: 'RETURN_SUPPLIER',
          note: 'Supplier return',
          createdBy: 'user-123',
          orgId: mockOrgId,
          getLines: () => [mockMovementLine],
        };
        jest
          .spyOn(InventoryIntegrationService, 'generateMovementFromSupplierReturn')
          .mockReturnValue(mockMovement as any);

        return { mockReturn, mockMovement, mockReturnLine };
      };

      it('Given: supplier return with sourceMovementId When: tx callback runs Then: should lock movement and validate quantities', async () => {
        createMockSupplierReturn();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            movement: {
              findUnique: jest
                .fn<() => Promise<any>>()
                .mockResolvedValueOnce({
                  id: 'source-movement-123',
                  status: 'POSTED',
                  lines: [{ productId: 'product-123', quantity: 10 }],
                } as never)
                .mockResolvedValueOnce({
                  id: 'source-movement-123',
                  status: 'POSTED',
                } as never),
              create: jest.fn().mockResolvedValue({
                id: 'movement-out-123',
                type: 'OUT',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
              update: jest.fn<() => Promise<any>>().mockResolvedValue({} as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
      });

      it('Given: supplier return with source movement not found When: tx callback runs Then: should throw BusinessRuleError', async () => {
        createMockSupplierReturn();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
            },
            movement: {
              findUnique: jest.fn().mockResolvedValue(null as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isErr()).toBe(true);
        result.match(
          () => {
            throw new Error('Expected Err result');
          },
          error => {
            expect(error).toBeInstanceOf(BusinessRuleError);
            expect(error.message).toContain('Source movement with ID');
          }
        );
      });

      it('Given: supplier return with product not in source movement When: tx callback runs Then: should throw BusinessRuleError', async () => {
        createMockSupplierReturn();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
            },
            movement: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'source-movement-123',
                lines: [{ productId: 'other-product', quantity: 10 }],
              } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isErr()).toBe(true);
        result.match(
          () => {
            throw new Error('Expected Err result');
          },
          error => {
            expect(error).toBeInstanceOf(BusinessRuleError);
            expect(error.message).toContain('was not purchased');
          }
        );
      });

      it('Given: supplier return exceeding purchased quantity When: tx callback runs Then: should throw BusinessRuleError', async () => {
        createMockSupplierReturn();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([
                {
                  sourceMovementId: 'source-movement-123',
                  status: 'CONFIRMED',
                  lines: [{ productId: 'product-123', quantity: 9 }],
                },
              ] as never),
            },
            movement: {
              findUnique: jest.fn().mockResolvedValue({
                id: 'source-movement-123',
                lines: [{ productId: 'product-123', quantity: 10 }],
              } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isErr()).toBe(true);
        result.match(
          () => {
            throw new Error('Expected Err result');
          },
          error => {
            expect(error).toBeInstanceOf(BusinessRuleError);
            expect(error.message).toContain('Cannot return');
            expect(error.message).toContain('Purchased');
          }
        );
      });

      it('Given: supplier return - stock decrement returns 0 When: tx callback runs Then: should throw InsufficientStockError', async () => {
        createMockSupplierReturn();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const executeRawMock = jest.fn<() => Promise<number>>();
          // First call: lock (SELECT FOR UPDATE)
          executeRawMock.mockResolvedValueOnce(1 as never);
          // Second call: stock decrement UPDATE returns 0
          executeRawMock.mockResolvedValueOnce(0 as never);

          const mockTx = {
            $executeRaw: executeRawMock,
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            movement: {
              findUnique: jest.fn<() => Promise<any>>().mockResolvedValueOnce({
                id: 'source-movement-123',
                status: 'POSTED',
                lines: [{ productId: 'product-123', quantity: 10 }],
              } as never),
              create: jest.fn().mockResolvedValue({
                id: 'movement-out-123',
                type: 'OUT',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isErr()).toBe(true);
        result.match(
          () => {
            throw new Error('Expected Err result');
          },
          error => {
            expect(error).toBeInstanceOf(BusinessRuleError);
            expect(error.message).toContain('Insufficient stock');
          }
        );
      });

      it('Given: supplier return with source movement in non-POSTED status When: tx callback runs Then: should NOT update movement', async () => {
        createMockSupplierReturn();

        const movementUpdateMock = jest.fn<() => Promise<any>>().mockResolvedValue({} as never);

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            movement: {
              findUnique: jest
                .fn<() => Promise<any>>()
                .mockResolvedValueOnce({
                  id: 'source-movement-123',
                  status: 'POSTED',
                  lines: [{ productId: 'product-123', quantity: 10 }],
                } as never)
                .mockResolvedValueOnce({
                  id: 'source-movement-123',
                  status: 'CANCELLED',
                } as never),
              create: jest.fn().mockResolvedValue({
                id: 'movement-out-123',
                type: 'OUT',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
              update: movementUpdateMock,
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        expect(movementUpdateMock).not.toHaveBeenCalled();
      });

      it('Given: supplier return with source movement not found for status update When: tx callback runs Then: should still succeed', async () => {
        createMockSupplierReturn();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            movement: {
              findUnique: jest
                .fn<() => Promise<any>>()
                .mockResolvedValueOnce({
                  id: 'source-movement-123',
                  status: 'POSTED',
                  lines: [{ productId: 'product-123', quantity: 10 }],
                } as never)
                .mockResolvedValueOnce(null as never),
              create: jest.fn().mockResolvedValue({
                id: 'movement-out-123',
                type: 'OUT',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
      });

      it('Given: supplier return with existing returns across multiple returns When: tx callback Then: should accumulate returned quantities', async () => {
        createMockSupplierReturn();

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              findMany: jest.fn().mockResolvedValue([
                {
                  sourceMovementId: 'source-movement-123',
                  status: 'CONFIRMED',
                  lines: [
                    { productId: 'product-123', quantity: 1 },
                    { productId: 'product-123', quantity: 2 },
                  ],
                },
              ] as never),
              update: jest.fn().mockResolvedValue({
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
              } as never),
            },
            movement: {
              findUnique: jest
                .fn<() => Promise<any>>()
                .mockResolvedValueOnce({
                  id: 'source-movement-123',
                  status: 'POSTED',
                  lines: [{ productId: 'product-123', quantity: 20 }],
                } as never)
                .mockResolvedValueOnce({
                  id: 'source-movement-123',
                  status: 'POSTED',
                } as never),
              create: jest.fn().mockResolvedValue({
                id: 'movement-out-123',
                type: 'OUT',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
              update: jest.fn<() => Promise<any>>().mockResolvedValue({} as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
      });
    });

    describe('customer return without saleId', () => {
      it('Given: customer return without saleId When: tx callback runs Then: should skip sale validation', async () => {
        // Create a customer return but without a saleId
        const props = ReturnMapper.toDomainProps(
          {
            type: 'RETURN_CUSTOMER',
            warehouseId: 'warehouse-123',
            saleId: undefined,
            createdBy: 'user-123',
          },
          ReturnNumber.create(2025, 3)
        );
        const mockReturn = Return.reconstitute(props, mockReturnId, mockOrgId);
        // Override saleId to be undefined
        (mockReturn as any).props.saleId = undefined;
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
        (mockReturn as any).lines = [mockReturnLine];
        (mockReturn as any).getLines = jest.fn().mockReturnValue([mockReturnLine]);
        (mockReturn as any).getTotalAmount = jest
          .fn()
          .mockReturnValue({ getAmount: () => 100, getCurrency: () => 'COP' });

        mockReturnRepository.findById.mockResolvedValue(mockReturn);

        jest.spyOn(ReturnValidationService, 'validateReturnCanBeConfirmed').mockReturnValue({
          isValid: true,
          errors: [],
        });

        const mockMovementLine = {
          id: 'ml-1',
          productId: 'product-123',
          locationId: 'location-123',
          quantity: { getNumericValue: () => 5 },
          unitCost: { getAmount: () => 100 },
          currency: 'COP',
        };
        const mockMovement = {
          id: mockMovementId,
          type: { getValue: () => 'IN' },
          warehouseId: 'warehouse-123',
          reference: null,
          reason: null,
          note: null,
          createdBy: 'user-123',
          orgId: mockOrgId,
          getLines: () => [mockMovementLine],
        };
        jest
          .spyOn(InventoryIntegrationService, 'generateMovementFromCustomerReturn')
          .mockReturnValue(mockMovement as any);

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const mockTx = {
            $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1 as never),
            return: {
              update: jest.fn().mockResolvedValue({
                id: mockReturnId,
                returnNumber: 'RETURN-2025-003',
                status: 'CONFIRMED',
                type: 'RETURN_CUSTOMER',
                reason: null,
                warehouseId: 'warehouse-123',
                saleId: null,
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
              } as never),
            },
            movement: {
              create: jest.fn().mockResolvedValue({
                id: mockMovementId,
                type: 'IN',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
      });
    });

    describe('supplier return without sourceMovementId', () => {
      it('Given: supplier return without sourceMovementId When: tx callback runs Then: should skip movement validation', async () => {
        const supplierProps = ReturnMapper.toDomainProps(
          {
            type: 'RETURN_SUPPLIER',
            warehouseId: 'warehouse-123',
            sourceMovementId: undefined,
            createdBy: 'user-123',
          },
          ReturnNumber.create(2025, 4)
        );
        const mockReturn = Return.reconstitute(supplierProps, mockReturnId, mockOrgId);
        (mockReturn as any).props.sourceMovementId = undefined;
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

        const mockMovementLine = {
          id: 'ml-1',
          productId: 'product-123',
          locationId: 'location-123',
          quantity: { getNumericValue: () => 3 },
          unitCost: { getAmount: () => 50 },
          currency: 'COP',
        };
        const mockMovement = {
          id: 'movement-out-123',
          type: { getValue: () => 'OUT' },
          warehouseId: 'warehouse-123',
          reference: null,
          reason: null,
          note: null,
          createdBy: 'user-123',
          orgId: mockOrgId,
          getLines: () => [mockMovementLine],
        };
        jest
          .spyOn(InventoryIntegrationService, 'generateMovementFromSupplierReturn')
          .mockReturnValue(mockMovement as any);

        mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
          const executeRawMock = jest.fn<() => Promise<number>>();
          executeRawMock.mockResolvedValue(1 as never);

          const mockTx = {
            $executeRaw: executeRawMock,
            return: {
              update: jest.fn().mockResolvedValue({
                id: mockReturnId,
                returnNumber: 'RETURN-2025-004',
                status: 'CONFIRMED',
                type: 'RETURN_SUPPLIER',
                reason: null,
                warehouseId: 'warehouse-123',
                saleId: null,
                sourceMovementId: null,
                returnMovementId: 'movement-out-123',
                note: null,
                confirmedAt: new Date(),
                cancelledAt: null,
                createdBy: 'user-123',
                orgId: mockOrgId,
                createdAt: new Date(),
                updatedAt: new Date(),
                lines: [],
              } as never),
            },
            movement: {
              create: jest.fn().mockResolvedValue({
                id: 'movement-out-123',
                type: 'OUT',
                status: 'POSTED',
                warehouseId: 'warehouse-123',
                orgId: mockOrgId,
              } as never),
            },
            movementLine: {
              createMany: jest.fn().mockResolvedValue({ count: 1 } as never),
            },
          };
          return callback(mockTx);
        });

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
      });
    });

    describe('response data mapping', () => {
      it('Given: confirmed return with multiple lines When: mapping response Then: should map all line fields correctly', async () => {
        const mockReturn = createMockReturn();
        const mockReturnLine1 = {
          id: 'line-1',
          productId: 'product-1',
          locationId: 'location-1',
          quantity: { isPositive: () => true, getNumericValue: () => 3 },
          getTotalPrice: () => ({ getAmount: () => 300, getCurrency: () => 'COP' }),
          originalSalePrice: { getAmount: () => 100 },
          originalUnitCost: { getAmount: () => 80 },
          currency: 'COP',
        };
        const mockReturnLine2 = {
          id: 'line-2',
          productId: 'product-2',
          locationId: undefined,
          quantity: { isPositive: () => true, getNumericValue: () => 2 },
          getTotalPrice: () => null,
          originalSalePrice: undefined,
          originalUnitCost: undefined,
          currency: 'COP',
        };
        (mockReturn as any).lines = [mockReturnLine1, mockReturnLine2];
        (mockReturn as any).getLines = jest
          .fn()
          .mockReturnValue([mockReturnLine1, mockReturnLine2]);
        (mockReturn as any).getTotalAmount = jest
          .fn()
          .mockReturnValue({ getAmount: () => 300, getCurrency: () => 'COP' });

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

        mockUnitOfWork.execute.mockImplementation(async _callback => {
          return {
            confirmedReturn: {
              id: mockReturnId,
              returnNumber: 'RETURN-2025-001',
              status: 'CONFIRMED',
              type: 'RETURN_CUSTOMER',
              reason: 'DEFECTIVE',
              warehouseId: 'warehouse-123',
              saleId: 'sale-123',
              sourceMovementId: null,
              returnMovementId: mockMovementId,
              note: 'Some note',
              confirmedAt: new Date(),
              cancelledAt: new Date(),
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

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.data.lines).toHaveLength(2);
            // First line: has all prices
            expect(value.data.lines[0].originalSalePrice).toBe(100);
            expect(value.data.lines[0].originalUnitCost).toBe(80);
            expect(value.data.lines[0].totalPrice).toBe(300);
            // Second line: no prices
            expect(value.data.lines[1].originalSalePrice).toBeUndefined();
            expect(value.data.lines[1].originalUnitCost).toBeUndefined();
            expect(value.data.lines[1].totalPrice).toBe(0);
            // Other fields
            expect(value.data.reason).toBe('DEFECTIVE');
            expect(value.data.note).toBe('Some note');
            expect(value.data.confirmedAt).toBeDefined();
            expect(value.data.cancelledAt).toBeDefined();
            expect(value.data.saleId).toBe('sale-123');
            expect(value.data.sourceMovementId).toBeUndefined();
            expect(value.data.totalAmount).toBe(300);
            expect(value.data.currency).toBe('COP');
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });

      it('Given: confirmed return with null totalAmount When: mapping response Then: should have undefined amount and currency', async () => {
        const mockReturn = createMockReturn();
        const mockReturnLine = {
          id: 'line-123',
          productId: 'product-123',
          locationId: 'location-123',
          quantity: { isPositive: () => true, getNumericValue: () => 5 },
          getTotalPrice: () => null,
          originalSalePrice: undefined,
          originalUnitCost: undefined,
          currency: 'COP',
        };
        (mockReturn as any).lines = [mockReturnLine];
        (mockReturn as any).getLines = jest.fn().mockReturnValue([mockReturnLine]);
        (mockReturn as any).getTotalAmount = jest.fn().mockReturnValue(null);

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

        mockUnitOfWork.execute.mockImplementation(async _callback => {
          return {
            confirmedReturn: {
              id: mockReturnId,
              returnNumber: 'RETURN-2025-001',
              status: 'CONFIRMED',
              type: 'RETURN_CUSTOMER',
              reason: null,
              warehouseId: 'warehouse-123',
              saleId: null,
              sourceMovementId: 'src-movement',
              returnMovementId: mockMovementId,
              note: null,
              confirmedAt: null,
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

        const result = await useCase.execute({ id: mockReturnId, orgId: mockOrgId });

        expect(result.isOk()).toBe(true);
        result.match(
          value => {
            expect(value.data.totalAmount).toBeUndefined();
            expect(value.data.currency).toBeUndefined();
            expect(value.data.saleId).toBeUndefined();
            expect(value.data.sourceMovementId).toBe('src-movement');
            expect(value.data.confirmedAt).toBeUndefined();
            expect(value.data.cancelledAt).toBeUndefined();
            expect(value.data.note).toBeUndefined();
          },
          () => {
            throw new Error('Expected Ok result');
          }
        );
      });
    });
  });
});
