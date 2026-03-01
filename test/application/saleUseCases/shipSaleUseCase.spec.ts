/* eslint-disable @typescript-eslint/no-explicit-any */
import { ShipSaleUseCase } from '@application/saleUseCases/shipSaleUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Organization } from '@organization/domain/entities/organization.entity';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { SaleMapper } from '@sale/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result/domainError';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IOrganizationRepository } from '@organization/domain/repositories/organizationRepository.interface';

describe('ShipSaleUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockSaleId = 'sale-123';
  const mockUserId = 'user-456';

  let useCase: ShipSaleUseCase;
  let mockSaleRepository: jest.Mocked<ISaleRepository>;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;
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
      getNextSaleNumber: jest.fn(),
      addLine: jest.fn(),
    } as jest.Mocked<ISaleRepository>;

    mockOrganizationRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySlug: jest.fn(),
      findByDomain: jest.fn(),
      findActiveOrganizations: jest.fn(),
      existsBySlug: jest.fn(),
      existsByDomain: jest.fn(),
      countActiveOrganizations: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    } as jest.Mocked<IOrganizationRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new ShipSaleUseCase(
      mockSaleRepository,
      mockOrganizationRepository,
      mockEventDispatcher
    );
  });

  const createMockOrganization = (pickingEnabled: boolean = true) => {
    return Organization.reconstitute(
      {
        name: 'Test Org',
        settings: { pickingEnabled },
        timezone: 'America/Bogota',
        currency: 'COP',
        dateFormat: 'DD/MM/YYYY',
        isActive: true,
      },
      mockOrgId,
      mockOrgId
    );
  };

  const createMockSale = (status: string = 'PICKING') => {
    const saleNumber = SaleNumber.create(2025, 1);
    const props = SaleMapper.toDomainProps(
      {
        warehouseId: 'warehouse-123',
        createdBy: 'user-123',
      },
      saleNumber
    );
    props.status = SaleStatus.create(status as any);

    if (status === 'PICKING') {
      props.confirmedAt = new Date();
      props.confirmedBy = 'user-123';
      props.pickedAt = new Date();
      props.pickedBy = 'user-123';
    }

    const sale = Sale.reconstitute(props, mockSaleId, mockOrgId);
    return sale;
  };

  describe('execute', () => {
    it('Given: picking sale with picking enabled When: shipping sale Then: should return success result', async () => {
      // Arrange
      const mockOrg = createMockOrganization(true);
      const mockSale = createMockSale('PICKING');
      mockSale.ship = jest.fn();
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Sale shipped successfully');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: non-existent organization When: shipping sale Then: should return NotFoundError', async () => {
      // Arrange
      mockOrganizationRepository.findById.mockResolvedValue(null);

      const request = {
        id: mockSaleId,
        orgId: 'non-existent-org',
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
          expect(error.message).toContain('Organization');
        }
      );
    });

    it('Given: organization with picking disabled When: shipping sale Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockOrg = createMockOrganization(false);
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);

      const request = {
        id: mockSaleId,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('not enabled');
        }
      );
    });

    it('Given: non-existent sale When: shipping sale Then: should return NotFoundError', async () => {
      // Arrange
      const mockOrg = createMockOrganization(true);
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);
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

    it('Given: sale not in PICKING status When: shipping sale Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockOrg = createMockOrganization(true);
      const mockSale = createMockSale('PICKING');
      mockSale.ship = jest.fn(() => {
        throw new Error('Sale cannot be shipped from current status');
      });
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
          expect(error.message).toContain('cannot be shipped');
        }
      );
    });

    it('Given: draft sale When: shipping sale Then: should return BusinessRuleError', async () => {
      // Arrange
      const mockOrg = createMockOrganization(true);
      const mockSale = createMockSale('DRAFT');
      mockSale.ship = jest.fn(() => {
        throw new Error('Sale cannot be shipped from current status');
      });
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);
      mockSaleRepository.findById.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
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
          expect(error).toBeInstanceOf(BusinessRuleError);
        }
      );
    });

    it('Given: picking sale When: shipping sale with tracking info Then: should pass tracking details to ship method', async () => {
      // Arrange
      const mockOrg = createMockOrganization(true);
      const mockSale = createMockSale('PICKING');
      mockSale.ship = jest.fn();
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
        trackingNumber: 'TRACK-12345',
        shippingCarrier: 'FedEx',
        shippingNotes: 'Handle with care',
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockSale.ship).toHaveBeenCalledWith(
        'TRACK-12345',
        'FedEx',
        'Handle with care',
        mockUserId
      );
    });

    it('Given: picking sale When: shipping sale without tracking info Then: should pass undefined for optional params', async () => {
      // Arrange
      const mockOrg = createMockOrganization(true);
      const mockSale = createMockSale('PICKING');
      mockSale.ship = jest.fn();
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockSale.ship).toHaveBeenCalledWith(undefined, undefined, undefined, undefined);
    });

    it('Given: picking sale When: shipping sale Then: should call save on repository', async () => {
      // Arrange
      const mockOrg = createMockOrganization(true);
      const mockSale = createMockSale('PICKING');
      mockSale.ship = jest.fn();
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockSaleRepository.save).toHaveBeenCalledTimes(1);
      expect(mockSaleRepository.save).toHaveBeenCalledWith(mockSale);
    });

    it('Given: picking sale When: shipping sale Then: should dispatch domain events', async () => {
      // Arrange
      const mockOrg = createMockOrganization(true);
      const mockSale = createMockSale('PICKING');
      mockSale.ship = jest.fn();
      mockSale.markEventsForDispatch = jest.fn();
      mockSale.clearEvents = jest.fn();
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
      };

      // Act
      await useCase.execute(request);

      // Assert
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
      expect(mockSale.markEventsForDispatch).toHaveBeenCalledTimes(1);
      expect(mockSale.clearEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: picking sale When: shipping sale successfully Then: response should contain correct sale data', async () => {
      // Arrange
      const mockOrg = createMockOrganization(true);
      const mockSale = createMockSale('PICKING');
      mockSale.ship = jest.fn();
      mockOrganizationRepository.findById.mockResolvedValue(mockOrg);
      mockSaleRepository.findById.mockResolvedValue(mockSale);
      mockSaleRepository.save.mockResolvedValue(mockSale);

      const request = {
        id: mockSaleId,
        orgId: mockOrgId,
        userId: mockUserId,
        trackingNumber: 'TRACK-12345',
      };

      // Act
      const result = await useCase.execute(request);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.id).toBe(mockSaleId);
          expect(value.data.orgId).toBe(mockOrgId);
          expect(value.data.warehouseId).toBe('warehouse-123');
          expect(value.data.createdBy).toBe('user-123');
          expect(value.timestamp).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
