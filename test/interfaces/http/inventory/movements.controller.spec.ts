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

    controller = new MovementsController(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockCreateMovementUseCase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockGetMovementsUseCase as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockPostMovementUseCase as any
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
      const result = await controller.postMovement('movement-123', 'org-123');

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
      await expect(controller.postMovement('non-existent', 'org-123')).rejects.toThrow();
    });
  });
});
