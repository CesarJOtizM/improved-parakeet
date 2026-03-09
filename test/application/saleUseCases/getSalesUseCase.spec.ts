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

    it('Given: empty results When: getting sales Then: should return empty data with pagination', async () => {
      // Arrange
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [],
        total: 0,
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

    it('Given: no page/limit provided When: getting sales Then: should use defaults', async () => {
      // Arrange
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

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

    it('Given: combined filters When: getting sales Then: should compose all specifications', async () => {
      // Arrange
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        companyId: 'company-123',
        warehouseId: 'warehouse-456',
        status: 'CONFIRMED',
        search: 'SALE-2025',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockSaleRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: enrichment with warehouse, contact, and user data When: getting sales Then: should enrich sale data', async () => {
      // Arrange
      const sale = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      });
      // Set contactId and confirmedBy on the sale via reconstitute
      const saleWithContact = Sale.reconstitute(
        {
          saleNumber: SaleNumber.create(2025, 1),
          status: SaleStatus.create('CONFIRMED'),
          warehouseId: 'warehouse-123',
          contactId: 'contact-456',
          confirmedBy: 'user-789',
          confirmedAt: new Date(),
          cancelledBy: 'user-cancel-1',
          createdBy: 'user-123',
        },
        'sale-enriched',
        mockOrgId
      );

      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleWithContact],
        total: 1,
        hasMore: false,
      });

      (mockPrisma.warehouse.findMany as jest.Mock).mockResolvedValue([
        { id: 'warehouse-123', name: 'Main Warehouse', code: 'WH-01' },
      ]);
      (mockPrisma.contact.findMany as jest.Mock).mockResolvedValue([
        { id: 'contact-456', name: 'John Doe' },
      ]);
      (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 'user-789', firstName: 'Jane', lastName: 'Smith' },
        { id: 'user-cancel-1', firstName: 'Admin', lastName: 'User' },
      ]);

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
          expect(value.data[0].warehouseName).toBe('Main Warehouse (WH-01)');
          expect(value.data[0].contactName).toBe('John Doe');
          expect(value.data[0].confirmedByName).toBe('Jane Smith');
          expect(value.data[0].cancelledByName).toBe('Admin User');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: enrichment with null contact and null warehouse When: getting sales Then: should leave names undefined', async () => {
      // Arrange
      const sale = createSaleWithDates({
        saleNumber: SaleNumber.create(2025, 1),
      });

      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [sale],
        total: 1,
        hasMore: false,
      });

      // No warehouse/contact data returned
      (mockPrisma.warehouse.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.contact.findMany as jest.Mock).mockResolvedValue([]);

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
          expect(value.data[0].warehouseName).toBeUndefined();
          expect(value.data[0].contactName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sale with lines and product data When: enriching Then: should enrich line product info', async () => {
      // Arrange - use a sale with lines via includeLines: true mapping
      const saleWithLines = Sale.reconstitute(
        {
          saleNumber: SaleNumber.create(2025, 1),
          status: SaleStatus.create('DRAFT'),
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
        },
        'sale-with-lines',
        mockOrgId
      );
      // Add a line to the sale
      const saleLine = SaleMapper.createLineEntity(
        {
          productId: 'product-abc',
          quantity: 5,
          salePrice: 100,
        },
        mockOrgId
      );
      saleWithLines.addLine(saleLine);

      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [saleWithLines],
        total: 1,
        hasMore: false,
      });

      (mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'product-abc', name: 'Widget', sku: 'WDG-001', barcode: 'BAR123' },
      ]);

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
          expect(value.data[0].lines).toBeDefined();
          expect(value.data[0].lines![0].productName).toBe('Widget');
          expect(value.data[0].lines![0].productSku).toBe('WDG-001');
          expect(value.data[0].lines![0].productBarcode).toBe('BAR123');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sortBy with no sortOrder When: getting sales Then: should default to asc', async () => {
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
        // no sortOrder - should default to 'asc'
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

    it('Given: companyId filter When: getting sales Then: should add company specification', async () => {
      // Arrange
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

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
      expect(mockSaleRepository.findBySpecification).toHaveBeenCalled();
    });

    it('Given: only startDate without endDate When: getting sales Then: should not add date range spec', async () => {
      // Arrange
      mockSaleRepository.findBySpecification.mockResolvedValue({
        data: [],
        total: 0,
        hasMore: false,
      });

      const request = {
        orgId: mockOrgId,
        page: 1,
        limit: 10,
        startDate: new Date('2024-01-01'),
        // no endDate
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
    });
  });
});
