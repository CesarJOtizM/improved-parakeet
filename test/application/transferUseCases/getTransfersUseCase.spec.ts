import { GetTransfersUseCase } from '@application/transferUseCases/getTransfersUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('GetTransfersUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetTransfersUseCase;
  let mockTransferRepository: jest.Mocked<ITransferRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;

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

    mockPrisma = {
      warehouse: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetTransfersUseCase(mockTransferRepository, mockPrisma);
  });

  describe('execute', () => {
    const createMockTransfer = () => {
      return Transfer.create(
        {
          fromWarehouseId: 'warehouse-from-123',
          toWarehouseId: 'warehouse-to-123',
          status: TransferStatus.create('DRAFT'),
          createdBy: 'user-123',
        },
        mockOrgId
      );
    };

    const createTransferWithDates = ({
      fromWarehouseId = 'warehouse-from-123',
      toWarehouseId = 'warehouse-to-123',
      status = 'DRAFT',
      initiatedAt,
      receivedAt,
    }: {
      fromWarehouseId?: string;
      toWarehouseId?: string;
      status?: 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'REJECTED' | 'CANCELED' | 'PARTIAL';
      initiatedAt?: Date;
      receivedAt?: Date;
    }) => {
      return Transfer.reconstitute(
        {
          fromWarehouseId,
          toWarehouseId,
          status: TransferStatus.create(status),
          createdBy: 'user-123',
          initiatedAt,
          receivedAt,
        },
        `transfer-${fromWarehouseId}-${toWarehouseId}`,
        mockOrgId
      );
    };

    it('Given: valid request When: getting transfers Then: should return paginated transfers', async () => {
      // Arrange
      const mockTransfers = [createMockTransfer(), createMockTransfer()];
      mockTransferRepository.findAll.mockResolvedValue(mockTransfers);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Transfers retrieved successfully');
          expect(value.pagination).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with status filter When: getting transfers Then: should return filtered transfers', async () => {
      // Arrange
      const mockTransfers = [createMockTransfer()];
      mockTransferRepository.findByStatus.mockResolvedValue(mockTransfers);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'PENDING',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockTransferRepository.findByStatus).toHaveBeenCalledWith('PENDING', mockOrgId);
    });

    it('Given: request with from/to filters When: getting transfers Then: should apply additional filters', async () => {
      // Arrange
      const mockTransfers = [
        createTransferWithDates({
          fromWarehouseId: 'warehouse-from-123',
          toWarehouseId: 'warehouse-to-123',
          status: 'IN_TRANSIT',
          initiatedAt: new Date('2024-01-05T10:00:00.000Z'),
        }),
        createTransferWithDates({
          fromWarehouseId: 'warehouse-from-123',
          toWarehouseId: 'warehouse-to-999',
          status: 'DRAFT',
          initiatedAt: new Date('2024-01-04T10:00:00.000Z'),
        }),
      ];

      mockTransferRepository.findByFromWarehouse.mockResolvedValue(mockTransfers);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        fromWarehouseId: 'warehouse-from-123',
        toWarehouseId: 'warehouse-to-123',
        status: 'IN_TRANSIT',
        sortBy: 'initiatedAt',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].toWarehouseId).toBe('warehouse-to-123');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: date range filter When: getting transfers Then: should use date range query and handle empty list', async () => {
      // Arrange
      mockTransferRepository.findByDateRange.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-01-31T23:59:59.999Z'),
        sortBy: 'receivedAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockTransferRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: sortBy status When: getting transfers Then: should sort by status value', async () => {
      // Arrange
      const transferDraft = createTransferWithDates({
        fromWarehouseId: 'wh-a',
        toWarehouseId: 'wh-b',
        status: 'DRAFT',
      });
      const transferInTransit = createTransferWithDates({
        fromWarehouseId: 'wh-c',
        toWarehouseId: 'wh-d',
        status: 'IN_TRANSIT',
        initiatedAt: new Date(),
      });
      mockTransferRepository.findAll.mockResolvedValue([transferInTransit, transferDraft]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'status',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          // DRAFT < IN_TRANSIT alphabetically
          expect(value.data[0].status).toBe('DRAFT');
          expect(value.data[1].status).toBe('IN_TRANSIT');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy createdAt When: getting transfers Then: should sort by createdAt', async () => {
      // Arrange
      const olderTransfer = createTransferWithDates({
        fromWarehouseId: 'wh-old',
        toWarehouseId: 'wh-b',
        status: 'DRAFT',
      });
      const newerTransfer = createTransferWithDates({
        fromWarehouseId: 'wh-new',
        toWarehouseId: 'wh-d',
        status: 'DRAFT',
      });
      mockTransferRepository.findAll.mockResolvedValue([olderTransfer, newerTransfer]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy unknown field When: getting transfers Then: should fallback to createdAt sort', async () => {
      // Arrange
      const transfer1 = createTransferWithDates({
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
        status: 'DRAFT',
      });
      const transfer2 = createTransferWithDates({
        fromWarehouseId: 'wh-3',
        toWarehouseId: 'wh-4',
        status: 'DRAFT',
      });
      mockTransferRepository.findAll.mockResolvedValue([transfer1, transfer2]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'nonExistentField',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: warehouses exist When: getting transfers Then: should enrich with warehouse names', async () => {
      // Arrange
      const mockTransfers = [createMockTransfer()];
      mockTransferRepository.findAll.mockResolvedValue(mockTransfers);

      (mockPrisma.warehouse.findMany as jest.Mock).mockResolvedValue([
        { id: 'warehouse-from-123', name: 'Source Warehouse' },
        { id: 'warehouse-to-123', name: 'Destination Warehouse' },
      ]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].fromWarehouseName).toBe('Source Warehouse');
          expect(value.data[0].toWarehouseName).toBe('Destination Warehouse');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: page=2 When: getting transfers Then: hasPrev should be true', async () => {
      // Arrange
      const transfers = Array.from({ length: 15 }, (_, i) =>
        createTransferWithDates({
          fromWarehouseId: `wh-from-${i}`,
          toWarehouseId: `wh-to-${i}`,
          status: 'DRAFT',
        })
      );
      mockTransferRepository.findAll.mockResolvedValue(transfers);

      const request = {
        orgId: mockOrgId,
        page: 2,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.hasPrev).toBe(true);
          expect(value.pagination.page).toBe(2);
          expect(value.data).toHaveLength(5);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: empty results When: getting transfers Then: should return empty data with pagination', async () => {
      // Arrange
      mockTransferRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(0);
          expect(value.pagination.total).toBe(0);
          expect(value.pagination.totalPages).toBe(0);
          expect(value.pagination.hasNext).toBe(false);
          expect(value.pagination.hasPrev).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: no page/limit provided When: getting transfers Then: should use defaults', async () => {
      // Arrange
      mockTransferRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.pagination.page).toBe(1);
          expect(value.pagination.limit).toBe(10);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: toWarehouseId filter without fromWarehouseId When: getting transfers Then: should use findByToWarehouse', async () => {
      // Arrange
      const mockTransfers = [createMockTransfer()];
      mockTransferRepository.findByToWarehouse.mockResolvedValue(mockTransfers);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        toWarehouseId: 'warehouse-to-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockTransferRepository.findByToWarehouse).toHaveBeenCalledWith(
        'warehouse-to-123',
        mockOrgId
      );
    });

    it('Given: sortBy initiatedAt When: getting transfers Then: should sort by initiatedAt', async () => {
      // Arrange
      const transfer1 = createTransferWithDates({
        fromWarehouseId: 'wh-a',
        toWarehouseId: 'wh-b',
        status: 'IN_TRANSIT',
        initiatedAt: new Date('2024-01-05T10:00:00.000Z'),
      });
      const transfer2 = createTransferWithDates({
        fromWarehouseId: 'wh-c',
        toWarehouseId: 'wh-d',
        status: 'IN_TRANSIT',
        initiatedAt: new Date('2024-01-10T10:00:00.000Z'),
      });
      mockTransferRepository.findAll.mockResolvedValue([transfer2, transfer1]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'initiatedAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy receivedAt When: getting transfers Then: should sort by receivedAt', async () => {
      // Arrange
      const transfer1 = createTransferWithDates({
        fromWarehouseId: 'wh-a',
        toWarehouseId: 'wh-b',
        status: 'RECEIVED',
        receivedAt: new Date('2024-01-15T10:00:00.000Z'),
      });
      const transfer2 = createTransferWithDates({
        fromWarehouseId: 'wh-c',
        toWarehouseId: 'wh-d',
        status: 'RECEIVED',
        receivedAt: new Date('2024-01-20T10:00:00.000Z'),
      });
      const transfer3 = createTransferWithDates({
        fromWarehouseId: 'wh-e',
        toWarehouseId: 'wh-f',
        status: 'DRAFT',
        // no receivedAt - should default to 0
      });
      mockTransferRepository.findAll.mockResolvedValue([transfer2, transfer3, transfer1]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'receivedAt',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(3);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: warehouse not found When: enriching transfers Then: should return empty string for warehouse names', async () => {
      // Arrange
      const mockTransfers = [createMockTransfer()];
      mockTransferRepository.findAll.mockResolvedValue(mockTransfers);

      // No warehouses found
      (mockPrisma.warehouse.findMany as jest.Mock).mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data[0].fromWarehouseName).toBe('');
          expect(value.data[0].toWarehouseName).toBe('');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: comma-separated status filter When: getting transfers Then: should filter by multiple statuses', async () => {
      // Arrange
      const transferDraft = createTransferWithDates({
        fromWarehouseId: 'wh-a',
        toWarehouseId: 'wh-b',
        status: 'DRAFT',
      });
      const transferInTransit = createTransferWithDates({
        fromWarehouseId: 'wh-c',
        toWarehouseId: 'wh-d',
        status: 'IN_TRANSIT',
        initiatedAt: new Date(),
      });
      const transferReceived = createTransferWithDates({
        fromWarehouseId: 'wh-e',
        toWarehouseId: 'wh-f',
        status: 'RECEIVED',
        receivedAt: new Date(),
      });
      mockTransferRepository.findByStatus.mockResolvedValue([
        transferDraft,
        transferInTransit,
        transferReceived,
      ]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'DRAFT,IN_TRANSIT',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          const statuses = value.data.map(d => d.status);
          expect(statuses).toContain('DRAFT');
          expect(statuses).toContain('IN_TRANSIT');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy with no sortOrder When: getting transfers Then: should default to asc', async () => {
      // Arrange
      const transferDraft = createTransferWithDates({
        fromWarehouseId: 'wh-a',
        toWarehouseId: 'wh-b',
        status: 'DRAFT',
      });
      const transferInTransit = createTransferWithDates({
        fromWarehouseId: 'wh-c',
        toWarehouseId: 'wh-d',
        status: 'IN_TRANSIT',
        initiatedAt: new Date(),
      });
      mockTransferRepository.findAll.mockResolvedValue([transferInTransit, transferDraft]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'status',
        // no sortOrder - should default to 'asc'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          // DRAFT < IN_TRANSIT alphabetically (asc default)
          expect(value.data[0].status).toBe('DRAFT');
          expect(value.data[1].status).toBe('IN_TRANSIT');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: fromWarehouseId filter with empty results When: getting transfers Then: should skip additional filtering', async () => {
      // Arrange
      mockTransferRepository.findByFromWarehouse.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        fromWarehouseId: 'wh-nonexistent',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: toWarehouseId additional filter with empty results When: getting transfers Then: should skip toWarehouse filtering', async () => {
      // Arrange - fromWarehouseId triggers findByFromWarehouse,
      // then toWarehouseId is applied as additional filter but returns is empty
      mockTransferRepository.findByFromWarehouse.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        fromWarehouseId: 'wh-from',
        toWarehouseId: 'wh-to',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: status filter with empty results When: getting transfers Then: should skip status post-filtering', async () => {
      // Arrange
      mockTransferRepository.findByStatus.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'IN_TRANSIT',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
