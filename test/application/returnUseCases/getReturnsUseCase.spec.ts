import { GetReturnsUseCase } from '@application/returnUseCases/getReturnsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
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

    const createReturnWithDates = ({
      returnNumber,
      status = 'DRAFT',
      type = 'RETURN_CUSTOMER',
      confirmedAt,
      warehouseId = 'warehouse-123',
    }: {
      returnNumber: ReturnNumber;
      status?: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
      type?: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER';
      confirmedAt?: Date;
      warehouseId?: string;
    }) => {
      return Return.reconstitute(
        {
          returnNumber,
          status: ReturnStatus.create(status),
          type: ReturnType.create(type),
          reason: ReturnMapper.toDomainProps(
            {
              type,
              warehouseId,
              saleId: type === 'RETURN_CUSTOMER' ? 'sale-123' : undefined,
              sourceMovementId: type === 'RETURN_SUPPLIER' ? 'movement-123' : undefined,
              createdBy: 'user-123',
            },
            returnNumber
          ).reason,
          warehouseId,
          saleId: type === 'RETURN_CUSTOMER' ? 'sale-123' : undefined,
          sourceMovementId: type === 'RETURN_SUPPLIER' ? 'movement-123' : undefined,
          createdBy: 'user-123',
          confirmedAt,
        },
        `return-${returnNumber.getValue()}`,
        mockOrgId
      );
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

    it('Given: request with type and warehouse filters When: getting returns Then: should apply additional filters', async () => {
      // Arrange
      const mockReturns = [
        createReturnWithDates({
          returnNumber: ReturnNumber.create(2025, 1),
          type: 'RETURN_CUSTOMER',
          warehouseId: 'warehouse-123',
        }),
        createReturnWithDates({
          returnNumber: ReturnNumber.create(2025, 2),
          type: 'RETURN_SUPPLIER',
          warehouseId: 'warehouse-999',
        }),
      ];
      mockReturnRepository.findByType.mockResolvedValue(mockReturns);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        type: 'RETURN_CUSTOMER',
        warehouseId: 'warehouse-123',
        sortBy: 'returnNumber',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].warehouseId).toBe('warehouse-123');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with date range When: getting returns Then: should call findByDateRange', async () => {
      // Arrange
      mockReturnRepository.findByDateRange.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-02-01T00:00:00.000Z'),
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockReturnRepository.findByDateRange).toHaveBeenCalled();
    });

    it('Given: sortBy confirmedAt When: getting returns Then: should sort results', async () => {
      // Arrange
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        status: 'CONFIRMED',
        confirmedAt: new Date('2024-01-10T10:00:00.000Z'),
      });
      const returnTwo = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        status: 'DRAFT',
      });
      mockReturnRepository.findAll.mockResolvedValue([returnTwo, returnOne]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'confirmedAt',
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

    it('Given: request with search filter on returnNumber When: getting returns Then: should filter by returnNumber', async () => {
      // Arrange
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
      });
      const returnTwo = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
      });
      mockReturnRepository.findAll.mockResolvedValue([returnOne, returnTwo]);

      // ReturnNumber format is RETURN-YYYY-NNN, so sequence 1 = RETURN-2025-001
      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        search: 'RETURN-2025-001',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].returnNumber).toBe('RETURN-2025-001');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy status When: getting returns Then: should sort by status', async () => {
      // Arrange
      const returnDraft = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        status: 'DRAFT',
      });
      const returnConfirmed = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        status: 'CONFIRMED',
        confirmedAt: new Date('2024-01-10T10:00:00.000Z'),
      });
      mockReturnRepository.findAll.mockResolvedValue([returnDraft, returnConfirmed]);

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
          // CONFIRMED < DRAFT alphabetically
          expect(value.data[0].status).toBe('CONFIRMED');
          expect(value.data[1].status).toBe('DRAFT');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy type When: getting returns Then: should sort by type', async () => {
      // Arrange
      const returnCustomer = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        type: 'RETURN_CUSTOMER',
      });
      const returnSupplier = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        type: 'RETURN_SUPPLIER',
      });
      mockReturnRepository.findAll.mockResolvedValue([returnSupplier, returnCustomer]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'type',
        sortOrder: 'asc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          // RETURN_CUSTOMER < RETURN_SUPPLIER alphabetically
          expect(value.data[0].type).toBe('RETURN_CUSTOMER');
          expect(value.data[1].type).toBe('RETURN_SUPPLIER');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy total When: getting returns Then: should sort by totalAmount', async () => {
      // Arrange
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
      });
      const returnTwo = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
      });
      mockReturnRepository.findAll.mockResolvedValue([returnOne, returnTwo]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'total',
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

    it('Given: sortBy items When: getting returns Then: should sort by lines count', async () => {
      // Arrange
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
      });
      const returnTwo = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
      });
      mockReturnRepository.findAll.mockResolvedValue([returnOne, returnTwo]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'items',
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

    it('Given: sortBy createdAt When: getting returns Then: should sort by createdAt', async () => {
      // Arrange
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
      });
      const returnTwo = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
      });
      mockReturnRepository.findAll.mockResolvedValue([returnOne, returnTwo]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
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

    it('Given: sortBy unknown field When: getting returns Then: should fallback to createdAt sort', async () => {
      // Arrange
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
      });
      const returnTwo = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
      });
      mockReturnRepository.findAll.mockResolvedValue([returnOne, returnTwo]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'unknownField',
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

    it('Given: sortOrder desc on status field When: getting returns Then: should reverse sort order', async () => {
      // Arrange
      const returnDraft = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        status: 'DRAFT',
      });
      const returnConfirmed = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        status: 'CONFIRMED',
        confirmedAt: new Date('2024-01-10T10:00:00.000Z'),
      });
      mockReturnRepository.findAll.mockResolvedValue([returnDraft, returnConfirmed]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'status',
        sortOrder: 'desc' as const,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          // desc: DRAFT > CONFIRMED alphabetically
          expect(value.data[0].status).toBe('DRAFT');
          expect(value.data[1].status).toBe('CONFIRMED');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
