import { CreateMovementUseCase } from '@application/movementUseCases/createMovementUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
import { Product } from '@product/domain/entities/product.entity';
import { ProductMapper } from '@product/mappers';
import { IDomainEventDispatcher } from '@shared/domain/events/domainEventDispatcher.interface';
import { NotFoundError, ValidationError } from '@shared/domain/result/domainError';
import { Warehouse } from '@warehouse/domain/entities/warehouse.entity';
import { WarehouseCode } from '@warehouse/domain/valueObjects/warehouseCode.valueObject';

import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';
import type { IMovementRepository } from '@movement/domain/ports/repositories';
import type { IProductRepository } from '@product/domain/ports/repositories';
import type { IWarehouseRepository } from '@warehouse/domain/ports/repositories';

describe('CreateMovementUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockMovementId = 'movement-123';
  const mockWarehouseId = 'warehouse-123';
  const mockProductId = 'product-123';
  const mockLocationId = 'location-123';
  const mockUserId = 'user-123';

  let useCase: CreateMovementUseCase;
  let mockMovementRepository: jest.Mocked<IMovementRepository>;
  let mockProductRepository: jest.Mocked<IProductRepository>;
  let mockWarehouseRepository: jest.Mocked<IWarehouseRepository>;
  let mockEventDispatcher: jest.Mocked<IDomainEventDispatcher>;
  let mockContactRepository: jest.Mocked<IContactRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMovementRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByWarehouse: jest.fn(),
      findByStatus: jest.fn(),
      findByType: jest.fn(),
      findByDateRange: jest.fn(),
      findByProduct: jest.fn(),
      findDraftMovements: jest.fn(),
      findPostedMovements: jest.fn(),
    } as jest.Mocked<IMovementRepository>;

    mockProductRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findBySku: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
    } as jest.Mocked<IProductRepository>;

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

    mockContactRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByIdentification: jest.fn(),
      existsByIdentification: jest.fn(),
      findByEmail: jest.fn(),
      findByType: jest.fn(),
      countSales: jest.fn(),
    } as jest.Mocked<IContactRepository>;

    useCase = new CreateMovementUseCase(
      mockMovementRepository,
      mockProductRepository,
      mockWarehouseRepository,
      mockEventDispatcher,
      mockContactRepository
    );
  });

  describe('execute', () => {
    const createMockWarehouse = () => {
      const props = {
        code: WarehouseCode.create('WH-001'),
        name: 'Test Warehouse',
        isActive: true,
      };
      return Warehouse.create(props, mockOrgId);
    };

    const createMockProduct = () => {
      const props = ProductMapper.toDomainProps({
        sku: 'PROD-001',
        name: 'Test Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
      }).unwrap();
      return Product.create(props, mockOrgId);
    };

    const validRequest = {
      type: 'IN' as const,
      warehouseId: mockWarehouseId,
      reference: 'REF-001',
      reason: 'PURCHASE',
      note: 'Test movement',
      lines: [
        {
          productId: mockProductId,
          locationId: mockLocationId,
          quantity: 10,
          unitCost: 100,
          currency: 'COP',
        },
      ],
      createdBy: mockUserId,
      orgId: mockOrgId,
    };

    it('Given: valid movement data When: creating movement Then: should return success result', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const movementProps = MovementMapper.toDomainProps(validRequest);
      const movementWithId = Movement.reconstitute(movementProps, mockMovementId, mockOrgId, []);

      mockMovementRepository.save.mockResolvedValue(movementWithId);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Movement created successfully');
          expect(value.data.type).toBe('IN');
          expect(value.data.warehouseId).toBe(mockWarehouseId);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockMovementRepository.save).toHaveBeenCalledTimes(1);
      expect(mockEventDispatcher.dispatchEvents).toHaveBeenCalledTimes(1);
    });

    it('Given: non-existent warehouse When: creating movement Then: should return NotFoundError', async () => {
      // Arrange
      mockWarehouseRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Warehouse not found');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: non-existent product When: creating movement Then: should return NotFoundError', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockProductRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('Product not found');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: repository error When: creating movement Then: should return ValidationError', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockMovementRepository.save.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Database error');
        }
      );
    });

    it('Given: valid movement with multiple lines When: creating movement Then: should return success result', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const requestWithMultipleLines = {
        ...validRequest,
        lines: [
          {
            productId: mockProductId,
            locationId: mockLocationId,
            quantity: 10,
            unitCost: 100,
            currency: 'COP',
          },
          {
            productId: mockProductId,
            locationId: mockLocationId,
            quantity: 5,
            unitCost: 200,
            currency: 'COP',
          },
        ],
      };

      const movementProps = MovementMapper.toDomainProps(requestWithMultipleLines);
      const mockMovement = Movement.create(movementProps, mockOrgId);

      // Add lines to the movement
      const line1 = MovementMapper.createLineEntity(
        requestWithMultipleLines.lines[0],
        0,
        mockOrgId
      );
      const line2 = MovementMapper.createLineEntity(
        requestWithMultipleLines.lines[1],
        0,
        mockOrgId
      );
      mockMovement.addLine(line1);
      mockMovement.addLine(line2);

      const movementWithId = Movement.reconstitute(movementProps, mockMovementId, mockOrgId, [
        line1,
        line2,
      ]);

      mockMovementRepository.save.mockResolvedValue(movementWithId);

      // Act
      const result = await useCase.execute(requestWithMultipleLines);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.lines.length).toBe(2);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: empty lines array When: creating movement Then: should create movement without lines', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);

      const requestWithEmptyLines = {
        ...validRequest,
        lines: [],
      };

      const movementProps = MovementMapper.toDomainProps(requestWithEmptyLines);
      const movementWithId = Movement.reconstitute(movementProps, mockMovementId, mockOrgId, []);

      mockMovementRepository.save.mockResolvedValue(movementWithId);

      // Act
      const result = await useCase.execute(requestWithEmptyLines);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.lines).toHaveLength(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: multiple products in lines When: creating movement Then: should validate all products exist', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const mockProduct1 = createMockProduct();
      const secondProductId = 'product-456';

      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockProductRepository.findById
        .mockResolvedValueOnce(mockProduct1) // First call for first product
        .mockResolvedValueOnce(null); // Second call for non-existent product

      const requestWithMultipleProducts = {
        ...validRequest,
        lines: [
          {
            productId: mockProductId,
            locationId: mockLocationId,
            quantity: 10,
            unitCost: 100,
            currency: 'COP',
          },
          {
            productId: secondProductId,
            locationId: mockLocationId,
            quantity: 5,
            unitCost: 200,
            currency: 'COP',
          },
        ],
      };

      // Act
      const result = await useCase.execute(requestWithMultipleProducts);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('Product not found');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: valid contactId When: creating movement Then: should validate contact exists', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockContactRepository.findById.mockResolvedValue({ id: 'contact-123' } as never);

      const movementProps = MovementMapper.toDomainProps(validRequest);
      const movementWithId = Movement.reconstitute(movementProps, mockMovementId, mockOrgId, []);
      mockMovementRepository.save.mockResolvedValue(movementWithId);

      const requestWithContact = {
        ...validRequest,
        contactId: 'contact-123',
      };

      // Act
      const result = await useCase.execute(requestWithContact);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockContactRepository.findById).toHaveBeenCalledWith('contact-123', mockOrgId);
    });

    it('Given: non-existent contactId When: creating movement Then: should return NotFoundError', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockContactRepository.findById.mockResolvedValue(null);

      const requestWithContact = {
        ...validRequest,
        contactId: 'non-existent-contact',
      };

      // Act
      const result = await useCase.execute(requestWithContact);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toBe('Contact not found');
        }
      );
      expect(mockMovementRepository.save).not.toHaveBeenCalled();
    });

    it('Given: no contactId When: creating movement Then: should skip contact validation', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const movementProps = MovementMapper.toDomainProps(validRequest);
      const movementWithId = Movement.reconstitute(movementProps, mockMovementId, mockOrgId, []);
      mockMovementRepository.save.mockResolvedValue(movementWithId);

      const requestWithoutContact = {
        ...validRequest,
        contactId: undefined,
      };

      // Act
      const result = await useCase.execute(requestWithoutContact);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockContactRepository.findById).not.toHaveBeenCalled();
    });

    it('Given: non-Error thrown When: creating movement Then: should return generic ValidationError', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);
      mockMovementRepository.save.mockRejectedValue('string error');

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Failed to create movement');
        }
      );
    });

    it('Given: movement with optional fields null When: creating movement Then: should succeed', async () => {
      // Arrange
      const mockWarehouse = createMockWarehouse();
      const mockProduct = createMockProduct();

      mockWarehouseRepository.findById.mockResolvedValue(mockWarehouse);
      mockProductRepository.findById.mockResolvedValue(mockProduct);

      const requestMinimal = {
        type: 'IN' as const,
        warehouseId: mockWarehouseId,
        reference: undefined,
        reason: undefined,
        note: undefined,
        lines: [
          {
            productId: mockProductId,
            quantity: 10,
          },
        ],
        createdBy: mockUserId,
        orgId: mockOrgId,
      };

      const movementProps = MovementMapper.toDomainProps(requestMinimal);
      const movementWithId = Movement.reconstitute(movementProps, mockMovementId, mockOrgId, []);
      mockMovementRepository.save.mockResolvedValue(movementWithId);

      // Act
      const result = await useCase.execute(requestMinimal);

      // Assert
      expect(result.isOk()).toBe(true);
    });
  });
});
