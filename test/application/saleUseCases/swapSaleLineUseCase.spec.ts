import { SwapSaleLineUseCase } from '@application/saleUseCases/swapSaleLineUseCase';
import { UnitOfWork } from '@infrastructure/database/unitOfWork.service';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import {
  BusinessRuleError,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IStockRepository } from '@stock/domain/repositories/stockRepository.interface';

describe('SwapSaleLineUseCase', () => {
  const mockOrgId = 'org-123';
  const mockSaleId = 'sale-123';
  const mockLineId = 'line-123';
  const mockWarehouseId = 'warehouse-1';

  let useCase: SwapSaleLineUseCase;
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
    } as unknown as jest.Mocked<ISaleRepository>;

    mockStockRepository = {
      getStockQuantity: jest.fn(),
      getStockWithCost: jest.fn(),
      updateStock: jest.fn(),
      incrementStock: jest.fn(),
      decrementStock: jest.fn(),
    } as unknown as jest.Mocked<IStockRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    mockUnitOfWork = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<UnitOfWork>;

    useCase = new SwapSaleLineUseCase(
      mockSaleRepository,
      mockStockRepository,
      mockEventDispatcher,
      mockUnitOfWork
    );
  });

  const createMockSale = (
    status: 'CONFIRMED' | 'PICKING' | 'DRAFT' | 'COMPLETED' = 'CONFIRMED',
    lines: SaleLine[] = []
  ) => {
    const defaultLines =
      lines.length > 0
        ? lines
        : [
            SaleLine.reconstitute(
              {
                productId: 'product-original',
                quantity: Quantity.create(5, 2),
                salePrice: SalePrice.create(100, 'COP'),
              },
              mockLineId,
              mockOrgId
            ),
          ];

    return Sale.reconstitute(
      {
        saleNumber: SaleNumber.fromString('SALE-2025-001'),
        status: SaleStatus.create(status),
        warehouseId: mockWarehouseId,
        confirmedAt: status !== 'DRAFT' ? new Date() : undefined,
        createdBy: 'user-creator',
      },
      mockSaleId,
      mockOrgId,
      defaultLines
    );
  };

  const baseRequest = {
    saleId: mockSaleId,
    lineId: mockLineId,
    replacementProductId: 'product-replacement',
    swapQuantity: 5,
    sourceWarehouseId: mockWarehouseId,
    pricingStrategy: 'KEEP_ORIGINAL' as const,
    performedBy: 'user-123',
    orgId: mockOrgId,
  };

  describe('Happy path', () => {
    it('Given: CONFIRMED sale with valid line When: full swap Then: should succeed', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-1',
            returnMovementId: 'mov-ret-1',
            deductMovementId: 'mov-ded-1',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute(baseRequest);

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.swapId).toBe('swap-1');
          expect(value.data.isPartial).toBe(false);
          expect(value.data.isCrossWarehouse).toBe(false);
          expect(value.data.originalProductId).toBe('product-original');
          expect(value.data.replacementProductId).toBe('product-replacement');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: CONFIRMED sale When: partial swap (2 of 5) Then: should succeed with isPartial=true', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-2',
            returnMovementId: 'mov-ret-2',
            deductMovementId: 'mov-ded-2',
            newLineId: 'line-new-1',
          }) as any
      );

      const result = await useCase.execute({ ...baseRequest, swapQuantity: 2 });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.isPartial).toBe(true);
          expect(value.data.newLineId).toBe('line-new-1');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: PICKING state sale When: swap Then: should succeed', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('PICKING'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-3',
            returnMovementId: 'mov-ret-3',
            deductMovementId: 'mov-ded-3',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute(baseRequest);

      expect(result.isOk()).toBe(true);
    });
  });

  describe('Error cases', () => {
    it('Given: non-existent sale When: swap Then: should return NotFoundError', async () => {
      mockSaleRepository.findById.mockResolvedValue(null);

      const result = await useCase.execute(baseRequest);

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

    it('Given: DRAFT sale When: swap Then: should return BusinessRuleError', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('DRAFT'));

      const result = await useCase.execute(baseRequest);

      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('Cannot swap line');
        }
      );
    });

    it('Given: COMPLETED sale When: swap Then: should return BusinessRuleError', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('COMPLETED'));

      const result = await useCase.execute(baseRequest);

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

    it('Given: non-existent line When: swap Then: should return BusinessRuleError', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));

      const result = await useCase.execute({ ...baseRequest, lineId: 'non-existent' });

      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('not found');
        }
      );
    });

    it('Given: swap quantity exceeds line quantity When: swap Then: should return BusinessRuleError', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));

      const result = await useCase.execute({ ...baseRequest, swapQuantity: 10 });

      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('exceeds');
        }
      );
    });

    it('Given: insufficient stock for replacement When: swap Then: should return BusinessRuleError', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(2, 2));

      const result = await useCase.execute(baseRequest);

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

    it('Given: InsufficientStockError during transaction When: swap Then: should return BusinessRuleError', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockRejectedValue(
        new InsufficientStockError('product-replacement', 'warehouse-1', 5)
      );

      const result = await useCase.execute(baseRequest);

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
  });

  describe('Pricing strategy', () => {
    it('Given: KEEP_ORIGINAL strategy When: swap Then: should use original price', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-pricing-1',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute({
        ...baseRequest,
        pricingStrategy: 'KEEP_ORIGINAL',
      });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.replacementSalePrice).toBe(100);
          expect(value.data.pricingStrategy).toBe('KEEP_ORIGINAL');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: NEW_PRICE without price When: swap Then: should return ValidationError', async () => {
      const result = await useCase.execute({
        ...baseRequest,
        pricingStrategy: 'NEW_PRICE',
        newSalePrice: undefined,
      });

      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('newSalePrice is required');
        }
      );
    });

    it('Given: NEW_PRICE with price When: swap Then: should use new price', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-pricing-2',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute({
        ...baseRequest,
        pricingStrategy: 'NEW_PRICE',
        newSalePrice: 150,
      });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.replacementSalePrice).toBe(150);
          expect(value.data.pricingStrategy).toBe('NEW_PRICE');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });

  describe('Cross-warehouse', () => {
    it('Given: different source warehouse When: swap Then: should set isCrossWarehouse=true', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-cross',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute({
        ...baseRequest,
        sourceWarehouseId: 'warehouse-other',
      });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.isCrossWarehouse).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: same source warehouse When: swap Then: should set isCrossWarehouse=false', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-same',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute(baseRequest);

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.isCrossWarehouse).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });

  describe('Event dispatching', () => {
    it('Given: successful swap When: post-commit Then: should dispatch SaleLineSwapped event', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-event',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      await useCase.execute(baseRequest);

      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
      const dispatchedEvents = mockEventDispatcher.dispatchEvents.mock.calls[0][0];
      expect(dispatchedEvents).toHaveLength(1);
      expect(dispatchedEvents[0].eventName).toBe('SaleLineSwapped');
    });
  });

  describe('Additional branch coverage', () => {
    it('Given: NEW_PRICE with custom currency When: swap Then: should use provided currency', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-curr',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute({
        ...baseRequest,
        pricingStrategy: 'NEW_PRICE',
        newSalePrice: 200,
        currency: 'USD',
      });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.replacementSalePrice).toBe(200);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-InsufficientStockError during transaction When: swap Then: should rethrow error', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockRejectedValue(new Error('Unexpected DB error'));

      await expect(useCase.execute(baseRequest)).rejects.toThrow('Unexpected DB error');
    });

    it('Given: swap with reason When: swap Then: should include reason in response', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-reason',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute({
        ...baseRequest,
        reason: 'Customer requested different product',
      });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.swapId).toBe('swap-reason');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: swap quantity equal to line quantity When: full swap Then: isPartial should be false', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-full',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      // Original line quantity is 5, swap 5 = full swap
      const result = await useCase.execute({ ...baseRequest, swapQuantity: 5 });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.isPartial).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: swap quantity of 1 out of 5 When: partial swap Then: isPartial should be true', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-partial-1',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: 'line-new-1',
          }) as any
      );

      const result = await useCase.execute({ ...baseRequest, swapQuantity: 1 });

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.isPartial).toBe(true);
          expect(value.data.swapQuantity).toBe(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: zero swap quantity When: swap Then: should return BusinessRuleError from validation', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));

      const result = await useCase.execute({ ...baseRequest, swapQuantity: 0 });

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

    it('Given: successful full swap When: response Then: should include originalSalePrice', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-price',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute(baseRequest);

      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.originalSalePrice).toBe(100);
          expect(value.data.replacementSalePrice).toBe(100);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: InsufficientStockError without availableQuantity during transaction When: swap Then: should show unknown in error', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockRejectedValue(
        new InsufficientStockError('product-replacement', 'warehouse-1', 5, undefined)
      );

      const result = await useCase.execute(baseRequest);

      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('available unknown');
        }
      );
    });

    it('Given: full swap with UnitOfWork callback When: executing Then: should invoke partial=false branch in transaction', async () => {
      const sale = createMockSale('CONFIRMED');
      mockSaleRepository.findById.mockResolvedValue(sale);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));

      const mockTx = {
        $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
        movement: {
          create: jest
            .fn<any>()
            .mockResolvedValueOnce({ id: 'mov-ret' })
            .mockResolvedValueOnce({ id: 'mov-ded' }),
        },
        movementLine: {
          create: jest.fn<any>().mockResolvedValue({}),
        },
        saleLine: {
          update: jest.fn<any>().mockResolvedValue({}),
          create: jest.fn<any>().mockResolvedValue({ id: 'new-line-1' }),
        },
        saleLineSwap: {
          create: jest.fn<any>().mockResolvedValue({ id: 'swap-tx-1' }),
        },
      };

      mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await useCase.execute({ ...baseRequest, swapQuantity: 5 });

      expect(result.isOk()).toBe(true);
      // Full swap (5 out of 5): saleLine.update should be called (not saleLine.create for new line)
      expect(mockTx.saleLine.update).toHaveBeenCalled();
    });

    it('Given: partial swap with UnitOfWork callback When: executing Then: should invoke partial=true branch creating new line', async () => {
      const sale = createMockSale('CONFIRMED');
      mockSaleRepository.findById.mockResolvedValue(sale);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));

      const mockTx = {
        $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
        movement: {
          create: jest
            .fn<any>()
            .mockResolvedValueOnce({ id: 'mov-ret' })
            .mockResolvedValueOnce({ id: 'mov-ded' }),
        },
        movementLine: {
          create: jest.fn<any>().mockResolvedValue({}),
        },
        saleLine: {
          update: jest.fn<any>().mockResolvedValue({}),
          create: jest.fn<any>().mockResolvedValue({ id: 'new-line-partial' }),
        },
        saleLineSwap: {
          create: jest.fn<any>().mockResolvedValue({ id: 'swap-tx-2' }),
        },
      };

      mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await useCase.execute({ ...baseRequest, swapQuantity: 2 });

      expect(result.isOk()).toBe(true);
      // Partial swap (2 out of 5): both saleLine.update and saleLine.create should be called
      expect(mockTx.saleLine.update).toHaveBeenCalled();
      expect(mockTx.saleLine.create).toHaveBeenCalled();
    });

    it('Given: deductResult is 0 in transaction When: executing Then: should throw InsufficientStockError', async () => {
      const sale = createMockSale('CONFIRMED');
      mockSaleRepository.findById.mockResolvedValue(sale);
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));

      const mockTx = {
        $executeRaw: jest
          .fn<() => Promise<number>>()
          .mockResolvedValueOnce(1) // return stock update
          .mockResolvedValueOnce(0) // insert if not exists
          .mockResolvedValueOnce(0), // deduct fails (returns 0)
        movement: {
          create: jest.fn<any>().mockResolvedValue({ id: 'mov-1' }),
        },
        movementLine: {
          create: jest.fn<any>().mockResolvedValue({}),
        },
        saleLine: {
          update: jest.fn<any>().mockResolvedValue({}),
        },
        saleLineSwap: {
          create: jest.fn<any>().mockResolvedValue({ id: 'swap-1' }),
        },
      };

      mockUnitOfWork.execute.mockImplementation(async (callback: any) => {
        return callback(mockTx);
      });

      const result = await useCase.execute(baseRequest);

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

    it('Given: NEW_PRICE with no currency When: swap Then: should default to original currency', async () => {
      mockSaleRepository.findById.mockResolvedValue(createMockSale('CONFIRMED'));
      mockStockRepository.getStockQuantity.mockResolvedValue(Quantity.create(10, 2));
      mockUnitOfWork.execute.mockImplementation(
        async () =>
          ({
            swapId: 'swap-no-currency',
            returnMovementId: 'mov-1',
            deductMovementId: 'mov-2',
            newLineId: undefined,
          }) as any
      );

      const result = await useCase.execute({
        ...baseRequest,
        pricingStrategy: 'NEW_PRICE',
        newSalePrice: 200,
        // no currency provided - should default to original line currency
      });

      expect(result.isOk()).toBe(true);
    });
  });
});
