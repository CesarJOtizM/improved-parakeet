/* eslint-disable @typescript-eslint/no-explicit-any */
import { SalesController } from '@interface/http/sales/sales.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import { ValidationError, NotFoundError } from '@shared/domain/result/domainError';

describe('SalesController', () => {
  let controller: SalesController;
  let mockCreateSaleUseCase: any;
  let mockGetSalesUseCase: any;
  let mockGetSaleByIdUseCase: any;
  let mockUpdateSaleUseCase: any;
  let mockConfirmSaleUseCase: any;
  let mockCancelSaleUseCase: any;
  let mockAddSaleLineUseCase: any;
  let mockRemoveSaleLineUseCase: any;
  let mockGetSaleMovementUseCase: any;
  let mockGetReturnsBySaleUseCase: any;

  const mockSaleData = {
    id: 'sale-123',
    saleNumber: 'SALE-001',
    status: 'DRAFT',
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
    mockCreateSaleUseCase = { execute: jest.fn() };
    mockGetSalesUseCase = { execute: jest.fn() };
    mockGetSaleByIdUseCase = { execute: jest.fn() };
    mockUpdateSaleUseCase = { execute: jest.fn() };
    mockConfirmSaleUseCase = { execute: jest.fn() };
    mockCancelSaleUseCase = { execute: jest.fn() };
    mockAddSaleLineUseCase = { execute: jest.fn() };
    mockRemoveSaleLineUseCase = { execute: jest.fn() };
    mockGetSaleMovementUseCase = { execute: jest.fn() };
    mockGetReturnsBySaleUseCase = { execute: jest.fn() };

    controller = new SalesController(
      mockCreateSaleUseCase,
      mockGetSalesUseCase,
      mockGetSaleByIdUseCase,
      mockUpdateSaleUseCase,
      mockConfirmSaleUseCase,
      mockCancelSaleUseCase,
      mockAddSaleLineUseCase,
      mockRemoveSaleLineUseCase,
      mockGetSaleMovementUseCase,
      mockGetReturnsBySaleUseCase,
      { execute: jest.fn() } as any, // startPickingSaleUseCase
      { execute: jest.fn() } as any, // shipSaleUseCase
      { execute: jest.fn() } as any, // completeSaleUseCase
      { execute: jest.fn() } as any // markSaleReturnedUseCase
    );
  });

  describe('createSale', () => {
    it('Given: valid sale data When: creating sale Then: should return created sale', async () => {
      // Arrange
      const dto = {
        warehouseId: 'wh-123',
        lines: [{ productId: 'prod-1', quantity: 10, salePrice: 100 }],
      };
      mockCreateSaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockSaleData,
          message: 'Sale created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createSale(dto as any, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockSaleData);
    });

    it('Given: invalid data When: creating sale Then: should throw', async () => {
      // Arrange
      const dto = { warehouseId: '' };
      mockCreateSaleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Warehouse ID is required'))
      );

      // Act & Assert
      await expect(
        controller.createSale(dto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getSales', () => {
    it('Given: valid query When: getting sales Then: should return sales list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: [mockSaleData],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        message: 'Sales retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetSalesUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      const result = await controller.getSales(query as any, 'org-123');

      // Assert - resultToHttpResponse unwraps the Result, so we get the value directly
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getSaleById', () => {
    it('Given: valid sale id When: getting sale Then: should return sale', async () => {
      // Arrange
      mockGetSaleByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockSaleData,
          message: 'Sale retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getSaleById('sale-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('sale-123');
    });

    it('Given: non-existent sale id When: getting sale Then: should throw', async () => {
      // Arrange
      mockGetSaleByIdUseCase.execute.mockResolvedValue(err(new NotFoundError('Sale not found')));

      // Act & Assert
      await expect(controller.getSaleById('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('updateSale', () => {
    it('Given: valid update data When: updating sale Then: should return updated sale', async () => {
      // Arrange
      const dto = { customerReference: 'REF-001' };
      mockUpdateSaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockSaleData, customerReference: 'REF-001' },
          message: 'Sale updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.updateSale('sale-123', dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('confirmSale', () => {
    it('Given: draft sale When: confirming Then: should return confirmed sale', async () => {
      // Arrange
      mockConfirmSaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockSaleData, status: 'CONFIRMED' },
          message: 'Sale confirmed',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.confirmSale('sale-123', 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('CONFIRMED');
    });
  });

  describe('cancelSale', () => {
    it('Given: sale When: cancelling Then: should return cancelled sale', async () => {
      // Arrange
      mockCancelSaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockSaleData, status: 'CANCELLED' },
          message: 'Sale cancelled',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.cancelSale(
        'sale-123',
        'Customer request',
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('addSaleLine', () => {
    it('Given: valid line When: adding line Then: should return updated sale', async () => {
      // Arrange
      const lineDto = { productId: 'prod-1', quantity: 5, salePrice: 50 };
      mockAddSaleLineUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockSaleData,
          message: 'Line added',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.addSaleLine('sale-123', lineDto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('removeSaleLine', () => {
    it('Given: valid line id When: removing line Then: should return updated sale', async () => {
      // Arrange
      mockRemoveSaleLineUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockSaleData,
          message: 'Line removed',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.removeSaleLine('sale-123', 'line-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
    });
  });

  describe('getSaleMovement', () => {
    it('Given: confirmed sale When: getting movement Then: should return movement', async () => {
      // Arrange
      const mockMovement = { id: 'mov-123', type: 'OUT' };
      mockGetSaleMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockMovement,
          message: 'Movement retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getSaleMovement('sale-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('OUT');
    });
  });

  describe('getReturnsBySale', () => {
    it('Given: sale with returns When: getting returns Then: should return returns list', async () => {
      // Arrange
      const mockReturns = [{ id: 'return-123' }];
      mockGetReturnsBySaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockReturns,
          message: 'Returns retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getReturnsBySale('sale-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
