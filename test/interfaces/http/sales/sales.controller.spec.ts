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
      { execute: jest.fn() } as any, // markSaleReturnedUseCase
      { execute: jest.fn() } as any, // swapSaleLineUseCase
      { execute: jest.fn() } as any // getSaleSwapsUseCase
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

    it('Given: non-existent sale When: getting returns Then: should throw not found', async () => {
      // Arrange
      mockGetReturnsBySaleUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Sale not found'))
      );

      // Act & Assert
      await expect(controller.getReturnsBySale('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('getSales - date conversion branches', () => {
    it('Given: startDate and endDate When: getting sales Then: should convert strings to Date objects', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        startDate: '2026-01-01',
        endDate: '2026-01-31',
      };
      const responseData = {
        success: true,
        data: [mockSaleData],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        message: 'Sales retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetSalesUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      const result = await controller.getSales(query as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockGetSalesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });

    it('Given: no dates When: getting sales Then: should pass undefined dates', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
        message: 'Sales retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetSalesUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      await controller.getSales(query as any, 'org-123');

      // Assert
      expect(mockGetSalesUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: undefined,
          endDate: undefined,
        })
      );
    });

    it('Given: all query params When: getting sales Then: should pass all params', async () => {
      // Arrange
      const query = {
        page: 2,
        limit: 20,
        warehouseId: 'wh-123',
        companyId: 'company-123',
        status: 'CONFIRMED',
        search: 'SALE-001',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      const responseData = {
        success: true,
        data: [mockSaleData],
        pagination: { page: 2, limit: 20, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        message: 'Sales retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetSalesUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      const result = await controller.getSales(query as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockGetSalesUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        page: 2,
        limit: 20,
        warehouseId: 'wh-123',
        companyId: 'company-123',
        status: 'CONFIRMED',
        search: 'SALE-001',
        startDate: expect.any(Date),
        endDate: expect.any(Date),
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('Given: error from use case When: getting sales Then: should throw', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      mockGetSalesUseCase.execute.mockResolvedValue(err(new ValidationError('Invalid query')));

      // Act & Assert
      await expect(controller.getSales(query as any, 'org-123')).rejects.toThrow();
    });
  });

  describe('updateSale - error branches', () => {
    it('Given: non-existent sale When: updating Then: should throw not found', async () => {
      // Arrange
      const dto = { customerReference: 'REF-001' };
      mockUpdateSaleUseCase.execute.mockResolvedValue(err(new NotFoundError('Sale not found')));

      // Act & Assert
      await expect(controller.updateSale('non-existent', dto as any, 'org-123')).rejects.toThrow();
    });

    it('Given: all update fields When: updating sale Then: should pass all fields', async () => {
      // Arrange
      const dto = {
        contactId: 'contact-456',
        customerReference: 'REF-002',
        externalReference: 'EXT-002',
        note: 'Updated note',
      };
      mockUpdateSaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockSaleData, ...dto },
          message: 'Sale updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.updateSale('sale-123', dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockUpdateSaleUseCase.execute).toHaveBeenCalledWith({
        id: 'sale-123',
        contactId: 'contact-456',
        customerReference: 'REF-002',
        externalReference: 'EXT-002',
        note: 'Updated note',
        orgId: 'org-123',
      });
    });
  });

  describe('confirmSale - error branches', () => {
    it('Given: non-draft sale When: confirming Then: should throw', async () => {
      // Arrange
      mockConfirmSaleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Sale cannot be confirmed'))
      );

      // Act & Assert
      await expect(
        controller.confirmSale('sale-123', 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('cancelSale - additional branches', () => {
    it('Given: no reason When: cancelling Then: should pass undefined reason', async () => {
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
        undefined,
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockCancelSaleUseCase.execute).toHaveBeenCalledWith({
        id: 'sale-123',
        reason: undefined,
        orgId: 'org-123',
        userId: 'user-123',
      });
    });

    it('Given: error from use case When: cancelling Then: should throw', async () => {
      // Arrange
      mockCancelSaleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Sale cannot be cancelled'))
      );

      // Act & Assert
      await expect(
        controller.cancelSale('sale-123', 'reason', 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('addSaleLine - error branches', () => {
    it('Given: non-draft sale When: adding line Then: should throw', async () => {
      // Arrange
      const lineDto = { productId: 'prod-1', quantity: 5, salePrice: 50 };
      mockAddSaleLineUseCase.execute.mockResolvedValue(
        err(new ValidationError('Cannot modify non-draft sale'))
      );

      // Act & Assert
      await expect(controller.addSaleLine('sale-123', lineDto as any, 'org-123')).rejects.toThrow();
    });

    it('Given: line with currency When: adding line Then: should pass currency', async () => {
      // Arrange
      const lineDto = {
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 5,
        salePrice: 50,
        currency: 'USD',
      };
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
      expect(mockAddSaleLineUseCase.execute).toHaveBeenCalledWith({
        saleId: 'sale-123',
        productId: 'prod-1',
        locationId: 'loc-1',
        quantity: 5,
        salePrice: 50,
        currency: 'USD',
        orgId: 'org-123',
      });
    });
  });

  describe('removeSaleLine - error branches', () => {
    it('Given: non-existent line When: removing Then: should throw', async () => {
      // Arrange
      mockRemoveSaleLineUseCase.execute.mockResolvedValue(err(new NotFoundError('Line not found')));

      // Act & Assert
      await expect(
        controller.removeSaleLine('sale-123', 'non-existent', 'org-123')
      ).rejects.toThrow();
    });
  });

  describe('getSaleMovement - error branches', () => {
    it('Given: non-confirmed sale When: getting movement Then: should throw', async () => {
      // Arrange
      mockGetSaleMovementUseCase.execute.mockResolvedValue(
        err(new ValidationError('Sale does not have an associated movement'))
      );

      // Act & Assert
      await expect(controller.getSaleMovement('sale-123', 'org-123')).rejects.toThrow();
    });
  });

  describe('startPicking', () => {
    let mockStartPickingSaleUseCase: any;

    beforeEach(() => {
      mockStartPickingSaleUseCase = { execute: jest.fn() };
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
        mockStartPickingSaleUseCase,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any
      );
    });

    it('Given: confirmed sale When: starting picking Then: should return success', async () => {
      // Arrange
      mockStartPickingSaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockSaleData, status: 'PICKING' },
          message: 'Picking started',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.startPicking('sale-123', 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockStartPickingSaleUseCase.execute).toHaveBeenCalledWith({
        id: 'sale-123',
        orgId: 'org-123',
        userId: 'user-123',
      });
    });

    it('Given: error When: starting picking Then: should throw', async () => {
      // Arrange
      mockStartPickingSaleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Picking not enabled'))
      );

      // Act & Assert
      await expect(
        controller.startPicking('sale-123', 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('shipSale', () => {
    let mockShipSaleUseCase: any;

    beforeEach(() => {
      mockShipSaleUseCase = { execute: jest.fn() };
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
        { execute: jest.fn() } as any,
        mockShipSaleUseCase,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any
      );
    });

    it('Given: picking sale with shipping details When: shipping Then: should return success', async () => {
      // Arrange
      const body = {
        trackingNumber: 'TRACK-123',
        shippingCarrier: 'FedEx',
        shippingNotes: 'Handle with care',
      };
      mockShipSaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockSaleData, status: 'SHIPPED' },
          message: 'Sale shipped',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.shipSale('sale-123', body, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockShipSaleUseCase.execute).toHaveBeenCalledWith({
        id: 'sale-123',
        orgId: 'org-123',
        userId: 'user-123',
        trackingNumber: 'TRACK-123',
        shippingCarrier: 'FedEx',
        shippingNotes: 'Handle with care',
      });
    });

    it('Given: no optional shipping details When: shipping Then: should pass undefined fields', async () => {
      // Arrange
      const body = {};
      mockShipSaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockSaleData, status: 'SHIPPED' },
          message: 'Sale shipped',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.shipSale('sale-123', body, 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockShipSaleUseCase.execute).toHaveBeenCalledWith({
        id: 'sale-123',
        orgId: 'org-123',
        userId: 'user-123',
        trackingNumber: undefined,
        shippingCarrier: undefined,
        shippingNotes: undefined,
      });
    });

    it('Given: error When: shipping Then: should throw', async () => {
      // Arrange
      mockShipSaleUseCase.execute.mockResolvedValue(err(new ValidationError('Cannot ship sale')));

      // Act & Assert
      await expect(
        controller.shipSale('sale-123', {}, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('completeSale', () => {
    let mockCompleteSaleUseCase: any;

    beforeEach(() => {
      mockCompleteSaleUseCase = { execute: jest.fn() };
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
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        mockCompleteSaleUseCase,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any
      );
    });

    it('Given: shipped sale When: completing Then: should return success', async () => {
      // Arrange
      mockCompleteSaleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockSaleData, status: 'COMPLETED' },
          message: 'Sale completed',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.completeSale('sale-123', 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCompleteSaleUseCase.execute).toHaveBeenCalledWith({
        id: 'sale-123',
        orgId: 'org-123',
        userId: 'user-123',
      });
    });

    it('Given: error When: completing sale Then: should throw', async () => {
      // Arrange
      mockCompleteSaleUseCase.execute.mockResolvedValue(
        err(new ValidationError('Cannot complete sale'))
      );

      // Act & Assert
      await expect(
        controller.completeSale('sale-123', 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('markAsReturned', () => {
    let mockMarkSaleReturnedUseCase: any;

    beforeEach(() => {
      mockMarkSaleReturnedUseCase = { execute: jest.fn() };
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
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        mockMarkSaleReturnedUseCase,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any
      );
    });

    it('Given: completed sale When: marking returned Then: should return success', async () => {
      // Arrange
      mockMarkSaleReturnedUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockSaleData, status: 'RETURNED' },
          message: 'Sale marked as returned',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.markAsReturned('sale-123', 'org-123', mockRequest as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockMarkSaleReturnedUseCase.execute).toHaveBeenCalledWith({
        saleId: 'sale-123',
        orgId: 'org-123',
        userId: 'user-123',
      });
    });

    it('Given: error When: marking returned Then: should throw', async () => {
      // Arrange
      mockMarkSaleReturnedUseCase.execute.mockResolvedValue(
        err(new ValidationError('Cannot mark as returned'))
      );

      // Act & Assert
      await expect(
        controller.markAsReturned('sale-123', 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('swapSaleLine', () => {
    let mockSwapSaleLineUseCase: any;

    beforeEach(() => {
      mockSwapSaleLineUseCase = { execute: jest.fn() };
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
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        mockSwapSaleLineUseCase,
        { execute: jest.fn() } as any
      );
    });

    it('Given: valid swap data When: swapping line Then: should return success', async () => {
      // Arrange
      const swapDto = {
        lineId: 'line-123',
        replacementProductId: 'prod-456',
        swapQuantity: 2,
        sourceWarehouseId: 'wh-123',
        pricingStrategy: 'KEEP_ORIGINAL',
        newSalePrice: undefined,
        currency: 'USD',
        reason: 'Customer request',
      };
      mockSwapSaleLineUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { saleId: 'sale-123', swapId: 'swap-123' },
          message: 'Line swapped',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.swapSaleLine(
        'sale-123',
        swapDto as any,
        'org-123',
        mockRequest as any
      );

      // Assert
      expect(result.success).toBe(true);
      expect(mockSwapSaleLineUseCase.execute).toHaveBeenCalledWith({
        saleId: 'sale-123',
        lineId: 'line-123',
        replacementProductId: 'prod-456',
        swapQuantity: 2,
        sourceWarehouseId: 'wh-123',
        pricingStrategy: 'KEEP_ORIGINAL',
        newSalePrice: undefined,
        currency: 'USD',
        reason: 'Customer request',
        performedBy: 'user-123',
        orgId: 'org-123',
      });
    });

    it('Given: error When: swapping line Then: should throw', async () => {
      // Arrange
      const swapDto = {
        lineId: 'line-123',
        replacementProductId: 'prod-456',
      };
      mockSwapSaleLineUseCase.execute.mockResolvedValue(
        err(new ValidationError('Insufficient stock'))
      );

      // Act & Assert
      await expect(
        controller.swapSaleLine('sale-123', swapDto as any, 'org-123', mockRequest as any)
      ).rejects.toThrow();
    });
  });

  describe('getSaleSwaps', () => {
    let mockGetSaleSwapsUseCase: any;

    beforeEach(() => {
      mockGetSaleSwapsUseCase = { execute: jest.fn() };
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
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        { execute: jest.fn() } as any,
        mockGetSaleSwapsUseCase
      );
    });

    it('Given: sale with swaps When: getting swaps Then: should return swap history', async () => {
      // Arrange
      const swapData = [
        { id: 'swap-123', originalProductId: 'prod-1', replacementProductId: 'prod-2' },
      ];
      mockGetSaleSwapsUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: swapData,
          message: 'Swaps retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getSaleSwaps('sale-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockGetSaleSwapsUseCase.execute).toHaveBeenCalledWith({
        saleId: 'sale-123',
        orgId: 'org-123',
      });
    });

    it('Given: error When: getting swaps Then: should throw', async () => {
      // Arrange
      mockGetSaleSwapsUseCase.execute.mockResolvedValue(err(new NotFoundError('Sale not found')));

      // Act & Assert
      await expect(controller.getSaleSwaps('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('createSale - additional branches', () => {
    it('Given: all optional fields When: creating sale Then: should pass all fields', async () => {
      // Arrange
      const dto = {
        warehouseId: 'wh-123',
        contactId: 'contact-123',
        customerReference: 'CUST-REF-001',
        externalReference: 'EXT-REF-001',
        note: 'Test note',
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
      expect(mockCreateSaleUseCase.execute).toHaveBeenCalledWith({
        warehouseId: 'wh-123',
        contactId: 'contact-123',
        customerReference: 'CUST-REF-001',
        externalReference: 'EXT-REF-001',
        note: 'Test note',
        lines: [{ productId: 'prod-1', quantity: 10, salePrice: 100 }],
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });
  });
});
