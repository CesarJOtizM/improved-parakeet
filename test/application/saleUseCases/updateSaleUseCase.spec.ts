import { UpdateSaleUseCase } from '@application/saleUseCases/updateSaleUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleMapper } from '@sale/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

describe('UpdateSaleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';

  let useCase: UpdateSaleUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

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
    } as unknown as jest.Mocked<ISaleRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new UpdateSaleUseCase(mockSaleRepository, mockEventDispatcher);
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

    it('Given: existing sale and valid update data When: updating sale Then: should return success result', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const updatedSale = mockSale.update({
        customerReference: 'Updated Customer',
        note: 'Updated note',
      });
      mockSaleRepository.save.mockResolvedValue(updatedSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
        customerReference: 'Updated Customer',
        note: 'Updated note',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Sale updated successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockSaleRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent sale ID When: updating sale Then: should return NotFoundError', async () => {
      // Arrange
      mockSaleRepository.findById.mockResolvedValue(null);

      const request = {
        id: 'non-existent-id',
        orgId: mockOrgId,
        note: 'Updated note',
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
        }
      );
      expect(mockSaleRepository.save).not.toHaveBeenCalled();
    });

    it('Given: confirmed sale When: updating sale Then: should throw error', async () => {
      // Arrange
      const mockSale = createMockSale();
      // Add a line to the sale so it can be confirmed
      const saleLine = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 10,
        salePrice: 100,
        currency: 'COP',
      };
      const line = SaleMapper.createLineEntity(saleLine, mockOrgId);
      mockSale.addLine(line);
      // Confirm the sale
      mockSale.confirm('movement-123');
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
        note: 'Updated note',
      };

      // Act & Assert
      // The sale.update() method throws an error when trying to update a confirmed sale
      await expect(useCase.execute(request)).rejects.toThrow(
        'Cannot update sale when status is CONFIRMED or CANCELLED'
      );
      expect(mockSaleRepository.save).not.toHaveBeenCalled();
    });

    it('Given: sale with partial update When: updating sale Then: should update only provided fields', async () => {
      // Arrange
      const mockSale = createMockSale();
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const updatedSale = mockSale.update({
        note: 'Updated note only',
      });
      mockSaleRepository.save.mockResolvedValue(updatedSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
        note: 'Updated note only',
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
    });
  });
});
