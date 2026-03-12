import { MovementsController } from '@interface/http/inventory/movements.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { CreateMovementDto } from '@movement/dto/createMovement.dto';
import { GetMovementsQueryDto } from '@movement/dto/getMovements.dto';
import { ok, err } from '@shared/domain/result';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { Request } from 'express';

// Mock authenticated user type for testing
interface IAuthenticatedUser {
  id: string;
  orgId: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
  jti: string;
}

describe('MovementsController', () => {
  let controller: MovementsController;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockCreateMovementUseCase: { execute: jest.Mock<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGetMovementsUseCase: { execute: jest.Mock<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockPostMovementUseCase: { execute: jest.Mock<any> };

  const mockMovementData = {
    id: 'movement-123',
    type: 'ENTRY',
    status: 'DRAFT',
    warehouseId: 'warehouse-123',
    lines: [],
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest: Partial<Request> & { user: IAuthenticatedUser } = {
    user: {
      id: 'user-123',
      orgId: 'org-123',
      email: 'test@test.com',
      username: 'testuser',
      roles: ['USER'],
      permissions: [],
      jti: 'test-jti',
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockGetMovementByIdUseCase: { execute: jest.Mock<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockUpdateMovementUseCase: { execute: jest.Mock<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockDeleteMovementUseCase: { execute: jest.Mock<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockVoidMovementUseCase: { execute: jest.Mock<any> };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockMarkMovementReturnedUseCase: { execute: jest.Mock<any> };

  beforeEach(() => {
    mockCreateMovementUseCase = {
      execute: jest.fn(),
    };
    mockGetMovementsUseCase = {
      execute: jest.fn(),
    };
    mockPostMovementUseCase = {
      execute: jest.fn(),
    };
    mockGetMovementByIdUseCase = {
      execute: jest.fn(),
    };
    mockUpdateMovementUseCase = {
      execute: jest.fn(),
    };
    mockDeleteMovementUseCase = {
      execute: jest.fn(),
    };
    mockVoidMovementUseCase = {
      execute: jest.fn(),
    };
    mockMarkMovementReturnedUseCase = {
      execute: jest.fn(),
    };

    controller = new MovementsController(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreateMovementUseCase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetMovementsUseCase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetMovementByIdUseCase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPostMovementUseCase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUpdateMovementUseCase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDeleteMovementUseCase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockVoidMovementUseCase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockMarkMovementReturnedUseCase as any
    );
  });

  describe('createMovement', () => {
    it('Given: valid movement data When: creating Then: should return created movement', async () => {
      // Arrange
      const dto = {
        type: 'ENTRY',
        warehouseId: 'warehouse-123',
        lines: [{ productId: 'product-123', quantity: 10, locationId: 'loc-123' }],
      };
      mockCreateMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockMovementData,
          message: 'Movement created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createMovement(
        dto as CreateMovementDto,
        'org-123',
        mockRequest as Request
      );

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.type).toBe('ENTRY');
    });

    it('Given: invalid data When: creating Then: should throw', async () => {
      // Arrange
      const dto = { type: 'INVALID' };
      mockCreateMovementUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid movement type'))
      );

      // Act & Assert
      await expect(
        controller.createMovement(dto as CreateMovementDto, 'org-123', mockRequest as Request)
      ).rejects.toThrow();
    });
  });

  describe('getMovements', () => {
    it('Given: valid query When: getting movements Then: should return movement list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: { items: [mockMovementData], total: 1, page: 1, limit: 10 },
        message: 'Movements retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetMovementsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      const result = await controller.getMovements(query as GetMovementsQueryDto, 'org-123');

      // Assert - getMovements uses resultToHttpResponse so returns the value directly
      expect(result.success).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.data as any).items).toHaveLength(1);
    });
  });

  describe('postMovement', () => {
    it('Given: valid movement id When: posting Then: should return posted movement', async () => {
      // Arrange
      mockPostMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockMovementData, status: 'POSTED' },
          message: 'Movement posted',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.postMovement(
        'movement-123',
        'org-123',
        mockRequest as Request
      );

      // Assert
      expect(result.success).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.data as any).status).toBe('POSTED');
    });

    it('Given: non-existent movement When: posting Then: should throw', async () => {
      // Arrange
      mockPostMovementUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Movement not found'))
      );

      // Act & Assert
      await expect(
        controller.postMovement('non-existent', 'org-123', mockRequest as Request)
      ).rejects.toThrow();
    });

    it('Given: valid movement When: posting Then: should pass postedBy from request user', async () => {
      // Arrange
      mockPostMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockMovementData, status: 'POSTED' },
          message: 'Movement posted',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.postMovement('movement-123', 'org-123', mockRequest as Request);

      // Assert
      expect(mockPostMovementUseCase.execute).toHaveBeenCalledWith({
        movementId: 'movement-123',
        orgId: 'org-123',
        postedBy: 'user-123',
      });
    });
  });

  describe('getMovementById', () => {
    it('Given: valid movement id When: getting by id Then: should return movement', async () => {
      // Arrange
      mockGetMovementByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockMovementData,
          message: 'Movement retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getMovementById('movement-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.data as any).id).toBe('movement-123');
      expect(mockGetMovementByIdUseCase.execute).toHaveBeenCalledWith({
        movementId: 'movement-123',
        orgId: 'org-123',
      });
    });

    it('Given: non-existent movement id When: getting by id Then: should throw', async () => {
      // Arrange
      mockGetMovementByIdUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Movement not found'))
      );

      // Act & Assert
      await expect(controller.getMovementById('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('updateMovement', () => {
    it('Given: valid update data When: updating draft movement Then: should return updated movement', async () => {
      // Arrange
      const updateDto = {
        reference: 'REF-UPDATED',
        reason: 'Updated reason',
        note: 'Updated note',
        contactId: 'contact-456',
        lines: [{ productId: 'product-123', quantity: 20, locationId: 'loc-123' }],
      };
      mockUpdateMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockMovementData, ...updateDto },
          message: 'Movement updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.updateMovement('movement-123', updateDto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockUpdateMovementUseCase.execute).toHaveBeenCalledWith({
        movementId: 'movement-123',
        orgId: 'org-123',
        reference: 'REF-UPDATED',
        reason: 'Updated reason',
        note: 'Updated note',
        contactId: 'contact-456',
        lines: updateDto.lines,
      });
    });

    it('Given: non-draft movement When: updating Then: should throw', async () => {
      // Arrange
      const updateDto = { reason: 'Changed' };
      mockUpdateMovementUseCase.execute.mockResolvedValue(
        err(new ValidationError('Movement cannot be updated'))
      );

      // Act & Assert
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(
        controller.updateMovement('movement-123', updateDto as any, 'org-123')
      ).rejects.toThrow();
    });
  });

  describe('deleteMovement', () => {
    it('Given: valid draft movement When: deleting Then: should return success', async () => {
      // Arrange
      mockDeleteMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: null,
          message: 'Movement deleted',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.deleteMovement('movement-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockDeleteMovementUseCase.execute).toHaveBeenCalledWith({
        movementId: 'movement-123',
        orgId: 'org-123',
      });
    });

    it('Given: non-existent movement When: deleting Then: should throw', async () => {
      // Arrange
      mockDeleteMovementUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Movement not found'))
      );

      // Act & Assert
      await expect(controller.deleteMovement('non-existent', 'org-123')).rejects.toThrow();
    });

    it('Given: non-draft movement When: deleting Then: should throw', async () => {
      // Arrange
      mockDeleteMovementUseCase.execute.mockResolvedValue(
        err(new ValidationError('Movement cannot be deleted'))
      );

      // Act & Assert
      await expect(controller.deleteMovement('movement-123', 'org-123')).rejects.toThrow();
    });
  });

  describe('voidMovement', () => {
    it('Given: posted movement When: voiding Then: should return voided movement', async () => {
      // Arrange
      mockVoidMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockMovementData, status: 'VOID' },
          message: 'Movement voided',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.voidMovement('movement-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.data as any).status).toBe('VOID');
      expect(mockVoidMovementUseCase.execute).toHaveBeenCalledWith({
        movementId: 'movement-123',
        orgId: 'org-123',
      });
    });

    it('Given: non-posted movement When: voiding Then: should throw', async () => {
      // Arrange
      mockVoidMovementUseCase.execute.mockResolvedValue(
        err(new ValidationError('Movement cannot be voided'))
      );

      // Act & Assert
      await expect(controller.voidMovement('movement-123', 'org-123')).rejects.toThrow();
    });

    it('Given: non-existent movement When: voiding Then: should throw', async () => {
      // Arrange
      mockVoidMovementUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Movement not found'))
      );

      // Act & Assert
      await expect(controller.voidMovement('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('markAsReturned', () => {
    it('Given: posted movement When: marking as returned Then: should return returned movement', async () => {
      // Arrange
      mockMarkMovementReturnedUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockMovementData, status: 'RETURNED' },
          message: 'Movement marked as returned',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.markAsReturned(
        'movement-123',
        'org-123',
        mockRequest as Request
      );

      // Assert
      expect(result.success).toBe(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((result.data as any).status).toBe('RETURNED');
      expect(mockMarkMovementReturnedUseCase.execute).toHaveBeenCalledWith({
        movementId: 'movement-123',
        orgId: 'org-123',
        userId: 'user-123',
      });
    });

    it('Given: non-posted movement When: marking as returned Then: should throw', async () => {
      // Arrange
      mockMarkMovementReturnedUseCase.execute.mockResolvedValue(
        err(new ValidationError('Movement cannot be marked as returned'))
      );

      // Act & Assert
      await expect(
        controller.markAsReturned('movement-123', 'org-123', mockRequest as Request)
      ).rejects.toThrow();
    });

    it('Given: non-existent movement When: marking as returned Then: should throw', async () => {
      // Arrange
      mockMarkMovementReturnedUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Movement not found'))
      );

      // Act & Assert
      await expect(
        controller.markAsReturned('non-existent', 'org-123', mockRequest as Request)
      ).rejects.toThrow();
    });
  });

  describe('getMovements - query param branches', () => {
    it('Given: date range filters When: getting movements Then: should convert dates to Date objects', async () => {
      // Arrange
      const query = { page: 1, limit: 10, startDate: '2026-01-01', endDate: '2026-01-31' };
      const responseData = {
        success: true,
        data: { items: [], total: 0, page: 1, limit: 10 },
        message: 'Movements retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetMovementsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      await controller.getMovements(query as GetMovementsQueryDto, 'org-123');

      // Assert
      const callArgs = mockGetMovementsUseCase.execute.mock.calls[0][0] as any;
      expect(callArgs.startDate).toBeInstanceOf(Date);
      expect(callArgs.endDate).toBeInstanceOf(Date);
    });

    it('Given: no date filters When: getting movements Then: dates should be undefined', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: { items: [], total: 0, page: 1, limit: 10 },
        message: 'Movements retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetMovementsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      await controller.getMovements(query as GetMovementsQueryDto, 'org-123');

      // Assert
      const callArgs = mockGetMovementsUseCase.execute.mock.calls[0][0] as any;
      expect(callArgs.startDate).toBeUndefined();
      expect(callArgs.endDate).toBeUndefined();
    });

    it('Given: all filters When: getting movements Then: should pass all filters to use case', async () => {
      // Arrange
      const query = {
        page: 1,
        limit: 10,
        warehouseId: 'wh-1',
        companyId: 'comp-1',
        status: 'POSTED',
        type: 'IN',
        productId: 'prod-1',
        search: 'reference',
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };
      const responseData = {
        success: true,
        data: { items: [], total: 0, page: 1, limit: 10 },
        message: 'Movements retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetMovementsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      await controller.getMovements(query as GetMovementsQueryDto, 'org-123');

      // Assert
      expect(mockGetMovementsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-123',
          warehouseId: 'wh-1',
          companyId: 'comp-1',
          status: 'POSTED',
          type: 'IN',
          productId: 'prod-1',
          search: 'reference',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        })
      );
    });

    it('Given: use case error When: getting movements Then: should throw', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      mockGetMovementsUseCase.execute.mockResolvedValue(
        err(new ValidationError('Failed to retrieve movements'))
      );

      // Act & Assert
      await expect(
        controller.getMovements(query as GetMovementsQueryDto, 'org-123')
      ).rejects.toThrow();
    });
  });

  describe('createMovement - field mapping', () => {
    it('Given: all optional fields When: creating Then: should pass all fields to use case', async () => {
      // Arrange
      const dto = {
        type: 'IN',
        warehouseId: 'warehouse-123',
        contactId: 'contact-456',
        reference: 'REF-001',
        reason: 'Stock replenishment',
        note: 'Weekly delivery',
        lines: [{ productId: 'product-123', quantity: 10, locationId: 'loc-123' }],
      };
      mockCreateMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockMovementData,
          message: 'Movement created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.createMovement(dto as CreateMovementDto, 'org-123', mockRequest as Request);

      // Assert
      expect(mockCreateMovementUseCase.execute).toHaveBeenCalledWith({
        type: 'IN',
        warehouseId: 'warehouse-123',
        contactId: 'contact-456',
        reference: 'REF-001',
        reason: 'Stock replenishment',
        note: 'Weekly delivery',
        lines: dto.lines,
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });

    it('Given: no optional fields When: creating Then: should pass undefined for optional fields', async () => {
      // Arrange
      const dto = {
        type: 'OUT',
        warehouseId: 'warehouse-123',
        lines: [{ productId: 'product-123', quantity: 5, locationId: 'loc-123' }],
      };
      mockCreateMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockMovementData,
          message: 'Movement created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.createMovement(dto as CreateMovementDto, 'org-123', mockRequest as Request);

      // Assert
      expect(mockCreateMovementUseCase.execute).toHaveBeenCalledWith({
        type: 'OUT',
        warehouseId: 'warehouse-123',
        contactId: undefined,
        reference: undefined,
        reason: undefined,
        note: undefined,
        lines: dto.lines,
        createdBy: 'user-123',
        orgId: 'org-123',
      });
    });
  });

  describe('getMovements - partial date branches', () => {
    it('Given: only startDate When: getting movements Then: startDate should be Date and endDate undefined', async () => {
      // Arrange
      const query = { page: 1, limit: 10, startDate: '2026-01-01' };
      const responseData = {
        success: true,
        data: { items: [], total: 0, page: 1, limit: 10 },
        message: 'Movements retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetMovementsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      await controller.getMovements(query as GetMovementsQueryDto, 'org-123');

      // Assert
      const callArgs = mockGetMovementsUseCase.execute.mock.calls[0][0] as any;
      expect(callArgs.startDate).toBeInstanceOf(Date);
      expect(callArgs.endDate).toBeUndefined();
    });

    it('Given: only endDate When: getting movements Then: endDate should be Date and startDate undefined', async () => {
      // Arrange
      const query = { page: 1, limit: 10, endDate: '2026-01-31' };
      const responseData = {
        success: true,
        data: { items: [], total: 0, page: 1, limit: 10 },
        message: 'Movements retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetMovementsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      await controller.getMovements(query as GetMovementsQueryDto, 'org-123');

      // Assert
      const callArgs = mockGetMovementsUseCase.execute.mock.calls[0][0] as any;
      expect(callArgs.startDate).toBeUndefined();
      expect(callArgs.endDate).toBeInstanceOf(Date);
    });
  });

  describe('updateMovement - partial field mapping', () => {
    it('Given: only reference When: updating Then: should pass only reference with other fields undefined', async () => {
      // Arrange
      const updateDto = { reference: 'REF-ONLY' };
      mockUpdateMovementUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockMovementData, reference: 'REF-ONLY' },
          message: 'Movement updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await controller.updateMovement('movement-123', updateDto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(mockUpdateMovementUseCase.execute).toHaveBeenCalledWith({
        movementId: 'movement-123',
        orgId: 'org-123',
        reference: 'REF-ONLY',
        reason: undefined,
        note: undefined,
        contactId: undefined,
        lines: undefined,
      });
    });
  });
});
