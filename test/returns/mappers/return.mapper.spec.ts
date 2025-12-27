import { Return } from '@returns/domain/entities/return.entity';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import {
  IReturnCreateInput,
  IReturnLineCreateInput,
  ReturnMapper,
} from '@returns/mappers/return.mapper';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('ReturnMapper', () => {
  describe('toDomainProps', () => {
    it('Given: valid customer return input When: converting to domain props Then: should create correct value objects', () => {
      // Arrange
      const input: IReturnCreateInput = {
        type: 'RETURN_CUSTOMER',
        warehouseId: 'warehouse-123',
        saleId: 'sale-123',
        reason: 'Defective product',
        note: 'Customer requested return',
        createdBy: 'user-123',
      };
      const returnNumber = ReturnNumber.create(2024, 1);

      // Act
      const props = ReturnMapper.toDomainProps(input, returnNumber);

      // Assert
      expect(props.returnNumber).toBe(returnNumber);
      expect(props.status).toBeInstanceOf(ReturnStatus);
      expect(props.status.getValue()).toBe('DRAFT');
      expect(props.type).toBeInstanceOf(ReturnType);
      expect(props.type.getValue()).toBe('RETURN_CUSTOMER');
      expect(props.reason).toBeInstanceOf(ReturnReason);
      expect(props.reason.getValue()).toBe('Defective product');
      expect(props.warehouseId).toBe('warehouse-123');
      expect(props.saleId).toBe('sale-123');
      expect(props.sourceMovementId).toBeUndefined();
      expect(props.note).toBe('Customer requested return');
      expect(props.createdBy).toBe('user-123');
    });

    it('Given: valid supplier return input When: converting to domain props Then: should set sourceMovementId', () => {
      // Arrange
      const input: IReturnCreateInput = {
        type: 'RETURN_SUPPLIER',
        warehouseId: 'warehouse-456',
        sourceMovementId: 'movement-123',
        reason: 'Wrong items received',
        createdBy: 'user-456',
      };
      const returnNumber = ReturnNumber.create(2024, 2);

      // Act
      const props = ReturnMapper.toDomainProps(input, returnNumber);

      // Assert
      expect(props.type.getValue()).toBe('RETURN_SUPPLIER');
      expect(props.sourceMovementId).toBe('movement-123');
      expect(props.saleId).toBeUndefined();
    });

    it('Given: minimal return input When: converting to domain props Then: should handle undefined optional fields', () => {
      // Arrange
      const input: IReturnCreateInput = {
        type: 'RETURN_CUSTOMER',
        warehouseId: 'warehouse-123',
        saleId: 'sale-123',
        createdBy: 'user-123',
      };
      const returnNumber = ReturnNumber.create(2024, 3);

      // Act
      const props = ReturnMapper.toDomainProps(input, returnNumber);

      // Assert
      expect(props.note).toBeUndefined();
      expect(props.reason.getValue()).toBeNull(); // ReturnReason handles undefined
    });
  });

  describe('toLineDomainProps', () => {
    it('Given: customer return line input When: converting to line props Then: should create SalePrice', () => {
      // Arrange
      const input: IReturnLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 5,
        originalSalePrice: 150.5,
        currency: 'COP',
        extra: { reason: 'defective' },
      };

      // Act
      const props = ReturnMapper.toLineDomainProps(input, 'RETURN_CUSTOMER');

      // Assert
      expect(props.quantity).toBeInstanceOf(Quantity);
      expect(props.quantity.getNumericValue()).toBe(5);
      expect(props.originalSalePrice).toBeInstanceOf(SalePrice);
      expect(props.originalSalePrice?.getAmount()).toBe(150.5);
      expect(props.originalUnitCost).toBeUndefined();
      expect(props.currency).toBe('COP');
      expect(props.productId).toBe('product-123');
      expect(props.locationId).toBe('location-123');
      expect(props.extra).toEqual({ reason: 'defective' });
    });

    it('Given: supplier return line input When: converting to line props Then: should create Money', () => {
      // Arrange
      const input: IReturnLineCreateInput = {
        productId: 'product-456',
        locationId: 'location-456',
        quantity: 10,
        originalUnitCost: 80.0,
        currency: 'USD',
      };

      // Act
      const props = ReturnMapper.toLineDomainProps(input, 'RETURN_SUPPLIER');

      // Assert
      expect(props.originalUnitCost).toBeInstanceOf(Money);
      expect(props.originalUnitCost?.getAmount()).toBe(80);
      expect(props.originalUnitCost?.getCurrency()).toBe('USD');
      expect(props.originalSalePrice).toBeUndefined();
    });

    it('Given: line input without currency When: converting to line props Then: should use default COP', () => {
      // Arrange
      const input: IReturnLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 3,
        originalSalePrice: 100,
      };

      // Act
      const props = ReturnMapper.toLineDomainProps(input, 'RETURN_CUSTOMER');

      // Assert
      expect(props.currency).toBe('COP');
      expect(props.originalSalePrice?.getCurrency()).toBe('COP');
    });
  });

  describe('createLineEntity', () => {
    it('Given: customer return line input When: creating line entity Then: should return ReturnLine', () => {
      // Arrange
      const input: IReturnLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 5,
        originalSalePrice: 100,
      };

      // Act
      const line = ReturnMapper.createLineEntity(input, 'RETURN_CUSTOMER', 'org-123');

      // Assert
      expect(line).toBeInstanceOf(ReturnLine);
      expect(line.productId).toBe('product-123');
      expect(line.originalSalePrice?.getAmount()).toBe(100);
    });

    it('Given: supplier return line input When: creating line entity Then: should return ReturnLine', () => {
      // Arrange
      const input: IReturnLineCreateInput = {
        productId: 'product-456',
        locationId: 'location-456',
        quantity: 10,
        originalUnitCost: 50,
      };

      // Act
      const line = ReturnMapper.createLineEntity(input, 'RETURN_SUPPLIER', 'org-123');

      // Assert
      expect(line).toBeInstanceOf(ReturnLine);
      expect(line.productId).toBe('product-456');
      expect(line.originalUnitCost?.getAmount()).toBe(50);
    });
  });

  describe('lineToResponseData', () => {
    it('Given: customer ReturnLine entity When: converting to response DTO Then: should extract all values', () => {
      // Arrange
      const props = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: Quantity.create(5, 2),
        originalSalePrice: SalePrice.create(100, 'COP', 2),
        currency: 'COP',
        extra: { reason: 'defective' },
      };
      const returnType = ReturnType.create('RETURN_CUSTOMER');
      const line = ReturnLine.create(props, 'org-123', returnType);

      // Act
      const dto = ReturnMapper.lineToResponseData(line);

      // Assert
      expect(dto.id).toBe(line.id);
      expect(dto.productId).toBe('product-123');
      expect(dto.locationId).toBe('location-123');
      expect(dto.quantity).toBe(5);
      expect(dto.originalSalePrice).toBe(100);
      expect(dto.originalUnitCost).toBeUndefined();
      expect(dto.currency).toBe('COP');
      expect(dto.totalPrice).toBe(500); // 5 * 100
      expect(dto.extra).toEqual({ reason: 'defective' });
    });

    it('Given: supplier ReturnLine entity When: converting to response DTO Then: should extract unit cost', () => {
      // Arrange
      const props = {
        productId: 'product-456',
        locationId: 'location-456',
        quantity: Quantity.create(10, 2),
        originalUnitCost: Money.create(50, 'USD', 2),
        currency: 'USD',
      };
      const returnType = ReturnType.create('RETURN_SUPPLIER');
      const line = ReturnLine.create(props, 'org-123', returnType);

      // Act
      const dto = ReturnMapper.lineToResponseData(line);

      // Assert
      expect(dto.originalSalePrice).toBeUndefined();
      expect(dto.originalUnitCost).toBe(50);
      expect(dto.totalPrice).toBe(500); // 10 * 50
    });
  });

  describe('toResponseData', () => {
    const createTestReturn = (type: 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER'): Return => {
      const isCustomer = type === 'RETURN_CUSTOMER';
      const props = {
        returnNumber: ReturnNumber.create(2024, 1),
        status: ReturnStatus.create('DRAFT'),
        type: ReturnType.create(type),
        reason: ReturnReason.create('Test reason'),
        warehouseId: 'warehouse-123',
        saleId: isCustomer ? 'sale-123' : undefined,
        sourceMovementId: !isCustomer ? 'movement-123' : undefined,
        note: 'Test note',
        createdBy: 'user-123',
      };
      const returnEntity = Return.create(props, 'org-123');

      // Add a line
      const lineProps = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: Quantity.create(5, 2),
        originalSalePrice: isCustomer ? SalePrice.create(100, 'COP', 2) : undefined,
        originalUnitCost: !isCustomer ? Money.create(50, 'COP', 2) : undefined,
        currency: 'COP',
      };
      const returnType = ReturnType.create(type);
      const line = ReturnLine.create(lineProps, 'org-123', returnType);
      returnEntity.addLine(line);

      return returnEntity;
    };

    it('Given: customer Return entity When: converting to response DTO Then: should include all data', () => {
      // Arrange
      const returnEntity = createTestReturn('RETURN_CUSTOMER');

      // Act
      const dto = ReturnMapper.toResponseData(returnEntity);

      // Assert
      expect(dto.id).toBe(returnEntity.id);
      expect(dto.returnNumber).toBe('RETURN-2024-001');
      expect(dto.status).toBe('DRAFT');
      expect(dto.type).toBe('RETURN_CUSTOMER');
      expect(dto.reason).toBe('Test reason');
      expect(dto.warehouseId).toBe('warehouse-123');
      expect(dto.saleId).toBe('sale-123');
      expect(dto.sourceMovementId).toBeUndefined();
      expect(dto.note).toBe('Test note');
      expect(dto.createdBy).toBe('user-123');
      expect(dto.orgId).toBe('org-123');
      expect(dto.lines).toHaveLength(1);
      expect(dto.lines[0].originalSalePrice).toBe(100);
      expect(dto.totalAmount).toBe(500);
      expect(dto.currency).toBe('COP');
    });

    it('Given: supplier Return entity When: converting to response DTO Then: should include sourceMovementId', () => {
      // Arrange
      const returnEntity = createTestReturn('RETURN_SUPPLIER');

      // Act
      const dto = ReturnMapper.toResponseData(returnEntity);

      // Assert
      expect(dto.type).toBe('RETURN_SUPPLIER');
      expect(dto.sourceMovementId).toBe('movement-123');
      expect(dto.saleId).toBeUndefined();
      expect(dto.lines[0].originalUnitCost).toBe(50);
    });

    it('Given: Return entity without optional fields When: converting to response DTO Then: should handle undefined', () => {
      // Arrange
      const props = {
        returnNumber: ReturnNumber.create(2024, 2),
        status: ReturnStatus.create('DRAFT'),
        type: ReturnType.create('RETURN_CUSTOMER'),
        reason: ReturnReason.create(undefined),
        warehouseId: 'warehouse-456',
        saleId: 'sale-456',
        createdBy: 'user-456',
      };
      const returnEntity = Return.create(props, 'org-456');

      // Act
      const dto = ReturnMapper.toResponseData(returnEntity);

      // Assert
      expect(dto.reason).toBeNull();
      expect(dto.note).toBeUndefined();
      expect(dto.confirmedAt).toBeUndefined();
      expect(dto.cancelledAt).toBeUndefined();
      expect(dto.returnMovementId).toBeUndefined();
      expect(dto.lines).toHaveLength(0);
      expect(dto.totalAmount).toBeUndefined();
      expect(dto.currency).toBeUndefined();
    });
  });

  describe('toResponseDataList', () => {
    it('Given: array of Return entities When: converting to response DTOs Then: should convert all returns', () => {
      // Arrange
      const props1 = {
        returnNumber: ReturnNumber.create(2024, 1),
        status: ReturnStatus.create('DRAFT'),
        type: ReturnType.create('RETURN_CUSTOMER'),
        reason: ReturnReason.create('Reason 1'),
        warehouseId: 'warehouse-123',
        saleId: 'sale-123',
        createdBy: 'user-123',
      };
      const props2 = {
        returnNumber: ReturnNumber.create(2024, 2),
        status: ReturnStatus.create('CONFIRMED'),
        type: ReturnType.create('RETURN_SUPPLIER'),
        reason: ReturnReason.create('Reason 2'),
        warehouseId: 'warehouse-456',
        sourceMovementId: 'movement-456',
        createdBy: 'user-456',
      };
      const returns = [Return.create(props1, 'org-123'), Return.create(props2, 'org-123')];

      // Act
      const dtos = ReturnMapper.toResponseDataList(returns);

      // Assert
      expect(dtos).toHaveLength(2);
      expect(dtos[0].returnNumber).toBe('RETURN-2024-001');
      expect(dtos[0].type).toBe('RETURN_CUSTOMER');
      expect(dtos[1].returnNumber).toBe('RETURN-2024-002');
      expect(dtos[1].type).toBe('RETURN_SUPPLIER');
    });

    it('Given: empty array of returns When: converting to response DTOs Then: should return empty array', () => {
      // Arrange
      const returns: Return[] = [];

      // Act
      const dtos = ReturnMapper.toResponseDataList(returns);

      // Assert
      expect(dtos).toHaveLength(0);
    });
  });
});
