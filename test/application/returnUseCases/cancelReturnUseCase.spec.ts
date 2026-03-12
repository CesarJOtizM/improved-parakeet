import { CancelReturnUseCase } from '@application/returnUseCases/cancelReturnUseCase';
import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnValidationService } from '@returns/domain/services/returnValidation.service';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnMapper } from '@returns/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

describe('CancelReturnUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockReturnId = 'return-123';

  let useCase: CancelReturnUseCase;
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
      findByReturnMovementId: jest.fn(),
    } as any;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    mockUnitOfWork = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWork>;

    useCase = new CancelReturnUseCase(mockReturnRepository, mockEventDispatcher, mockUnitOfWork);
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
      const returnEntity = Return.reconstitute(props, mockReturnId, mockOrgId);
      returnEntity.cancel = jest.fn();
      return returnEntity;
    };

    it('Given: draft return When: cancelling return Then: should return success result', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeCancelled').mockReturnValue({
        isValid: true,
        errors: [],
      });

      mockReturnRepository.save.mockResolvedValue(mockReturn);

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        reason: 'Customer request',
        cancelledBy: 'user-456',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Return cancelled successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent return When: cancelling return Then: should return NotFoundError', async () => {
      // Arrange
      mockReturnRepository.findById.mockResolvedValue(null);

      const request = {
        id: 'non-existent-id',
        orgId: mockOrgId,
        cancelledBy: 'user-456',
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

    it('Given: return that cannot be cancelled When: cancelling return Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      mockReturnRepository.findById.mockResolvedValue(mockReturn);

      jest.spyOn(ReturnValidationService, 'validateReturnCanBeCancelled').mockReturnValue({
        isValid: false,
        errors: ['Return is already confirmed'],
      });

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'user-456',
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

    // --- Helper for confirmed return tests ---
    const createMockConfirmedReturn = (
      overrides: {
        type?: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER';
        saleId?: string | null;
        sourceMovementId?: string | null;
        returnMovementId?: string | null;
      } = {}
    ) => {
      const isCustomer = (overrides.type || 'RETURN_CUSTOMER') === 'RETURN_CUSTOMER';
      const mockReturnLine = {
        id: 'line-1',
        productId: 'product-1',
        locationId: 'location-1',
        quantity: { isPositive: () => true, getNumericValue: () => 10 },
        getTotalPrice: () => ({ getAmount: () => 250, getCurrency: () => 'COP' }),
        originalSalePrice: { getAmount: () => 25 },
        originalUnitCost: { getAmount: () => 15 },
        currency: 'COP',
      };

      const returnEntity = {
        id: mockReturnId,
        orgId: mockOrgId,
        warehouseId: 'warehouse-123',
        saleId: isCustomer
          ? overrides.saleId !== undefined
            ? overrides.saleId
            : 'sale-123'
          : null,
        sourceMovementId: !isCustomer
          ? overrides.sourceMovementId !== undefined
            ? overrides.sourceMovementId
            : 'source-mov-123'
          : null,
        returnMovementId:
          overrides.returnMovementId !== undefined ? overrides.returnMovementId : 'movement-123',
        note: 'Test note',
        confirmedAt: new Date(),
        cancelledAt: null,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        status: {
          isConfirmed: jest.fn<() => boolean>().mockReturnValue(true),
          getValue: jest.fn<() => string>().mockReturnValue('CANCELLED'),
        },
        type: {
          isCustomerReturn: jest.fn<() => boolean>().mockReturnValue(isCustomer),
          getValue: jest.fn<() => string>().mockReturnValue(overrides.type || 'RETURN_CUSTOMER'),
        },
        returnNumber: {
          getValue: jest.fn<() => string>().mockReturnValue('RETURN-2025-001'),
        },
        reason: {
          getValue: jest.fn<() => string>().mockReturnValue('Original reason'),
        },
        cancel: jest.fn(),
        markEventsForDispatch: jest.fn(),
        clearEvents: jest.fn(),
        domainEvents: [{ eventName: 'ReturnCancelled' }],
        getLines: jest.fn<() => (typeof mockReturnLine)[]>().mockReturnValue([mockReturnLine]),
        getTotalAmount: jest
          .fn()
          .mockReturnValue({ getAmount: () => 250, getCurrency: () => 'COP' }),
      };

      return returnEntity as unknown as Return;
    };

    // Helper to create mock Prisma transaction client
    const createMockTx = (overrides: Record<string, unknown> = {}) => {
      const mockTx = {
        movement: {
          findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null),
          update: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}),
        },
        sale: {
          findUnique: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue(null),
          update: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}),
        },
        return: {
          count: jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(0),
          update: jest.fn<(...args: unknown[]) => Promise<unknown>>().mockResolvedValue({}),
        },
        $executeRaw: jest.fn<(...args: unknown[]) => Promise<number>>().mockResolvedValue(1),
        ...overrides,
      };
      return mockTx;
    };

    // Helper to setup validation pass
    const setupValidationPass = () => {
      jest.spyOn(ReturnValidationService, 'validateReturnCanBeCancelled').mockReturnValue({
        isValid: true,
        errors: [],
      });
    };

    it('Given: confirmed customer return When: cancelling Then: should reverse stock by subtracting via UoW', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({ type: 'RETURN_CUSTOMER' });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      mockTx.movement.findUnique.mockResolvedValue({
        id: 'movement-123',
        warehouseId: 'warehouse-123',
        orgId: mockOrgId,
        lines: [{ productId: 'product-1', quantity: 10, locationId: 'location-1' }],
      });

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
        reason: 'Incorrect return',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      // Customer return: stock was added (IN) during confirm, so cancel subtracts it back
      expect(mockTx.$executeRaw).toHaveBeenCalled();
      // Movement should be voided
      expect(mockTx.movement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'movement-123' },
          data: expect.objectContaining({ status: 'VOID' }),
        })
      );
      // Return itself should be cancelled in DB
      expect(mockTx.return.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockReturnId },
          data: expect.objectContaining({ status: 'CANCELLED' }),
        })
      );
      // Entity cancel() called after UoW
      expect(mockReturn.cancel).toHaveBeenCalledWith('Incorrect return');
      // Should NOT call repository.save (that's the DRAFT path)
      expect(mockReturnRepository.save).not.toHaveBeenCalled();

      result.match(
        value => {
          expect(value.message).toBe(
            'Return cancelled and inventory adjustments reversed successfully'
          );
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: confirmed supplier return When: cancelling Then: should reverse stock by adding back via UoW', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({
        type: 'RETURN_SUPPLIER',
        sourceMovementId: 'source-mov-123',
      });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      mockTx.movement.findUnique.mockImplementation(async (args: unknown) => {
        const typedArgs = args as { where: { id: string } };
        if (typedArgs.where.id === 'movement-123') {
          return {
            id: 'movement-123',
            warehouseId: 'warehouse-123',
            orgId: mockOrgId,
            lines: [{ productId: 'product-1', quantity: 5, locationId: null }],
          };
        }
        if (typedArgs.where.id === 'source-mov-123') {
          return { id: 'source-mov-123', status: 'RETURNED' };
        }
        return null;
      });

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
        reason: 'Supplier dispute resolved',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockUnitOfWork.execute).toHaveBeenCalledTimes(1);
      // Supplier return: stock was removed (OUT) during confirm, so cancel adds it back via INSERT...ON CONFLICT
      expect(mockTx.$executeRaw).toHaveBeenCalled();
      // Movement voided
      expect(mockTx.movement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'movement-123' },
          data: expect.objectContaining({ status: 'VOID' }),
        })
      );
      // Source movement should be reverted from RETURNED to POSTED
      expect(mockTx.movement.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'source-mov-123' },
          data: expect.objectContaining({
            status: 'POSTED',
            returnedAt: null,
            returnedBy: null,
          }),
        })
      );
    });

    it('Given: confirmed customer return with saleId When: cancelling and no other active returns Then: should revert sale from RETURNED to COMPLETED', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({
        type: 'RETURN_CUSTOMER',
        saleId: 'sale-123',
      });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      // Return movement exists with lines
      mockTx.movement.findUnique.mockResolvedValue({
        id: 'movement-123',
        warehouseId: 'warehouse-123',
        orgId: mockOrgId,
        lines: [{ productId: 'product-1', quantity: 3, locationId: null }],
      });
      // No other active returns for this sale
      mockTx.return.count.mockResolvedValue(0);
      // Sale is currently RETURNED, has completedAt (so should revert to COMPLETED)
      mockTx.sale.findUnique.mockResolvedValue({
        id: 'sale-123',
        status: 'RETURNED',
        completedAt: new Date('2025-06-01'),
        shippedAt: new Date('2025-05-28'),
      });

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
        reason: 'Return was invalid',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      // Sale should be reverted to COMPLETED (because completedAt is set)
      expect(mockTx.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sale-123' },
          data: expect.objectContaining({
            status: 'COMPLETED',
            returnedAt: null,
            returnedBy: null,
          }),
        })
      );
    });

    it('Given: confirmed return When: cancel succeeds Then: should dispatch domain events', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({ type: 'RETURN_CUSTOMER' });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      mockTx.movement.findUnique.mockResolvedValue({
        id: 'movement-123',
        warehouseId: 'warehouse-123',
        orgId: mockOrgId,
        lines: [],
      });

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockReturn.markEventsForDispatch).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledWith(
        (mockReturn as unknown as { domainEvents: unknown[] }).domainEvents as any
      );
      expect(mockReturn.clearEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: confirmed return When: UoW throws BusinessRuleError Then: should return that error directly', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({ type: 'RETURN_CUSTOMER' });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const businessError = new BusinessRuleError('Stock validation failed during reversal');
      mockUnitOfWork.execute.mockRejectedValue(businessError);

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
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
          expect(error).toBe(businessError);
          expect(error.message).toBe('Stock validation failed during reversal');
        }
      );
    });

    it('Given: confirmed return When: UoW throws generic Error Then: should wrap in BusinessRuleError', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({ type: 'RETURN_CUSTOMER' });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      mockUnitOfWork.execute.mockRejectedValue(new Error('Database connection lost'));

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
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
          expect(error.message).toBe('Database connection lost');
        }
      );
    });

    it('Given: draft return When: cancelling with reason and cancelledBy Then: should pass reason to entity cancel and save via repository', async () => {
      // Arrange
      const mockReturn = createMockReturn();
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();
      mockReturnRepository.save.mockResolvedValue(mockReturn);

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        reason: 'No longer needed',
        cancelledBy: 'user-789',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      // Draft path: cancel on entity, then save via repository
      expect(mockReturn.cancel).toHaveBeenCalledWith('No longer needed');
      expect(mockReturnRepository.save).toHaveBeenCalledWith(mockReturn);
      // UoW should NOT be used for draft cancellation
      expect(mockUnitOfWork.execute).not.toHaveBeenCalled();
      // Events dispatched
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalled();
    });

    it('Given: confirmed customer return with RETURNED sale and shippedAt When: cancelling Then: should revert sale to SHIPPED', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({
        type: 'RETURN_CUSTOMER',
        saleId: 'sale-123',
      });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      mockTx.movement.findUnique.mockResolvedValue({
        id: 'movement-123',
        warehouseId: 'warehouse-123',
        orgId: mockOrgId,
        lines: [{ productId: 'product-1', quantity: 3, locationId: null }],
      });
      mockTx.return.count.mockResolvedValue(0);
      // Sale has shippedAt but NOT completedAt
      mockTx.sale.findUnique.mockResolvedValue({
        id: 'sale-123',
        status: 'RETURNED',
        completedAt: null,
        shippedAt: new Date('2025-05-28'),
      });

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
        reason: 'Invalid return',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockTx.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sale-123' },
          data: expect.objectContaining({
            status: 'SHIPPED',
          }),
        })
      );
    });

    it('Given: confirmed customer return with RETURNED sale no completedAt no shippedAt When: cancelling Then: should revert sale to CONFIRMED', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({
        type: 'RETURN_CUSTOMER',
        saleId: 'sale-123',
      });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      mockTx.movement.findUnique.mockResolvedValue({
        id: 'movement-123',
        warehouseId: 'warehouse-123',
        orgId: mockOrgId,
        lines: [{ productId: 'product-1', quantity: 3, locationId: null }],
      });
      mockTx.return.count.mockResolvedValue(0);
      // Sale has neither completedAt nor shippedAt
      mockTx.sale.findUnique.mockResolvedValue({
        id: 'sale-123',
        status: 'RETURNED',
        completedAt: null,
        shippedAt: null,
      });

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockTx.sale.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CONFIRMED' }),
        })
      );
    });

    it('Given: confirmed customer return with other active returns When: cancelling Then: should keep RETURNED status', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({
        type: 'RETURN_CUSTOMER',
        saleId: 'sale-123',
      });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      mockTx.movement.findUnique.mockResolvedValue({
        id: 'movement-123',
        warehouseId: 'warehouse-123',
        orgId: mockOrgId,
        lines: [{ productId: 'product-1', quantity: 3, locationId: null }],
      });
      // There are other active returns
      mockTx.return.count.mockResolvedValue(2);

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      // sale.update should NOT be called since other active returns exist
      expect(mockTx.sale.update).not.toHaveBeenCalled();
    });

    it('Given: confirmed customer return where sale status is not RETURNED When: cancelling Then: should not revert sale status', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({
        type: 'RETURN_CUSTOMER',
        saleId: 'sale-123',
      });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      mockTx.movement.findUnique.mockResolvedValue({
        id: 'movement-123',
        warehouseId: 'warehouse-123',
        orgId: mockOrgId,
        lines: [{ productId: 'product-1', quantity: 3, locationId: null }],
      });
      mockTx.return.count.mockResolvedValue(0);
      // Sale is CONFIRMED, not RETURNED
      mockTx.sale.findUnique.mockResolvedValue({
        id: 'sale-123',
        status: 'CONFIRMED',
        completedAt: null,
        shippedAt: null,
      });

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      // sale.update should NOT be called since sale is not in RETURNED status
      expect(mockTx.sale.update).not.toHaveBeenCalled();
    });

    it('Given: confirmed return with no returnMovement found When: cancelling Then: should still cancel return', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({
        type: 'RETURN_CUSTOMER',
      });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      // Return movement not found
      mockTx.movement.findUnique.mockResolvedValue(null);

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      // $executeRaw should NOT be called since movement not found
      expect(mockTx.$executeRaw).not.toHaveBeenCalled();
    });

    it('Given: confirmed return When: UoW throws non-Error Then: should wrap in BusinessRuleError with generic message', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({ type: 'RETURN_CUSTOMER' });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      mockUnitOfWork.execute.mockRejectedValue('string-error');

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
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
          expect(error.message).toBe('Failed to cancel return');
        }
      );
    });

    it('Given: confirmed return without reason When: cancelling Then: should use reason or No reason provided in cancellation note', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({ type: 'RETURN_CUSTOMER' });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      mockTx.movement.findUnique.mockResolvedValue({
        id: 'movement-123',
        warehouseId: 'warehouse-123',
        orgId: mockOrgId,
        lines: [],
      });

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
        // no reason provided
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      // The return.update should use the entity's original reason since request.reason is undefined
      expect(mockTx.return.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: 'Original reason', // from mock entity
          }),
        })
      );
    });

    it('Given: confirmed supplier return with source movement not in RETURNED status When: cancelling Then: should not revert source movement', async () => {
      // Arrange
      const mockReturn = createMockConfirmedReturn({
        type: 'RETURN_SUPPLIER',
        sourceMovementId: 'source-mov-123',
      });
      mockReturnRepository.findById.mockResolvedValue(mockReturn);
      setupValidationPass();

      const mockTx = createMockTx();
      mockTx.movement.findUnique.mockImplementation(async (args: unknown) => {
        const typedArgs = args as { where: { id: string } };
        if (typedArgs.where.id === 'movement-123') {
          return {
            id: 'movement-123',
            warehouseId: 'warehouse-123',
            orgId: mockOrgId,
            lines: [{ productId: 'product-1', quantity: 5, locationId: null }],
          };
        }
        if (typedArgs.where.id === 'source-mov-123') {
          return { id: 'source-mov-123', status: 'POSTED' }; // Not RETURNED
        }
        return null;
      });

      mockUnitOfWork.execute.mockImplementation(
        (async (callback: (tx: unknown) => Promise<unknown>) => {
          return callback(mockTx);
        }) as any
      );

      const request = {
        id: mockReturnId,
        orgId: mockOrgId,
        cancelledBy: 'admin-user',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      // Movement update should only be called for voiding the return movement, NOT for source movement
      const movementUpdateCalls = mockTx.movement.update.mock.calls;
      const sourceMovementUpdate = movementUpdateCalls.find(
        (call: any) => call[0]?.where?.id === 'source-mov-123'
      );
      expect(sourceMovementUpdate).toBeUndefined();
    });
  });
});
