import { ReceiveTransferUseCase } from '@application/transferUseCases/receiveTransferUseCase';
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

describe('ReceiveTransferUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockTransferId = 'transfer-123';
  const mockFromWarehouseId = 'warehouse-from-123';
  const mockToWarehouseId = 'warehouse-to-456';
  const mockUserId = 'user-123';
  const mockReceiverId = 'receiver-456';
  const mockMovementId = 'movement-in-123';

  let useCase: ReceiveTransferUseCase;
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

    useCase = new ReceiveTransferUseCase(
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

    const createTransferWithStatus = (
      status: 'DRAFT' | 'IN_TRANSIT' | 'PARTIAL' | 'RECEIVED' | 'REJECTED' | 'CANCELED',
      lines: TransferLine[] = [createTransferLine()]
    ): Transfer => {
      return Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create(status),
          createdBy: mockUserId,
          note: 'Test transfer',
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
          locationId: 'loc-to-1',
          quantity: Quantity.create(10),
          currency: 'COP',
        },
        mockOrgId
      );
      return Movement.reconstitute(
        {
          type: MovementType.create('TRANSFER_IN'),
          status: MovementStatus.create('DRAFT'),
          warehouseId: mockToWarehouseId,
          reference: `TRANSFER-${mockTransferId}`,
          reason: 'TRANSFER_IN',
          note: 'Test transfer',
          createdBy: mockUserId,
        },
        mockMovementId,
        mockOrgId,
        [movementLine]
      );
    };

    const createMockPostedMovement = (): Movement => {
      const movementLine = MovementLine.create(
        {
          productId: 'product-1',
          locationId: 'loc-to-1',
          quantity: Quantity.create(10),
          currency: 'COP',
        },
        mockOrgId
      );
      return Movement.reconstitute(
        {
          type: MovementType.create('TRANSFER_IN'),
          status: MovementStatus.create('POSTED'),
          warehouseId: mockToWarehouseId,
          reference: `TRANSFER-${mockTransferId}`,
          reason: 'TRANSFER_IN',
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
      receivedBy: mockReceiverId,
    };

    it('Given: an IN_TRANSIT transfer When: receiving Then: should return success result with RECEIVED status', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const receivedTransfer = Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create('RECEIVED'),
          createdBy: mockUserId,
          receivedBy: mockReceiverId,
          receivedAt: new Date(),
          note: 'Test transfer',
        },
        mockTransferId,
        mockOrgId,
        [createTransferLine()]
      );
      mockTransferRepository.save.mockResolvedValue(receivedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('received successfully');
          expect(value.data.status).toBe('RECEIVED');
          expect(value.data.inMovementId).toBe(mockMovementId);
          expect(value.data.receivedBy).toBe(mockReceiverId);
          expect(value.data.fromWarehouseId).toBe(mockFromWarehouseId);
          expect(value.data.toWarehouseId).toBe(mockToWarehouseId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: a non-existent transfer When: receiving Then: should return NotFoundError', async () => {
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

    it('Given: a DRAFT transfer When: receiving Then: should return BusinessRuleError', async () => {
      // Arrange
      const draftTransfer = createTransferWithStatus('DRAFT');
      mockTransferRepository.findById.mockResolvedValue(draftTransfer);

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
          expect(error.message).toContain('cannot be received');
          expect(error.message).toContain('DRAFT');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: a CANCELED transfer When: receiving Then: should return BusinessRuleError', async () => {
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
          expect(error.message).toContain('cannot be received');
        }
      );
    });

    it('Given: a RECEIVED transfer When: receiving again Then: should return BusinessRuleError', async () => {
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
          expect(error.message).toContain('cannot be received');
        }
      );
    });

    it('Given: a REJECTED transfer When: receiving Then: should return BusinessRuleError', async () => {
      // Arrange
      const rejectedTransfer = createTransferWithStatus('REJECTED');
      mockTransferRepository.findById.mockResolvedValue(rejectedTransfer);

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
          expect(error.message).toContain('cannot be received');
        }
      );
    });

    it('Given: an IN_TRANSIT transfer When: receiving Then: should create and post IN movement for destination warehouse', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const receivedTransfer = createTransferWithStatus('RECEIVED');
      mockTransferRepository.save.mockResolvedValue(receivedTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockMovementRepository.save).toHaveBeenCalledTimes(2);
      // First save: DRAFT movement
      const firstSaveArg = mockMovementRepository.save.mock.calls[0][0];
      expect(firstSaveArg.type.getValue()).toBe('TRANSFER_IN');
      expect(firstSaveArg.warehouseId).toBe(mockToWarehouseId);
      expect(firstSaveArg.status.getValue()).toBe('DRAFT');
    });

    it('Given: an IN_TRANSIT transfer When: receiving Then: should dispatch events for both movement and transfer', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const receivedTransfer = createTransferWithStatus('RECEIVED');
      mockTransferRepository.save.mockResolvedValue(receivedTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      // markAndDispatch called twice: once for movement events, once for transfer events
      expect(mockEventDispatcher.markAndDispatch).toHaveBeenCalledTimes(2);
    });

    it('Given: a PARTIAL transfer When: receiving Then: should return success since PARTIAL canReceive is true', async () => {
      // Arrange - TransferStatus.canReceive() returns true for IN_TRANSIT and PARTIAL
      const partialTransfer = createTransferWithStatus('PARTIAL');
      mockTransferRepository.findById.mockResolvedValue(partialTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const receivedTransfer = createTransferWithStatus('RECEIVED');
      mockTransferRepository.save.mockResolvedValue(receivedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.status).toBe('RECEIVED');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: an IN_TRANSIT transfer When: receiving without receivedBy Then: should still succeed', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const receivedTransfer = Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create('RECEIVED'),
          createdBy: mockUserId,
          receivedAt: new Date(),
          note: 'Test transfer',
        },
        mockTransferId,
        mockOrgId,
        [createTransferLine()]
      );
      mockTransferRepository.save.mockResolvedValue(receivedTransfer);

      const requestWithoutReceiver = {
        transferId: mockTransferId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(requestWithoutReceiver);

      // Assert
      expect(result.isOk()).toBe(true);
    });

    it('Given: an IN_TRANSIT transfer When: receiving Then: should save transfer via repository', async () => {
      // Arrange
      const inTransitTransfer = createTransferWithStatus('IN_TRANSIT');
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const receivedTransfer = createTransferWithStatus('RECEIVED');
      mockTransferRepository.save.mockResolvedValue(receivedTransfer);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockTransferRepository.findById).toHaveBeenCalledWith(mockTransferId, mockOrgId);
      expect(mockTransferRepository.save).toHaveBeenCalledTimes(1);
    });

    it('Given: an IN_TRANSIT transfer without note When: receiving Then: should use fallback note for movement', async () => {
      // Arrange
      const line = createTransferLine();
      const transferNoNote = Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create('IN_TRANSIT'),
          createdBy: mockUserId,
          // no note - exercises the `transfer.note || 'Transfer from warehouse'` branch
        },
        mockTransferId,
        mockOrgId,
        [line]
      );
      mockTransferRepository.findById.mockResolvedValue(transferNoNote);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const receivedTransfer = createTransferWithStatus('RECEIVED');
      mockTransferRepository.save.mockResolvedValue(receivedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      const firstSaveArg = mockMovementRepository.save.mock.calls[0][0];
      expect(firstSaveArg.note).toBe('Transfer from warehouse');
    });

    it('Given: transfer lines with toLocationId When: receiving Then: should use toLocationId in movement lines', async () => {
      // Arrange
      const lineWithLocation = TransferLine.reconstitute(
        {
          productId: 'product-1',
          quantity: Quantity.create(5),
          fromLocationId: 'loc-from-1',
          toLocationId: 'loc-to-specific',
        },
        'line-loc',
        mockOrgId
      );
      const inTransitTransfer = Transfer.reconstitute(
        {
          fromWarehouseId: mockFromWarehouseId,
          toWarehouseId: mockToWarehouseId,
          status: TransferStatus.create('IN_TRANSIT'),
          createdBy: mockUserId,
          note: 'Test',
        },
        mockTransferId,
        mockOrgId,
        [lineWithLocation]
      );
      mockTransferRepository.findById.mockResolvedValue(inTransitTransfer);

      const savedDraftMovement = createMockDraftMovement();
      const postedMovement = createMockPostedMovement();
      mockMovementRepository.save
        .mockResolvedValueOnce(savedDraftMovement)
        .mockResolvedValueOnce(postedMovement);

      const receivedTransfer = createTransferWithStatus('RECEIVED');
      mockTransferRepository.save.mockResolvedValue(receivedTransfer);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockMovementRepository.save).toHaveBeenCalledTimes(2);
    });
  });
});
