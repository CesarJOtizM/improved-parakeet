import { GetSalesUseCase } from '@application/saleUseCases/getSalesUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { SaleMapper } from '@sale/mappers';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('GetSalesUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetSalesUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;

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

    useCase = new GetSalesUseCase(mockSaleRepository);
  });

  describe('execute', () => {
    const createMockSale = () => {
      const saleNumber = SaleNumber.create(2025, 1);
      const props = SaleMapper.toDomainProps(
        {
          warehouseId: 'warehouse-123',
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

      mockSaleRepository.findAll.mockResolvedValue(mockSales);

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
      mockSaleRepository.findAll.mockResolvedValue([saleTwo, saleOne]);

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
      mockSaleRepository.findAll.mockResolvedValue([saleTwo, saleOne]);

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
  });
});
