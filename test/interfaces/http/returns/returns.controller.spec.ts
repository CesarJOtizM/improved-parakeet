/* eslint-disable @typescript-eslint/no-explicit-any */
import { ReturnsController } from '@interface/http/returns/returns.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError, NotFoundError } from '@shared/domain/result/domainError';

describe('ReturnsController', () => {
  let controller: ReturnsController;
  let mockCreateReturnUseCase: any;
  let mockGetReturnsUseCase: any;
  let mockGetReturnByIdUseCase: any;
  let mockUpdateReturnUseCase: any;
  let mockConfirmReturnUseCase: any;
  let mockCancelReturnUseCase: any;
  let mockAddReturnLineUseCase: any;
  let mockRemoveReturnLineUseCase: any;

  const mockReturnData = {
    id: 'return-123',
    returnNumber: 'RET-001',
    status: 'DRAFT',
    type: 'SALE_RETURN',
    warehouseId: 'wh-123',
    orgId: 'org-123',
  };

  const mockRequest = {
    user: {
      id: 'user-123',
      email: 'test@test.com',
      orgId: 'org-123',
    },
  };

  beforeEach(() => {
    mockCreateReturnUseCase = { execute: jest.fn() };
    mockGetReturnsUseCase = { execute: jest.fn() };
    mockGetReturnByIdUseCase = { execute: jest.fn() };
    mockUpdateReturnUseCase = { execute: jest.fn() };
    mockConfirmReturnUseCase = { execute: jest.fn() };
    mockCancelReturnUseCase = { execute: jest.fn() };
    mockAddReturnLineUseCase = { execute: jest.fn() };
    mockRemoveReturnLineUseCase = { execute: jest.fn() };

    controller = new ReturnsController(
      mockCreateReturnUseCase,
      mockGetReturnsUseCase,
      mockGetReturnByIdUseCase,
      mockUpdateReturnUseCase,
      mockConfirmReturnUseCase,
      mockCancelReturnUseCase,
      mockAddReturnLineUseCase,
      mockRemoveReturnLineUseCase
    );
  });

  describe('createReturn', () => {
    it('Given: valid return data When: creating return Then: should return created return', async () => {
      // Arrange
      const dto = {
        type: 'SALE_RETURN',
        warehouseId: 'wh-123',
        saleId: 'sale-123',
        lines: [{ productId: 'prod-1', quantity: 5 }],
      };
      mockCreateReturnUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockReturnData,
          message: 'Return created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createReturn(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockReturnData);
    });

    it('Given: invalid data When: creating return Then: should throw', async () => {
      // Arrange
      const dto = { type: '' };
      mockCreateReturnUseCase.execute.mockResolvedValue(
        err(new ValidationError('Return type is required'))
      );

      // Act & Assert
      await expect(
        controller.createReturn(dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getReturns', () => {
    it('Given: valid query When: getting returns Then: should return returns list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: { items: [mockReturnData], total: 1 },
        message: 'Returns retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetReturnsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      const result = await controller.getReturns(query as any, 'org-123');

      // Assert - getReturns returns Result directly, so we need to unwrap
      expect(result.isOk()).toBe(true);
      const value = result.unwrap();
      expect(value.success).toBe(true);
      expect((value.data as any).items || value.data).toHaveLength(1);
    });
  });

  describe('getReturnById', () => {
    it('Given: valid return id When: getting return Then: should return return', async () => {
      // Arrange
      mockGetReturnByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockReturnData,
          message: 'Return retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getReturnById('return-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('return-123');
    });

    it('Given: non-existent return id When: getting return Then: should throw', async () => {
      // Arrange
      mockGetReturnByIdUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Return not found'))
      );

      // Act & Assert
      await expect(controller.getReturnById('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('updateReturn', () => {
    it('Given: valid update data When: updating return Then: should return updated return', async () => {
      // Arrange
      const dto = { reason: 'Damaged product' };
      mockUpdateReturnUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockReturnData, reason: 'Damaged product' },
          message: 'Return updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.updateReturn('return-123', dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('confirmReturn', () => {
    it('Given: draft return When: confirming Then: should return confirmed return', async () => {
      // Arrange
      mockConfirmReturnUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockReturnData, status: 'CONFIRMED' },
          message: 'Return confirmed',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.confirmReturn('return-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('CONFIRMED');
    });
  });

  describe('cancelReturn', () => {
    it('Given: return When: cancelling Then: should return cancelled return', async () => {
      // Arrange
      mockCancelReturnUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockReturnData, status: 'CANCELLED' },
          message: 'Return cancelled',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.cancelReturn(
        'return-123',
        'Error',
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('addReturnLine', () => {
    it('Given: valid line When: adding line Then: should return updated return', async () => {
      // Arrange
      const lineDto = { productId: 'prod-1', quantity: 3 };
      mockAddReturnLineUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockReturnData,
          message: 'Line added',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.addReturnLine('return-123', lineDto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('removeReturnLine', () => {
    it('Given: valid line id When: removing line Then: should return updated return', async () => {
      // Arrange
      mockRemoveReturnLineUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockReturnData,
          message: 'Line removed',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.removeReturnLine('return-123', 'line-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
