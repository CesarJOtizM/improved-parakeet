import { GetSaleByIdUseCase } from '@application/saleUseCases/getSaleByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';
import type { IProductRepository } from '@product/domain/ports/repositories/iProductRepository.port';
import type { IOrganizationRepository } from '@organization/domain/repositories';
import type { PrismaService } from '@infrastructure/database/prisma.service';

describe('GetSaleByIdUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';

  let useCase: GetSaleByIdUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;
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

    mockWarehouseRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      findByCode: jest.fn(),
      existsByCode: jest.fn(),
      findActive: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IWarehouseRepository>;

    mockProductRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
      findBySpecification: jest.fn(),
      save: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IProductRepository>;

    mockOrganizationRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn(),
      findBySlug: jest.fn(),
      findByDomain: jest.fn(),
      findActiveOrganizations: jest.fn(),
      existsBySlug: jest.fn(),
      existsByDomain: jest.fn(),
      countActiveOrganizations: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IOrganizationRepository>;

    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
    } as unknown as jest.Mocked<PrismaService>;

    useCase = new GetSaleByIdUseCase(
      mockSaleRepository,
      mockWarehouseRepository,
      mockProductRepository,
      mockOrganizationRepository,
      mockPrisma
    );
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
      return Sale.reconstitute(props, mockSaleId, mockOrgId);
    };

    it('Given: existing sale ID When: getting sale by ID Then: should return sale', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Sale retrieved successfully');
          expect(value.data.id).toBe(mockSaleId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockSaleRepository.findById).toHaveBeenCalledWith(mockSaleId, mockOrgId);
    });

    it('Given: non-existent sale ID When: getting sale by ID Then: should return NotFoundError', async () => {
      // Arrange
      mockSaleRepository.findById.mockResolvedValue(null);

      const request = {
        id: 'non-existent-id',
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('Sale');
        }
      );
    });

    it('Given: warehouse found When: getting sale by ID Then: warehouseName should be set', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const mockWarehouse = {
        name: 'Main Warehouse',
        code: { getValue: () => 'WH-01' },
      };
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse as never);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.warehouseName).toBe('Main Warehouse (WH-01)');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: warehouse not found When: getting sale by ID Then: warehouseName should be absent', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      mockWarehouseRepository.findById.mockResolvedValue(null);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.warehouseName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sale with lines and product resolution When: getting sale by ID Then: productName and productSku should be enriched', async () => {
      // Arrange
      const mockSale = createMockSale();

      // Add mock lines to the sale
      const mockLine = {
        id: 'line-1',
        productId: 'product-abc',
        locationId: undefined,
        quantity: { getNumericValue: () => 10 },
        salePrice: { getAmount: () => 50, getCurrency: () => 'COP' },
        getTotalPrice: () => ({ getAmount: () => 500, getCurrency: () => 'COP' }),
        extra: undefined,
      };
      (mockSale as unknown as { getLines: () => unknown[] }).getLines = jest
        .fn()
        .mockReturnValue([mockLine]);

      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const mockProduct = {
        name: { getValue: () => 'Widget A' },
        sku: { getValue: () => 'SKU-WIDGET-A' },
      };
      mockProductRepository.findById.mockResolvedValue(mockProduct as never);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.lines).toBeDefined();
          expect(value.data.lines!.length).toBeGreaterThan(0);
          expect(value.data.lines![0].productName).toBe('Widget A');
          expect(value.data.lines![0].productSku).toBe('SKU-WIDGET-A');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockProductRepository.findById).toHaveBeenCalledWith('product-abc', mockOrgId);
    });

    it('Given: userId present for resolveUserName When: getting sale by ID Then: name should be resolved', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      // Mock the prisma user lookup to return a user for the createdBy field
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        firstName: 'John',
        lastName: 'Doe',
      });

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.createdByName).toBe('John Doe');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: user not found for resolveUserName When: getting sale by ID Then: name should be undefined', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      // All user lookups return null
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.createdByName).toBeUndefined();
          expect(value.data.confirmedByName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sale with no lines When: getting sale by ID Then: no product queries should be made', async () => {
      // Arrange
      const mockSale = createMockSale();
      // Make getLines return empty array
      (mockSale as unknown as { getLines: () => unknown[] }).getLines = jest
        .fn()
        .mockReturnValue([]);

      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockProductRepository.findById).not.toHaveBeenCalled();
    });

    it('Given: warehouse lookup throws When: getting sale by ID Then: should continue without warehouseName', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockWarehouseRepository.findById.mockRejectedValue(new Error('DB error'));

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.warehouseName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: contact lookup throws When: getting sale by ID Then: should continue without contactName', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      // Mock prisma.contact to throw
      (mockPrisma as unknown as { contact: { findUnique: jest.Mock } }).contact = {
        findUnique: jest.fn().mockRejectedValue(new Error('Contact DB error')),
      };

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.contactName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: contact found When: getting sale by ID Then: contactName should be set', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      (mockPrisma as unknown as { contact: { findUnique: jest.Mock } }).contact = {
        findUnique: jest.fn().mockResolvedValue({ name: 'Acme Corp' }),
      };

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.contactName).toBe('Acme Corp');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: contact not found When: getting sale by ID Then: contactName should be undefined', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      (mockPrisma as unknown as { contact: { findUnique: jest.Mock } }).contact = {
        findUnique: jest.fn().mockResolvedValue(null),
      };

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.contactName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product lookup throws When: getting sale by ID Then: should continue without product info', async () => {
      // Arrange
      const mockSale = createMockSale();
      const mockLine = {
        id: 'line-1',
        productId: 'product-abc',
        locationId: undefined,
        quantity: { getNumericValue: () => 10 },
        salePrice: { getAmount: () => 50, getCurrency: () => 'COP' },
        getTotalPrice: () => ({ getAmount: () => 500, getCurrency: () => 'COP' }),
        extra: undefined,
      };
      (mockSale as unknown as { getLines: () => unknown[] }).getLines = jest
        .fn()
        .mockReturnValue([mockLine]);

      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockProductRepository.findById.mockRejectedValue(new Error('Product DB error'));

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.lines).toBeDefined();
          expect(value.data.lines![0].productName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: product not found for line When: getting sale by ID Then: line should not have productName', async () => {
      // Arrange
      const mockSale = createMockSale();
      const mockLine = {
        id: 'line-1',
        productId: 'product-missing',
        locationId: undefined,
        quantity: { getNumericValue: () => 10 },
        salePrice: { getAmount: () => 50, getCurrency: () => 'COP' },
        getTotalPrice: () => ({ getAmount: () => 500, getCurrency: () => 'COP' }),
        extra: undefined,
      };
      (mockSale as unknown as { getLines: () => unknown[] }).getLines = jest
        .fn()
        .mockReturnValue([mockLine]);

      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockProductRepository.findById.mockResolvedValue(null);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.lines![0].productName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: org settings found with pickingEnabled When: getting sale by ID Then: pickingEnabled should be true', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      mockOrganizationRepository.findById.mockResolvedValue({
        getSetting: (key: string) => (key === 'pickingEnabled' ? true : null),
      } as never);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.pickingEnabled).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: org settings lookup throws When: getting sale by ID Then: pickingEnabled should default to false', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockOrganizationRepository.findById.mockRejectedValue(new Error('Org DB error'));

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.pickingEnabled).toBe(false);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: resolveUserName throws When: getting sale by ID Then: name should be undefined', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      (mockPrisma.user.findUnique as jest.Mock).mockRejectedValue(new Error('User DB error'));

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.createdByName).toBeUndefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: sale with no contactId When: getting sale by ID Then: should skip contact lookup', async () => {
      // Arrange
      const saleNumber = SaleNumber.create(2025, 2);
      const props = SaleMapper.toDomainProps(
        {
          warehouseId: 'warehouse-123',
          createdBy: 'user-123',
          // contactId is omitted
        },
        saleNumber
      );
      const mockSale = Sale.reconstitute(props, mockSaleId, mockOrgId);
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      // Track if contact lookup is made
      const contactFindUnique = jest.fn();
      (mockPrisma as unknown as { contact: { findUnique: jest.Mock } }).contact = {
        findUnique: contactFindUnique,
      };

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(contactFindUnique).not.toHaveBeenCalled();
    });
  });
});
