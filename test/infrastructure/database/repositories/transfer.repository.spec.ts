import { PrismaService } from '@infrastructure/database/prisma.service';
import { PrismaTransferRepository } from '@infrastructure/database/repositories/transfer.repository';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

describe('PrismaTransferRepository', () => {
  let repository: PrismaTransferRepository;

  type MockFn = jest.Mock<unknown, unknown[]>;

  let mockPrismaService: {
    transfer: Record<string, MockFn>;
    transferLine: Record<string, MockFn>;
    $transaction: MockFn;
  };

  const mockLineData = {
    id: 'line-123',
    transferId: 'transfer-123',
    productId: 'product-123',
    quantity: 10,
    fromLocationId: 'location-from',
    toLocationId: 'location-to',
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTransferData = {
    id: 'transfer-123',
    fromWarehouseId: 'warehouse-from',
    toWarehouseId: 'warehouse-to',
    status: 'DRAFT',
    note: 'Test transfer',
    initiatedAt: null,
    receivedAt: null,
    createdBy: 'user-123',
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    lines: [mockLineData],
  };

  beforeEach(() => {
    mockPrismaService = {
      transfer: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      transferLine: {
        createMany: jest.fn(),
        deleteMany: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback(mockPrismaService)
      ),
    };

    repository = new PrismaTransferRepository(mockPrismaService as unknown as PrismaService);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return transfer with lines', async () => {
      // Arrange
      mockPrismaService.transfer.findFirst.mockResolvedValue(mockTransferData);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('transfer-123');
      expect(result?.fromWarehouseId).toBe('warehouse-from');
      expect(result?.toWarehouseId).toBe('warehouse-to');
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.transfer.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: database error When: finding by id Then: should throw error', async () => {
      // Arrange
      mockPrismaService.transfer.findFirst.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(repository.findById('transfer-123', 'org-123')).rejects.toThrow(
        'Database error'
      );
    });

    it('Given: transfer with non-DRAFT status When: finding Then: should restore status correctly', async () => {
      // Arrange
      const inTransitTransfer = {
        ...mockTransferData,
        status: 'IN_TRANSIT',
        initiatedAt: new Date(),
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(inTransitTransfer);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result?.status.getValue()).toBe('IN_TRANSIT');
    });
  });

  describe('findAll', () => {
    it('Given: transfers exist When: finding all Then: should return all transfers', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockResolvedValue([mockTransferData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('transfer-123');
    });

    it('Given: no transfers When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: database error When: finding all Then: should throw error', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockRejectedValue(new Error('FindAll failed'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('FindAll failed');
    });
  });

  describe('exists', () => {
    it('Given: transfer exists When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.transfer.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('transfer-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: transfer does not exist When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.transfer.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: database error When: checking existence Then: should throw error', async () => {
      // Arrange
      mockPrismaService.transfer.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(repository.exists('transfer-123', 'org-123')).rejects.toThrow('Count failed');
    });
  });

  describe('save', () => {
    it('Given: existing transfer When: saving Then: should update transfer', async () => {
      // Arrange
      const line = TransferLine.reconstitute(
        {
          productId: 'product-123',
          quantity: Quantity.create(10, 0),
          fromLocationId: 'location-from',
          toLocationId: 'location-to',
        },
        'line-123',
        'org-123'
      );
      const transfer = Transfer.reconstitute(
        {
          fromWarehouseId: 'warehouse-from',
          toWarehouseId: 'warehouse-to',
          status: TransferStatus.create('DRAFT'),
          createdBy: 'user-123',
          note: 'Updated note',
        },
        'transfer-123',
        'org-123'
      );
      transfer.addLine(line);

      mockPrismaService.transfer.findUnique.mockResolvedValueOnce(mockTransferData);
      mockPrismaService.transfer.update.mockResolvedValue(mockTransferData);
      mockPrismaService.transferLine.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.transferLine.createMany.mockResolvedValue({ count: 1 });
      mockPrismaService.transfer.findUnique.mockResolvedValueOnce(mockTransferData);

      // Act
      const result = await repository.save(transfer);

      // Assert
      expect(result).not.toBeNull();
    });

    it('Given: new transfer When: saving Then: should create transfer', async () => {
      // Arrange
      const transfer = Transfer.create(
        {
          fromWarehouseId: 'warehouse-from',
          toWarehouseId: 'warehouse-to',
          status: TransferStatus.create('DRAFT'),
          createdBy: 'user-123',
        },
        'org-123'
      );

      // First findUnique call returns null (transfer doesn't exist)
      // Second findUnique call returns the created transfer with lines
      mockPrismaService.transfer.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockTransferData);
      mockPrismaService.transfer.create.mockResolvedValue(mockTransferData);
      mockPrismaService.transferLine.createMany.mockResolvedValue({ count: 0 });

      // Act
      const result = await repository.save(transfer);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.transfer.create).toHaveBeenCalled();
    });

    it('Given: transfer with id but not in DB When: saving Then: should create new', async () => {
      // Arrange
      const transfer = Transfer.reconstitute(
        {
          fromWarehouseId: 'warehouse-from',
          toWarehouseId: 'warehouse-to',
          status: TransferStatus.create('DRAFT'),
          createdBy: 'user-123',
        },
        'new-transfer-id',
        'org-123'
      );

      mockPrismaService.transfer.findUnique.mockResolvedValueOnce(null);
      mockPrismaService.transfer.create.mockResolvedValue({
        ...mockTransferData,
        id: 'new-transfer-id',
      });
      mockPrismaService.transfer.findUnique.mockResolvedValueOnce({
        ...mockTransferData,
        id: 'new-transfer-id',
      });

      // Act
      const result = await repository.save(transfer);

      // Assert
      expect(result).not.toBeNull();
    });

    it('Given: database error When: saving Then: should throw error', async () => {
      // Arrange
      const transfer = Transfer.reconstitute(
        {
          fromWarehouseId: 'warehouse-from',
          toWarehouseId: 'warehouse-to',
          status: TransferStatus.create('DRAFT'),
          createdBy: 'user-123',
        },
        'transfer-123',
        'org-123'
      );

      mockPrismaService.$transaction.mockRejectedValue(new Error('Transaction failed'));

      // Act & Assert
      await expect(repository.save(transfer)).rejects.toThrow('Transaction failed');
    });
  });

  describe('delete', () => {
    it('Given: existing transfer When: deleting Then: should delete transfer and lines', async () => {
      // Arrange
      mockPrismaService.transferLine.deleteMany.mockResolvedValue({ count: 1 });
      mockPrismaService.transfer.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('transfer-123', 'org-123');

      // Assert
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });

    it('Given: database error When: deleting Then: should throw error', async () => {
      // Arrange
      mockPrismaService.$transaction.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('transfer-123', 'org-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('findByFromWarehouse', () => {
    it('Given: transfers from warehouse exist When: finding Then: should return them', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockResolvedValue([mockTransferData]);

      // Act
      const result = await repository.findByFromWarehouse('warehouse-from', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].fromWarehouseId).toBe('warehouse-from');
    });

    it('Given: database error When: finding by from warehouse Then: should throw error', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockRejectedValue(
        new Error('From warehouse query failed')
      );

      // Act & Assert
      await expect(repository.findByFromWarehouse('warehouse-from', 'org-123')).rejects.toThrow(
        'From warehouse query failed'
      );
    });
  });

  describe('findByToWarehouse', () => {
    it('Given: transfers to warehouse exist When: finding Then: should return them', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockResolvedValue([mockTransferData]);

      // Act
      const result = await repository.findByToWarehouse('warehouse-to', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].toWarehouseId).toBe('warehouse-to');
    });

    it('Given: database error When: finding by to warehouse Then: should throw error', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockRejectedValue(new Error('To warehouse query failed'));

      // Act & Assert
      await expect(repository.findByToWarehouse('warehouse-to', 'org-123')).rejects.toThrow(
        'To warehouse query failed'
      );
    });
  });

  describe('findByStatus', () => {
    it('Given: transfers with status exist When: finding Then: should return them', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockResolvedValue([mockTransferData]);

      // Act
      const result = await repository.findByStatus('DRAFT', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding by status Then: should throw error', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockRejectedValue(new Error('Status query failed'));

      // Act & Assert
      await expect(repository.findByStatus('DRAFT', 'org-123')).rejects.toThrow(
        'Status query failed'
      );
    });
  });

  describe('findByDateRange', () => {
    it('Given: transfers in date range When: finding Then: should return them', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');
      mockPrismaService.transfer.findMany.mockResolvedValue([mockTransferData]);

      // Act
      const result = await repository.findByDateRange(startDate, endDate, 'org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding by date range Then: should throw error', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockRejectedValue(new Error('Date range query failed'));

      // Act & Assert
      await expect(repository.findByDateRange(new Date(), new Date(), 'org-123')).rejects.toThrow(
        'Date range query failed'
      );
    });
  });

  describe('findInTransitTransfers', () => {
    it('Given: in-transit transfers exist When: finding Then: should return them', async () => {
      // Arrange
      const inTransitTransfer = { ...mockTransferData, status: 'IN_TRANSIT' };
      mockPrismaService.transfer.findMany.mockResolvedValue([inTransitTransfer]);

      // Act
      const result = await repository.findInTransitTransfers('org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding in-transit Then: should throw error', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockRejectedValue(new Error('In-transit query failed'));

      // Act & Assert
      await expect(repository.findInTransitTransfers('org-123')).rejects.toThrow(
        'In-transit query failed'
      );
    });
  });

  describe('findPendingTransfers', () => {
    it('Given: pending transfers exist When: finding Then: should return them', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockResolvedValue([mockTransferData]);

      // Act
      const result = await repository.findPendingTransfers('org-123');

      // Assert
      expect(result).toHaveLength(1);
    });

    it('Given: database error When: finding pending Then: should throw error', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockRejectedValue(new Error('Pending query failed'));

      // Act & Assert
      await expect(repository.findPendingTransfers('org-123')).rejects.toThrow(
        'Pending query failed'
      );
    });
  });

  describe('mapToEntity edge cases', () => {
    it('Given: transfer with null locations When: mapping Then: should handle nulls', async () => {
      // Arrange
      const transferWithNullLocations = {
        ...mockTransferData,
        lines: [{ ...mockLineData, fromLocationId: null, toLocationId: null }],
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(transferWithNullLocations);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
    });

    it('Given: transfer with RECEIVED status When: mapping Then: should restore dates', async () => {
      // Arrange
      const receivedTransfer = {
        ...mockTransferData,
        status: 'RECEIVED',
        initiatedAt: new Date(),
        receivedAt: new Date(),
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(receivedTransfer);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result?.status.getValue()).toBe('RECEIVED');
    });

    it('Given: transfer with DRAFT status and null note When: mapping Then: should handle null note', async () => {
      // Arrange
      const transferNullNote = {
        ...mockTransferData,
        note: null,
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(transferNullNote);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.note).toBeUndefined();
    });

    it('Given: transfer with CANCELED status When: mapping Then: should restore CANCELED status', async () => {
      // Arrange
      const canceledTransfer = {
        ...mockTransferData,
        status: 'CANCELED',
        initiatedAt: null,
        receivedAt: null,
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(canceledTransfer);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result?.status.getValue()).toBe('CANCELED');
    });

    it('Given: transfer with REJECTED status When: mapping Then: should restore REJECTED status', async () => {
      // Arrange
      const rejectedTransfer = {
        ...mockTransferData,
        status: 'REJECTED',
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(rejectedTransfer);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result?.status.getValue()).toBe('REJECTED');
    });

    it('Given: transfer with PARTIAL status When: mapping Then: should restore PARTIAL status', async () => {
      // Arrange
      const partialTransfer = {
        ...mockTransferData,
        status: 'PARTIAL',
        initiatedAt: new Date(),
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(partialTransfer);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result?.status.getValue()).toBe('PARTIAL');
    });

    it('Given: transfer with no lines When: mapping Then: should have empty lines', async () => {
      // Arrange
      const transferNoLines = {
        ...mockTransferData,
        lines: [],
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(transferNoLines);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.getLines()).toHaveLength(0);
    });

    it('Given: transfer with multiple lines When: mapping Then: should include all lines', async () => {
      // Arrange
      const transferMultipleLines = {
        ...mockTransferData,
        lines: [
          mockLineData,
          {
            ...mockLineData,
            id: 'line-456',
            productId: 'product-456',
            quantity: 20,
            fromLocationId: null,
            toLocationId: null,
          },
        ],
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(transferMultipleLines);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.getLines()).toHaveLength(2);
    });

    it('Given: transfer with receivedBy When: mapping Then: should include receivedBy', async () => {
      // Arrange
      const transferWithReceivedBy = {
        ...mockTransferData,
        status: 'RECEIVED',
        receivedBy: 'user-receiver',
        receivedAt: new Date(),
        initiatedAt: new Date(),
      };
      mockPrismaService.transfer.findFirst.mockResolvedValue(transferWithReceivedBy);

      // Act
      const result = await repository.findById('transfer-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.receivedBy).toBe('user-receiver');
    });
  });

  describe('findByStatus - comma-separated statuses', () => {
    it('Given: comma-separated statuses When: finding Then: should use IN filter', async () => {
      // Arrange
      mockPrismaService.transfer.findMany.mockResolvedValue([mockTransferData]);

      // Act
      const result = await repository.findByStatus('DRAFT, IN_TRANSIT', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.transfer.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['DRAFT', 'IN_TRANSIT'] },
          }),
        })
      );
    });
  });

  describe('findById - non-Error exception', () => {
    it('Given: non-Error thrown When: finding by id Then: should log and rethrow', async () => {
      // Arrange
      mockPrismaService.transfer.findFirst.mockRejectedValue('string error');

      // Act & Assert
      await expect(repository.findById('transfer-123', 'org-123')).rejects.toBe('string error');
    });
  });

  describe('save - completeTransfer not found', () => {
    it('Given: transaction where final findUnique returns null When: saving Then: should throw error', async () => {
      // Arrange
      const transfer = Transfer.reconstitute(
        {
          fromWarehouseId: 'warehouse-from',
          toWarehouseId: 'warehouse-to',
          status: TransferStatus.create('DRAFT'),
          createdBy: 'user-123',
        },
        'transfer-123',
        'org-123'
      );

      mockPrismaService.transfer.findUnique
        .mockResolvedValueOnce(mockTransferData) // exists
        .mockResolvedValueOnce(null); // final findUnique returns null
      mockPrismaService.transfer.update.mockResolvedValue(mockTransferData);
      mockPrismaService.transferLine.deleteMany.mockResolvedValue({ count: 0 });

      // Act & Assert
      await expect(repository.save(transfer)).rejects.toThrow('Failed to retrieve saved transfer');
    });
  });
});
