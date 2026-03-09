/* eslint-disable @typescript-eslint/no-explicit-any */
import { TransfersController } from '@interface/http/inventory/transfers.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import {
  ValidationError,
  NotFoundError,
  BusinessRuleError,
} from '@shared/domain/result/domainError';

describe('TransfersController', () => {
  let controller: TransfersController;
  let mockInitiateTransferUseCase: any;
  let mockGetTransfersUseCase: any;
  let mockGetTransferByIdUseCase: any;
  let mockConfirmTransferUseCase: any;
  let mockReceiveTransferUseCase: any;
  let mockRejectTransferUseCase: any;
  let mockCancelTransferUseCase: any;

  const mockTransferData = {
    id: 'transfer-123',
    transferNumber: 'TRF-001',
    fromWarehouseId: 'wh-origin',
    toWarehouseId: 'wh-dest',
    status: 'DRAFT',
    note: 'Test transfer',
    orgId: 'org-123',
    createdBy: 'user-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      email: 'test@test.com',
      orgId: 'org-123',
    },
  };

  beforeEach(() => {
    mockInitiateTransferUseCase = { execute: jest.fn() };
    mockGetTransfersUseCase = { execute: jest.fn() };
    mockGetTransferByIdUseCase = { execute: jest.fn() };
    mockConfirmTransferUseCase = { execute: jest.fn() };
    mockReceiveTransferUseCase = { execute: jest.fn() };
    mockRejectTransferUseCase = { execute: jest.fn() };
    mockCancelTransferUseCase = { execute: jest.fn() };

    controller = new TransfersController(
      mockInitiateTransferUseCase,
      mockGetTransfersUseCase,
      mockGetTransferByIdUseCase,
      mockConfirmTransferUseCase,
      mockReceiveTransferUseCase,
      mockRejectTransferUseCase,
      mockCancelTransferUseCase
    );
  });

  describe('initiateTransfer', () => {
    it('Given: valid transfer data When: initiating transfer Then: should return created transfer', async () => {
      // Arrange
      const dto = {
        fromWarehouseId: 'wh-origin',
        toWarehouseId: 'wh-dest',
        note: 'Test transfer',
        lines: [{ productId: 'prod-1', quantity: 10 }],
      };
      mockInitiateTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockTransferData,
          message: 'Transfer initiated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.initiateTransfer(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('DRAFT');
      expect(result.data.fromWarehouseId).toBe('wh-origin');
    });

    it('Given: valid data When: initiating transfer Then: should pass createdBy from request user', async () => {
      // Arrange
      const dto = {
        fromWarehouseId: 'wh-origin',
        toWarehouseId: 'wh-dest',
        lines: [{ productId: 'prod-1', quantity: 5 }],
      };
      mockInitiateTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockTransferData,
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.initiateTransfer(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockInitiateTransferUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          fromWarehouseId: 'wh-origin',
          toWarehouseId: 'wh-dest',
          createdBy: 'user-123',
          orgId: 'org-123',
        })
      );
    });

    it('Given: invalid data When: initiating transfer Then: should throw ValidationError', async () => {
      // Arrange
      const dto = { fromWarehouseId: '', toWarehouseId: '', lines: [] };
      mockInitiateTransferUseCase.execute.mockResolvedValue(
        err(new ValidationError('Warehouse IDs and lines are required'))
      );

      // Act & Assert
      await expect(
        controller.initiateTransfer(dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });

    it('Given: same origin and destination When: initiating transfer Then: should throw ValidationError', async () => {
      // Arrange
      const dto = {
        fromWarehouseId: 'wh-same',
        toWarehouseId: 'wh-same',
        lines: [{ productId: 'prod-1', quantity: 1 }],
      };
      mockInitiateTransferUseCase.execute.mockResolvedValue(
        err(new ValidationError('Origin and destination warehouses must be different'))
      );

      // Act & Assert
      await expect(
        controller.initiateTransfer(dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getTransfers', () => {
    it('Given: valid query params When: getting transfers Then: should return transfers list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: [mockTransferData],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        message: 'Transfers retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetTransfersUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      const result = await controller.getTransfers(query as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('Given: status filter When: getting transfers Then: should pass status to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, status: 'IN_TRANSIT' };
      mockGetTransfersUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getTransfers(query as any, 'org-123');

      // Assert
      expect(mockGetTransfersUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'IN_TRANSIT', orgId: 'org-123' })
      );
    });

    it('Given: date range filter When: getting transfers Then: should convert dates and pass to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, startDate: '2026-01-01', endDate: '2026-01-31' };
      mockGetTransfersUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getTransfers(query as any, 'org-123');

      // Assert
      const callArgs = mockGetTransfersUseCase.execute.mock.calls[0][0];
      expect(callArgs.startDate).toBeInstanceOf(Date);
      expect(callArgs.endDate).toBeInstanceOf(Date);
    });

    it('Given: no date filters When: getting transfers Then: dates should be undefined', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      mockGetTransfersUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getTransfers(query as any, 'org-123');

      // Assert
      const callArgs = mockGetTransfersUseCase.execute.mock.calls[0][0];
      expect(callArgs.startDate).toBeUndefined();
      expect(callArgs.endDate).toBeUndefined();
    });

    it('Given: warehouse filters When: getting transfers Then: should pass warehouse IDs', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        fromWarehouseId: 'wh-origin',
        toWarehouseId: 'wh-dest',
      };
      mockGetTransfersUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getTransfers(query as any, 'org-123');

      // Assert
      expect(mockGetTransfersUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          fromWarehouseId: 'wh-origin',
          toWarehouseId: 'wh-dest',
          orgId: 'org-123',
        })
      );
    });

    it('Given: sort params When: getting transfers Then: should pass sortBy and sortOrder', async () => {
      // Arrange
      const query = { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' };
      mockGetTransfersUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getTransfers(query as any, 'org-123');

      // Assert
      expect(mockGetTransfersUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('Given: use case error When: getting transfers Then: should throw', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      mockGetTransfersUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve transfers'))
      );

      // Act & Assert
      await expect(controller.getTransfers(query as any, 'org-123')).rejects.toThrow();
    });
  });

  describe('getTransferById', () => {
    it('Given: valid transfer id When: getting transfer Then: should return transfer', async () => {
      // Arrange
      mockGetTransferByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockTransferData,
          message: 'Transfer retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getTransferById('transfer-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('transfer-123');
    });

    it('Given: non-existent transfer id When: getting transfer Then: should throw NotFoundError', async () => {
      // Arrange
      mockGetTransferByIdUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Transfer not found'))
      );

      // Act & Assert
      await expect(controller.getTransferById('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('confirmTransfer', () => {
    it('Given: draft transfer When: confirming Then: should return confirmed transfer', async () => {
      // Arrange
      mockConfirmTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockTransferData, status: 'IN_TRANSIT' },
          message: 'Transfer confirmed',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.confirmTransfer('transfer-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('IN_TRANSIT');
    });

    it('Given: non-draft transfer When: confirming Then: should throw BusinessRuleError', async () => {
      // Arrange
      mockConfirmTransferUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Transfer cannot be confirmed from current status'))
      );

      // Act & Assert
      await expect(controller.confirmTransfer('transfer-123', 'org-123')).rejects.toThrow();
    });

    it('Given: non-existent transfer When: confirming Then: should throw NotFoundError', async () => {
      // Arrange
      mockConfirmTransferUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Transfer not found'))
      );

      // Act & Assert
      await expect(controller.confirmTransfer('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('receiveTransfer', () => {
    it('Given: in-transit transfer When: receiving Then: should return received transfer', async () => {
      // Arrange
      mockReceiveTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockTransferData, status: 'RECEIVED' },
          message: 'Transfer received',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.receiveTransfer(
        'transfer-123',
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('RECEIVED');
    });

    it('Given: in-transit transfer When: receiving Then: should pass receivedBy from request user', async () => {
      // Arrange
      mockReceiveTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockTransferData,
          message: 'Received',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.receiveTransfer('transfer-123', 'org-123', mockRequest as any);

      // Assert
      expect(mockReceiveTransferUseCase.execute).toHaveBeenCalledWith({
        transferId: 'transfer-123',
        orgId: 'org-123',
        receivedBy: 'user-123',
      });
    });

    it('Given: non-in-transit transfer When: receiving Then: should throw BusinessRuleError', async () => {
      // Arrange
      mockReceiveTransferUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Transfer cannot be received from current status'))
      );

      // Act & Assert
      await expect(
        controller.receiveTransfer('transfer-123', 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('rejectTransfer', () => {
    it('Given: in-transit transfer When: rejecting Then: should return rejected transfer', async () => {
      // Arrange
      mockRejectTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockTransferData, status: 'REJECTED' },
          message: 'Transfer rejected',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.rejectTransfer('transfer-123', 'org-123', {
        reason: 'Damaged goods',
      });

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('REJECTED');
    });

    it('Given: in-transit transfer with reason When: rejecting Then: should pass reason to use case', async () => {
      // Arrange
      mockRejectTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockTransferData,
          message: 'Rejected',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.rejectTransfer('transfer-123', 'org-123', { reason: 'Wrong items' });

      // Assert
      expect(mockRejectTransferUseCase.execute).toHaveBeenCalledWith({
        transferId: 'transfer-123',
        orgId: 'org-123',
        reason: 'Wrong items',
      });
    });

    it('Given: non-in-transit transfer When: rejecting Then: should throw BusinessRuleError', async () => {
      // Arrange
      mockRejectTransferUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Transfer cannot be rejected from current status'))
      );

      // Act & Assert
      await expect(
        controller.rejectTransfer('transfer-123', 'org-123', { reason: 'Test' })
      ).rejects.toThrow();
    });
  });

  describe('rejectTransfer - no reason branch', () => {
    it('Given: in-transit transfer without reason When: rejecting Then: should pass undefined reason', async () => {
      // Arrange
      mockRejectTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockTransferData, status: 'REJECTED' },
          message: 'Transfer rejected',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.rejectTransfer('transfer-123', 'org-123', {});

      // Assert
      expect(mockRejectTransferUseCase.execute).toHaveBeenCalledWith({
        transferId: 'transfer-123',
        orgId: 'org-123',
        reason: undefined,
      });
    });
  });

  describe('getTransfers - partial date branches', () => {
    it('Given: only startDate When: getting transfers Then: should convert startDate and pass undefined endDate', async () => {
      // Arrange
      const query = { page: 1, limit: 10, startDate: '2026-03-01' };
      mockGetTransfersUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getTransfers(query as any, 'org-123');

      // Assert
      const callArgs = mockGetTransfersUseCase.execute.mock.calls[0][0];
      expect(callArgs.startDate).toBeInstanceOf(Date);
      expect(callArgs.endDate).toBeUndefined();
    });

    it('Given: only endDate When: getting transfers Then: should pass undefined startDate and convert endDate', async () => {
      // Arrange
      const query = { page: 1, limit: 10, endDate: '2026-03-31' };
      mockGetTransfersUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getTransfers(query as any, 'org-123');

      // Assert
      const callArgs = mockGetTransfersUseCase.execute.mock.calls[0][0];
      expect(callArgs.startDate).toBeUndefined();
      expect(callArgs.endDate).toBeInstanceOf(Date);
    });
  });

  describe('getTransfers - all filters', () => {
    it('Given: all filters When: getting transfers Then: should pass all params', async () => {
      // Arrange
      const query = {
        page: 2,
        limit: 20,
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
        status: 'RECEIVED',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        sortBy: 'receivedAt',
        sortOrder: 'asc',
      };
      mockGetTransfersUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getTransfers(query as any, 'org-123');

      // Assert
      expect(mockGetTransfersUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        page: 2,
        limit: 20,
        fromWarehouseId: 'wh-1',
        toWarehouseId: 'wh-2',
        status: 'RECEIVED',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        sortBy: 'receivedAt',
        sortOrder: 'asc',
      });
    });
  });

  describe('initiateTransfer - no note branch', () => {
    it('Given: transfer without note When: initiating Then: should pass undefined note', async () => {
      // Arrange
      const dto = {
        fromWarehouseId: 'wh-origin',
        toWarehouseId: 'wh-dest',
        lines: [{ productId: 'prod-1', quantity: 5 }],
      };
      mockInitiateTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockTransferData,
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.initiateTransfer(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockInitiateTransferUseCase.execute).toHaveBeenCalledWith({
        fromWarehouseId: 'wh-origin',
        toWarehouseId: 'wh-dest',
        note: undefined,
        lines: [{ productId: 'prod-1', quantity: 5 }],
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });
  });

  describe('receiveTransfer - not found', () => {
    it('Given: non-existent transfer When: receiving Then: should throw NotFoundError', async () => {
      // Arrange
      mockReceiveTransferUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Transfer not found'))
      );

      // Act & Assert
      await expect(
        controller.receiveTransfer('non-existent', 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('initiateTransfer - note mapping', () => {
    it('Given: transfer with note When: initiating Then: should pass note to use case', async () => {
      // Arrange
      const dto = {
        fromWarehouseId: 'wh-origin',
        toWarehouseId: 'wh-dest',
        note: 'Urgent transfer',
        lines: [{ productId: 'prod-1', quantity: 10 }],
      };
      mockInitiateTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockTransferData,
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.initiateTransfer(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(mockInitiateTransferUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          note: 'Urgent transfer',
          lines: [{ productId: 'prod-1', quantity: 10 }],
        })
      );
    });
  });

  describe('cancelTransfer', () => {
    it('Given: draft transfer When: canceling Then: should return canceled transfer', async () => {
      // Arrange
      mockCancelTransferUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockTransferData, status: 'CANCELED' },
          message: 'Transfer canceled',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.cancelTransfer('transfer-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('CANCELED');
    });

    it('Given: non-draft transfer When: canceling Then: should throw BusinessRuleError', async () => {
      // Arrange
      mockCancelTransferUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Only DRAFT transfers can be canceled'))
      );

      // Act & Assert
      await expect(controller.cancelTransfer('transfer-123', 'org-123')).rejects.toThrow();
    });

    it('Given: non-existent transfer When: canceling Then: should throw NotFoundError', async () => {
      // Arrange
      mockCancelTransferUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Transfer not found'))
      );

      // Act & Assert
      await expect(controller.cancelTransfer('non-existent', 'org-123')).rejects.toThrow();
    });
  });
});
