import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { ConflictError, ValidationError } from '@shared/domain/result/domainError';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { Address } from '@warehouse/domain/valueObjects/address.valueObject';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

describe('CreateWarehouseUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockWarehouseId = 'warehouse-123';

  let useCase: CreateWarehouseUseCase;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWarehouseRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByCode: jest.fn(),
      existsByCode: jest.fn(),
      findActive: jest.fn(),
    } as jest.Mocked<IWarehouseRepository>;

    mockEventDispatcher = {
      dispatchEvents: jest.fn().mockResolvedValue(undefined as never),
      markAndDispatch: jest.fn().mockResolvedValue(undefined as never),
    } as jest.Mocked<IDomainEventDispatcher>;

    useCase = new CreateWarehouseUseCase(mockWarehouseRepository, mockEventDispatcher);
  });

  describe('execute', () => {
    const validRequest = {
      code: 'WH-001',
      name: 'Test Warehouse',
      description: 'Test Description',
      address: {
        street: '123 Main St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345',
        country: 'Test Country',
      },
      isActive: true,
      orgId: mockOrgId,
    };

    it('Given: valid warehouse data When: creating warehouse Then: should return success result', async () => {
      // Arrange
      mockWarehouseRepository.existsByCode.mockResolvedValue(false);

      const warehouseProps = {
        code: WarehouseCode.create('WH-001'),
        name: validRequest.name,
        address: Address.create('123 Main St, Test City'),
        isActive: true,
      };
      const warehouseWithId = Warehouse.reconstitute(warehouseProps, mockWarehouseId, mockOrgId);

      mockWarehouseRepository.save.mockResolvedValue(warehouseWithId);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Warehouse created successfully');
          expect(value.data.code).toBe('WH-001');
          expect(value.data.name).toBe(validRequest.name);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockWarehouseRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: duplicate warehouse code When: creating warehouse Then: should return ConflictError', async () => {
      // Arrange
      mockWarehouseRepository.existsByCode.mockResolvedValue(true);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ConflictError);
          expect(error.message).toContain('already exists');
        }
      );
      expect(mockWarehouseRepository.save).not.toHaveBeenCalled();
    });

    it('Given: invalid warehouse code When: creating warehouse Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = {
        ...validRequest,
        code: '', // Invalid empty code
      };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
        }
      );
    });
  });
});
