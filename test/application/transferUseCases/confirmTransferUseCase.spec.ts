import { ConfirmTransferUseCase } from '@application/transferUseCases/confirmTransferUseCase';
import { Movement } from '@inventory/movements/domain/entities/movement.entity';
import { MovementLine } from '@inventory/movements/domain/entities/movementLine.entity';
import { MovementStatus } from '@inventory/movements/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@inventory/movements/domain/valueObjects/movementType.valueObject';
import { Quantity } from '@inventory/stock';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';

describe('ConfirmTransferUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockTransferId = 'transfer-123';
  const mockFromWarehouseId = 'warehouse-from-123';
  const mockToWarehouseId = 'warehouse-to-456';
  const mockUserId = 'user-123';
  const mockMovementId = 'movement-out-123';

  let useCase: ConfirmTransferUseCase;
  let mockTransferRepository: jest.Mocked<ITransferRepository>;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTransferRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByFromWarehouse: jest.fn(),
      findByToWarehouse: jest.fn(),
      findByStatus: jest.fn(),
      findByDateRange: jest.fn(),
      findInTransitTransfers: jest.fn(),
      findPendingTransfers: jest.fn(),
    } as jest.Mocked<ITransferRepository>;

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

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new ConfirmTransferUseCase(
      mockTransferRepository,
      mockMovementRepository,
      mockEventDispatcher
    );
  });

  describe('execute', () => {
    const createTransferLine = (): TransferLine => {
      return TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(10),
          fromLocationId: 'loc-from-1',
          toLocationId: 'loc-to-1',
        },
        'line-1',
        mockOrgId
      );
    };

    const createDraftTransferWithLines = (): Transfer => {
      const line = createTransferLine();
      return Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create('DRAFT'),
          createdBy: mockUserId,
          note: 'Test transfer',
        },
        mockTransferId,
        mockOrgId,
        [line]
      );
    };

    const createDraftTransferWithoutLines = (): Transfer => {
      return Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create('DRAFT'),
          createdBy: mockUserId,
        },
        mockTransferId,
        mockOrgId,
        []
      );
    };

    const createTransferWithStatus = (
      status: 'DRAFT' | 'IN_TRANSIT' | 'PARTIAL' | 'RECEIVED' | 'REJECTED' | 'CANCELED',
      lines: TransferLine[] = []
    ): Transfer => {
      return Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create(status),
          createdBy: mockUserId,
        },
        mockTransferId,
        mockOrgId,
        lines
      );
    };

    const createMockDraftMovement = (): Movement => {
      const movementLine = MovementLine.create(
        {
          productId: 'product-1',
          locationId: 'loc-from-1',
          quantity: Quantity.create(10),
          currency: 'COP',
        },
        mockOrgId
      );
      const movement = Movement.reconstitute(
        {
          type: MovementType.create('TRANSFER_OUT'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: mockFromWarehouseId,
          reference: `TRANSFER-${mockTransferId}`,
          reason: 'TRANSFER_OUT',
          note: 'Test transfer',
          createdBy: mockUserId,
        },
        mockMovementId,
        mockOrgId,
        [movementLine]
      );
      return movement;
    };

    const createMockPostedMovement = (): Movement => {
      const movementLine = MovementLine.create(
        {
          productId: 'product-1',
          locationId: 'loc-from-1',
          quantity: Quantity.create(10),
          currency: 'COP',
        },
        mockOrgId
      );
      return Movement.reconstitute(
        {
          type: MovementType.create('TRANSFER_OUT'),
          status: MovementStatus.create('POSTED'),
          warehouseId: mockFromWarehouseId,
          reference: `TRANSFER-${mockTransferId}`,
          reason: 'TRANSFER_OUT',
          note: 'Test transfer',
          postedAt: new Date(),
          createdBy: mockUserId,
        },
        mockMovementId,
        mockOrgId,
        [movementLine]
      );
    };

    const validRequest = {
      transferId: mockTransferId,
      orgId: mockOrgId,
    };

    it('Given: a DRAFT transfer with lines When: confirming Then: should return success result with IN_TRANSIT status', async () => {
      // Arrange
      const draftTransfer = createDraftTransferWithLines();
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const confirmedTransfer = createTransferWithStatus('IN_TRANSIT', [createTransferLine()]);
      mockTransferRepository.save.mockResolvedValue(confirmedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('confirmed successfully');
          expect(value.data.status).toBe('IN_TRANSIT');
          expect(value.data.outMovementId).toBe(mockMovementId);
          expect(value.data.fromWarehouseId).toBe(mockFromWarehouseId);
          expect(value.data.toWarehouseId).toBe(mockToWarehouseId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: a non-existent transfer When: confirming Then: should return NotFoundError', async () => {
      // Arrange
      mockTransferRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain(mockTransferId);
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
      expect(mockTransferRepository.save).not.toHaveBeenCalled();
    });

    it('Given: a RECEIVED transfer When: confirming Then: should return BusinessRuleError', async () => {
      // Arrange
      const receivedTransfer = createTransferWithStatus('RECEIVED');
      mockTransferRepository.findById.mockResolvedValue(receivedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('cannot be confirmed');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: a CANCELED transfer When: confirming Then: should return BusinessRuleError', async () => {
      // Arrange
      const canceledTransfer = createTransferWithStatus('CANCELED');
      mockTransferRepository.findById.mockResolvedValue(canceledTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('cannot be confirmed');
        }
      );
    });

    it('Given: a DRAFT transfer without lines When: confirming Then: should return BusinessRuleError', async () => {
      // Arrange
      const emptyTransfer = createDraftTransferWithoutLines();
      mockTransferRepository.findById.mockResolvedValue(emptyTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('cannot be confirmed');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: a DRAFT transfer with lines When: confirming Then: should save movement twice (draft then posted)', async () => {
      // Arrange
      const draftTransfer = createDraftTransferWithLines();
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const confirmedTransfer = createTransferWithStatus('IN_TRANSIT', [createTransferLine()]);
      mockTransferRepository.save.mockResolvedValue(confirmedTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockMovementRepository.save).toHaveBeenCalledTimes(2);
      expect(mockTransferRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: a DRAFT transfer with lines When: confirming Then: should dispatch events for both movement and transfer', async () => {
      // Arrange
      const draftTransfer = createDraftTransferWithLines();
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const confirmedTransfer = createTransferWithStatus('IN_TRANSIT', [createTransferLine()]);
      mockTransferRepository.save.mockResolvedValue(confirmedTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      // markAndDispatch called twice: once for movement events, once for transfer events
      expect(mockEventDispatcher.markAndDispatch).toHaveBeenCalledTimes(2);
    });

    it('Given: a DRAFT transfer When: confirming Then: should call findById with correct arguments', async () => {
      // Arrange
      const draftTransfer = createDraftTransferWithLines();
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const confirmedTransfer = createTransferWithStatus('IN_TRANSIT', [createTransferLine()]);
      mockTransferRepository.save.mockResolvedValue(confirmedTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockTransferRepository.findById).toHaveBeenCalledWith(mockTransferId, mockOrgId);
    });

    it('Given: a PARTIAL transfer with lines When: confirming Then: should return BusinessRuleError since PARTIAL cannot be confirmed', async () => {
      // Arrange
      const partialTransfer = createTransferWithStatus('PARTIAL', [createTransferLine()]);
      mockTransferRepository.findById.mockResolvedValue(partialTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('cannot be confirmed');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: a DRAFT transfer without note When: confirming Then: should use default note for movement', async () => {
      // Arrange
      const line = createTransferLine();
      const draftTransferNoNote = Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create('DRAFT'),
          createdBy: mockUserId,
          // no note provided - exercises the `transfer.note || 'Transfer to warehouse'` branch
        },
        mockTransferId,
        mockOrgId,
        [line]
      );
      mockTransferRepository.findById.mockResolvedValue(draftTransferNoNote);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const confirmedTransfer = createTransferWithStatus('IN_TRANSIT', [createTransferLine()]);
      mockTransferRepository.save.mockResolvedValue(confirmedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      // The movement should have been created with fallback note
      const firstSaveArg = mockMovementRepository.save.mock.calls[0][0];
      expect(firstSaveArg.note).toBe('Transfer to warehouse');
    });
  });
});
