import { GetReturnsUseCase } from '@application/returnUseCases/getReturnsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnMapper } from '@returns/mappers';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

describe('GetReturnsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetReturnsUseCase;
  let mockReturnRepository: jest.Mocked<IReturnRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockReturnRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByReturnNumber: jest.fn(),
      findByStatus: jest.fn(),
      findByType: jest.fn(),
      findBySaleId: jest.fn(),
      findBySourceMovementId: jest.fn(),
      findByDateRange: jest.fn(),
      getLastReturnNumberForYear: jest.fn(),
      findByReturnMovementId: jest.fn(),
    } as jest.Mocked<IReturnRepository>;

    useCase = new GetReturnsUseCase(mockReturnRepository);
  });

  describe('execute', () => {
    const createMockReturn = () => {
      const returnNumber = ReturnNumber.create(2025, 1);
      const props = ReturnMapper.toDomainProps(
        {
          type: 'RETURN_CUSTOMER',
          warehouseId: 'warehouse-123',
          saleId: 'sale-123',
          createdBy: 'user-123',
        },
        returnNumber
      );
      return Return.create(props, mockOrgId);
    };

    it('Given: valid request When: getting returns Then: should return paginated returns', async () => {
      // Arrange
      const mockReturns = [createMockReturn(), createMockReturn()];
      mockReturnRepository.findAll.mockResolvedValue(mockReturns);

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
          expect(value.message).toBe('Returns retrieved successfully');
          expect(value.pagination).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with status filter When: getting returns Then: should return filtered returns', async () => {
      // Arrange
      const mockReturns = [createMockReturn()];
      mockReturnRepository.findByStatus.mockResolvedValue(mockReturns);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'DRAFT',
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
      expect(mockReturnRepository.findByStatus).toHaveBeenCalledWith('DRAFT', mockOrgId);
    });
  });
});
