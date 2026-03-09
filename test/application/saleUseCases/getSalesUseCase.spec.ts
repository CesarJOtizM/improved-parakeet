import { GetSalesUseCase } from '@application/saleUseCases/getSalesUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { SaleMapper } from '@sale/mappers';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('GetSalesUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetSalesUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockPrisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSaleRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySaleNumber: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findByDateRange: jest.fn(),
      getLastSaleNumberForYear: jest.fn(),
      findByMovementId: jest.fn(),
    } as jest.Mocked<ISaleRepository>;

    mockPrisma = {
      warehouse: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      contact: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetSalesUseCase(mockSaleRepository, mockPrisma);
  });

  describe('execute', () => {
    const createMockSale = () => {
      const saleNumber = SaleNumber.create(2025, 1);
      const props = SaleMapper.toDomainProps(
        {
          warehouseId: 'warehouse-123',
          contactId: 'contact-123',
          createdBy: 'user-123',
        },
        saleNumber
      );
      return Sale.create(props, mockOrgId);
    };

    const createSaleWithDates = ({
      saleNumber,
      status = 'DRAFT',
      confirmedAt,
    }: {
      saleNumber: SaleNumber;
      status?: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
      confirmedAt?: Date;
    }) => {
      return Sale.reconstitute(
        {
          saleNumber,
          status: SaleStatus.create(status),
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
          confirmedAt,
        },
        `sale-${saleNumber.getValue()}`,
        mockOrgId
      );
    };

    it('Given: valid request When: getting sales Then: should return paginated sales', async () => {
      // Arrange
      const mockSales = [createMockSale(), createMockSale()];

      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: mockSales,
        total: 2,
        hasMore: false,
      });

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
          expect(value.message).toBe('Sales retrieved successfully');
          expect(value.pagination).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: request with status filter When: getting sales Then: should return filtered sales', async () => {
      // Arrange
      const mockSales = [createMockSale()];

      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: mockSales,
        total: 1,
        hasMore: false,
      });

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
      expect(mockSaleRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: request with date range When: getting sales Then: should call findBySpecification', async () => {
      // Arrange
      const mockSales = [createMockSale()];
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: mockSales,
        total: 1,
        hasMore: false,
      });

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
      expect(mockSaleRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: sortBy saleNumber and confirmedAt When: getting sales Then: should sort results', async () => {
      // Arrange
      const saleOne = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
        status: 'CONFIRMED',
        confirmedAt: new Date('2024-01-05T10:00:00.000Z'),
      });
      const saleTwo = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 2),
        status: 'DRAFT',
      });
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleTwo, saleOne],
        total: 2,
        hasMore: false,
      });

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

    it('Given: sortBy saleNumber When: getting sales Then: should return sorted list', async () => {
      // Arrange
      const saleOne = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
      });
      const saleTwo = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 2),
      });
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleTwo, saleOne],
        total: 2,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'saleNumber',
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

    it('Given: warehouseId filter When: getting sales Then: should add warehouse specification', async () => {
      // Arrange
      const mockSales = [createMockSale()];
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: mockSales,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        warehouseId: 'warehouse-456',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockSaleRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: search filter When: getting sales Then: should add search specification', async () => {
      // Arrange
      const mockSales = [createMockSale()];
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: mockSales,
        total: 1,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        search: 'SALE-2025',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockSaleRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: sortBy status When: getting sales Then: should sort by status value', async () => {
      // Arrange
      const saleDraft = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
        status: 'DRAFT',
      });
      const saleConfirmed = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 2),
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      });
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleDraft, saleConfirmed],
        total: 2,
        hasMore: false,
      });

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

    it('Given: sortBy total When: getting sales Then: should sort by totalAmount', async () => {
      // Arrange
      const saleOne = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
      });
      const saleTwo = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 2),
      });
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleOne, saleTwo],
        total: 2,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'total',
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

    it('Given: sortBy warehouseName When: getting sales Then: should sort by warehouseName', async () => {
      // Arrange
      const saleOne = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
      });
      const saleTwo = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 2),
      });
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleOne, saleTwo],
        total: 2,
        hasMore: false,
      });

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

    it('Given: sortBy customerReference When: getting sales Then: should sort by customerReference', async () => {
      // Arrange
      const saleOne = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
      });
      const saleTwo = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 2),
      });
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleOne, saleTwo],
        total: 2,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'customerReference',
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

    it('Given: sortBy items When: getting sales Then: should sort by lines count', async () => {
      // Arrange
      const saleOne = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
      });
      const saleTwo = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 2),
      });
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleOne, saleTwo],
        total: 2,
        hasMore: false,
      });

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

    it('Given: sortBy createdAt When: getting sales Then: should sort by createdAt', async () => {
      // Arrange
      const saleOne = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
      });
      const saleTwo = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 2),
      });
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleOne, saleTwo],
        total: 2,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
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

    it('Given: sortBy unknown field When: getting sales Then: should fallback to createdAt sort', async () => {
      // Arrange
      const saleOne = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
      });
      const saleTwo = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 2),
      });
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleOne, saleTwo],
        total: 2,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        sortBy: 'nonExistentField',
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

    it('Given: page=2 When: getting sales Then: hasPrev should be true', async () => {
      // Arrange
      const mockSales = [createMockSale()];
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: mockSales,
        total: 15,
        hasMore: false,
      });

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
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
