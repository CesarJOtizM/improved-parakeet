/* eslint-disable @typescript-eslint/no-explicit-any */
import { GetTransferByIdUseCase } from '@application/transferUseCases/getTransferByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError } from '@shared/domain/result/domainError';

describe('GetTransferByIdUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockTransferId = 'transfer-123';
  const mockFromWarehouseId = 'warehouse-from-123';
  const mockToWarehouseId = 'warehouse-to-456';

  let useCase: GetTransferByIdUseCase;
  let mockPrisma: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPrisma = {
      transfer: {
        findFirst: jest.fn(),
      },
    };

    useCase = new GetTransferByIdUseCase(mockPrisma);
  });

  describe('execute', () => {
    const validRequest = {
      transferId: mockTransferId,
      orgId: mockOrgId,
    };

    const createPrismaTransferResult = (overrides: Record<string, any> = {}) => ({
      id: mockTransferId,
      fromWarehouseId: mockFromWarehouseId,
      toWarehouseId: mockToWarehouseId,
      fromWarehouse: { name: 'Origin Warehouse' },
      toWarehouse: { name: 'Destination Warehouse' },
      status: 'DRAFT',
      createdBy: 'user-123',
      receivedBy: null,
      note: 'Test transfer note',
      lines: [],
      orgId: mockOrgId,
      initiatedAt: null,
      receivedAt: null,
      createdAt: new Date('2026-01-15T10:00:00.000Z'),
      updatedAt: new Date('2026-01-15T10:00:00.000Z'),
      ...overrides,
    });

    it('Given: an existing transfer When: getting by ID Then: should return success result with transfer details', async () => {
      // Arrange
      const prismaResult = createPrismaTransferResult();
      mockPrisma.transfer.findFirst.mockResolvedValue(prismaResult);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Transfer retrieved successfully');
          expect(value.data.id).toBe(mockTransferId);
          expect(value.data.fromWarehouseId).toBe(mockFromWarehouseId);
          expect(value.data.fromWarehouseName).toBe('Origin Warehouse');
          expect(value.data.toWarehouseId).toBe(mockToWarehouseId);
          expect(value.data.toWarehouseName).toBe('Destination Warehouse');
          expect(value.data.status).toBe('DRAFT');
          expect(value.data.orgId).toBe(mockOrgId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: a non-existent transfer When: getting by ID Then: should return NotFoundError', async () => {
      // Arrange
      mockPrisma.transfer.findFirst.mockResolvedValue(null);

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
          expect(error.message).toContain('Transfer not found');
        }
      );
    });

    it('Given: a transfer with lines When: getting by ID Then: should return lines with product details', async () => {
      // Arrange
      const prismaResult = createPrismaTransferResult({
        lines: [
          {
            id: 'line-1',
            productId: 'product-1',
            product: { name: 'Widget A', sku: 'WDG-001' },
            quantity: 10,
            fromLocationId: 'loc-from-1',
            toLocationId: 'loc-to-1',
          },
          {
            id: 'line-2',
            productId: 'product-2',
            product: { name: 'Widget B', sku: 'WDG-002' },
            quantity: 5,
            fromLocationId: null,
            toLocationId: null,
          },
        ],
      });
      mockPrisma.transfer.findFirst.mockResolvedValue(prismaResult);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.linesCount).toBe(2);
          expect(value.data.lines).toHaveLength(2);
          expect(value.data.lines[0].id).toBe('line-1');
          expect(value.data.lines[0].productName).toBe('Widget A');
          expect(value.data.lines[0].productSku).toBe('WDG-001');
          expect(value.data.lines[0].quantity).toBe(10);
          expect(value.data.lines[0].fromLocationId).toBe('loc-from-1');
          expect(value.data.lines[0].toLocationId).toBe('loc-to-1');
          expect(value.data.lines[1].fromLocationId).toBeUndefined();
          expect(value.data.lines[1].toLocationId).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: a transfer with receivedBy and dates When: getting by ID Then: should return all optional fields', async () => {
      // Arrange
      const initiatedAt = new Date('2026-01-15T10:00:00.000Z');
      const receivedAt = new Date('2026-01-16T14:00:00.000Z');
      const prismaResult = createPrismaTransferResult({
        status: 'RECEIVED',
        receivedBy: 'receiver-user-456',
        initiatedAt,
        receivedAt,
      });
      mockPrisma.transfer.findFirst.mockResolvedValue(prismaResult);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.status).toBe('RECEIVED');
          expect(value.data.receivedBy).toBe('receiver-user-456');
          expect(value.data.initiatedAt).toEqual(initiatedAt);
          expect(value.data.receivedAt).toEqual(receivedAt);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: an existing transfer When: getting by ID Then: should query Prisma with correct where and include', async () => {
      // Arrange
      const prismaResult = createPrismaTransferResult();
      mockPrisma.transfer.findFirst.mockResolvedValue(prismaResult);

      // Act
      await useCase.execute(validRequest);

      // Assert
      expect(mockPrisma.transfer.findFirst).toHaveBeenCalledWith({
        where: { id: mockTransferId, orgId: mockOrgId },
        include: {
          fromWarehouse: { select: { name: true } },
          toWarehouse: { select: { name: true } },
          lines: {
            include: {
              product: { select: { name: true, sku: true } },
            },
          },
        },
      });
    });

    it('Given: a transfer with null optional fields When: getting by ID Then: should return undefined for nulls', async () => {
      // Arrange
      const prismaResult = createPrismaTransferResult({
        receivedBy: null,
        note: null,
        initiatedAt: null,
        receivedAt: null,
      });
      mockPrisma.transfer.findFirst.mockResolvedValue(prismaResult);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.receivedBy).toBeUndefined();
          expect(value.data.note).toBeUndefined();
          expect(value.data.initiatedAt).toBeUndefined();
          expect(value.data.receivedAt).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
