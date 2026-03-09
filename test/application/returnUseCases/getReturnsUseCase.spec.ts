import { GetReturnsUseCase } from '@application/returnUseCases/getReturnsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { ReturnMapper } from '@returns/mappers';

import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('GetReturnsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetReturnsUseCase;
  let mockReturnRepository: jest.Mocked<IReturnRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;

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

    mockPrisma = {
      return: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetReturnsUseCase(mockReturnRepository, mockPrisma);
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

    it('Given: empty results When: getting returns Then: should return empty data with pagination', async () => {
      // Arrange
      mockReturnRepository.findAll.mockResolvedValue([]);

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

    it('Given: no page/limit provided When: getting returns Then: should use defaults', async () => {
      // Arrange
      mockReturnRepository.findAll.mockResolvedValue([]);

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

    it('Given: status + type + dateRange combined filters When: getting returns Then: status takes priority', async () => {
      // Arrange - status filter takes priority in the if/else chain
      const mockReturn = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        status: 'DRAFT',
        type: 'RETURN_CUSTOMER',
      });
      mockReturnRepository.findByStatus.mockResolvedValue([mockReturn]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'DRAFT',
        type: 'RETURN_CUSTOMER',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockReturnRepository.findByStatus).toHaveBeenCalledWith('DRAFT', mockOrgId);
      // findByType and findByDateRange should NOT be called
      expect(mockReturnRepository.findByType).not.toHaveBeenCalled();
      expect(mockReturnRepository.findByDateRange).not.toHaveBeenCalled();
    });

    it('Given: type filter without status When: getting returns Then: should use findByType', async () => {
      // Arrange
      const mockReturn = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        type: 'RETURN_SUPPLIER',
      });
      mockReturnRepository.findByType.mockResolvedValue([mockReturn]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        type: 'RETURN_SUPPLIER',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockReturnRepository.findByType).toHaveBeenCalledWith('RETURN_SUPPLIER', mockOrgId);
    });

    it('Given: warehouseId filter with empty results When: getting returns Then: should skip warehouse filtering', async () => {
      // Arrange - empty results means warehouseId filter is skipped
      mockReturnRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        warehouseId: 'warehouse-999',
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

    it('Given: status filter with empty results When: getting returns Then: should skip status post-filtering', async () => {
      // Arrange
      mockReturnRepository.findByStatus.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'CONFIRMED',
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

    it('Given: type filter with empty results When: getting returns Then: should skip type post-filtering', async () => {
      // Arrange
      mockReturnRepository.findByType.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        type: 'RETURN_CUSTOMER',
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

    it('Given: search filter with empty results When: getting returns Then: should skip search filtering', async () => {
      // Arrange
      mockReturnRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        search: 'NONEXISTENT',
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

    it('Given: companyId filter When: getting returns Then: should filter by company via prisma', async () => {
      // Arrange
      const mockReturn = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
      });
      mockReturnRepository.findAll.mockResolvedValue([mockReturn]);

      (mockPrisma.return.findMany as jest.Mock).mockResolvedValue([{ id: mockReturn.id }]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        companyId: 'company-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockPrisma.return.findMany).toHaveBeenCalled();
    });

    it('Given: companyId filter with empty results When: getting returns Then: should skip company filtering', async () => {
      // Arrange
      mockReturnRepository.findAll.mockResolvedValue([]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        companyId: 'company-123',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      // prisma.return.findMany should NOT be called since returns is empty
      expect(mockPrisma.return.findMany).not.toHaveBeenCalled();
    });

    it('Given: sortBy warehouseName When: getting returns Then: should sort by warehouseName', async () => {
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
        sortBy: 'warehouseName',
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

    it('Given: sortBy with no sortOrder When: getting returns Then: should default to asc', async () => {
      // Arrange
      const returnDraft = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        status: 'DRAFT',
      });
      const returnConfirmed = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      });
      mockReturnRepository.findAll.mockResolvedValue([returnDraft, returnConfirmed]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'status',
        // no sortOrder provided - should default to 'asc'
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          // CONFIRMED < DRAFT alphabetically (asc default)
          expect(value.data[0].status).toBe('CONFIRMED');
          expect(value.data[1].status).toBe('DRAFT');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: page=2 When: getting returns Then: hasPrev should be true', async () => {
      // Arrange
      const returns = Array.from({ length: 15 }, (_, i) =>
        createReturnWithDates({
          returnNumber: ReturnNumber.create(2025, i + 1),
        })
      );
      mockReturnRepository.findAll.mockResolvedValue(returns);

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

    it('Given: comma-separated warehouseId filter When: getting returns Then: should filter multiple warehouses', async () => {
      // Arrange
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        warehouseId: 'wh-1',
      });
      const returnTwo = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        warehouseId: 'wh-2',
      });
      const returnThree = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 3),
        warehouseId: 'wh-3',
      });
      mockReturnRepository.findAll.mockResolvedValue([returnOne, returnTwo, returnThree]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        warehouseId: 'wh-1,wh-2',
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

    it('Given: comma-separated status filter with results When: getting returns Then: should post-filter by comma statuses', async () => {
      // Arrange
      const returnDraft = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        status: 'DRAFT',
      });
      const returnConfirmed = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      });
      const returnCancelled = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 3),
        status: 'CANCELLED',
      });
      // findByStatus returns all (it was fetched by comma-separated string)
      mockReturnRepository.findByStatus.mockResolvedValue([
        returnDraft,
        returnConfirmed,
        returnCancelled,
      ]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        status: 'DRAFT,CONFIRMED',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(2);
          const statuses = value.data.map((d: any) => d.status);
          expect(statuses).toContain('DRAFT');
          expect(statuses).toContain('CONFIRMED');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: comma-separated type filter with results When: getting returns Then: should post-filter by types', async () => {
      // Arrange
      const returnCustomer = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        type: 'RETURN_CUSTOMER',
      });
      const returnSupplier = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        type: 'RETURN_SUPPLIER',
      });
      mockReturnRepository.findByType.mockResolvedValue([returnCustomer, returnSupplier]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        type: 'RETURN_CUSTOMER',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
          expect(value.data[0].type).toBe('RETURN_CUSTOMER');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sort with equal values When: getting returns Then: should return 0 (stable sort)', async () => {
      // Arrange - both returns have same status so sorting by status yields equal comparison
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        status: 'DRAFT',
      });
      const returnTwo = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        status: 'DRAFT',
      });
      mockReturnRepository.findAll.mockResolvedValue([returnOne, returnTwo]);

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
          // Both DRAFT - should be stable
          expect(value.data[0].status).toBe('DRAFT');
          expect(value.data[1].status).toBe('DRAFT');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy confirmedAt with both null confirmedAt When: sorting Then: should treat as 0', async () => {
      // Arrange - both have no confirmedAt so both get 0 in sort
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
        status: 'DRAFT',
      });
      const returnTwo = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 2),
        status: 'DRAFT',
      });
      mockReturnRepository.findAll.mockResolvedValue([returnOne, returnTwo]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'confirmedAt',
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

    it('Given: companyId filter that excludes all returns When: getting returns Then: should return empty', async () => {
      // Arrange
      const mockReturn = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
      });
      mockReturnRepository.findAll.mockResolvedValue([mockReturn]);
      (mockPrisma.return.findMany as jest.Mock).mockResolvedValue([]); // no matching IDs

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        companyId: 'company-that-matches-nothing',
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

    it('Given: no sortBy When: getting returns Then: should not sort', async () => {
      // Arrange
      const returnOne = createReturnWithDates({
        returnNumber: ReturnNumber.create(2025, 1),
      });
      mockReturnRepository.findAll.mockResolvedValue([returnOne]);

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        // no sortBy
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(1);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: page beyond total When: getting returns Then: should return empty data with hasPrev true', async () => {
      // Arrange
      const returns = [createReturnWithDates({ returnNumber: ReturnNumber.create(2025, 1) })];
      mockReturnRepository.findAll.mockResolvedValue(returns);

      const request = {
        orgId: mockOrgId,
        page: 5,
        limit: 10,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data).toHaveLength(0);
          expect(value.pagination.hasPrev).toBe(true);
          expect(value.pagination.hasNext).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
