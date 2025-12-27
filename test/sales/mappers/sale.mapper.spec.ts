import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { ISaleCreateInput, ISaleLineCreateInput, SaleMapper } from '@sales/mappers/sale.mapper';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

describe('SaleMapper', () => {
  describe('toDomainProps', () => {
    it('Given: valid CreateSaleDto When: converting to domain props Then: should create correct value objects', () => {
      // Arrange
      const input: ISaleCreateInput = {
        warehouseId: 'warehouse-123',
        customerReference: 'John Doe',
        externalReference: 'INV-2024-001',
        note: 'Test sale',
        createdBy: 'user-123',
      };
      const saleNumber = SaleNumber.create(2024, 1);

      // Act
      const props = SaleMapper.toDomainProps(input, saleNumber);

      // Assert
      expect(props.saleNumber).toBe(saleNumber);
      expect(props.status).toBeInstanceOf(SaleStatus);
      expect(props.status.getValue()).toBe('DRAFT');
      expect(props.warehouseId).toBe('warehouse-123');
      expect(props.customerReference).toBe('John Doe');
      expect(props.externalReference).toBe('INV-2024-001');
      expect(props.note).toBe('Test sale');
      expect(props.createdBy).toBe('user-123');
    });

    it('Given: minimal CreateSaleDto When: converting to domain props Then: should handle undefined optional fields', () => {
      // Arrange
      const input: ISaleCreateInput = {
        warehouseId: 'warehouse-456',
        createdBy: 'user-456',
      };
      const saleNumber = SaleNumber.create(2024, 2);

      // Act
      const props = SaleMapper.toDomainProps(input, saleNumber);

      // Assert
      expect(props.customerReference).toBeUndefined();
      expect(props.externalReference).toBeUndefined();
      expect(props.note).toBeUndefined();
    });
  });

  describe('toLineDomainProps', () => {
    it('Given: valid line input When: converting to line props Then: should create correct value objects', () => {
      // Arrange
      const input: ISaleLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 5,
        salePrice: 150.5,
        currency: 'USD',
        extra: { discount: 10 },
      };

      // Act
      const props = SaleMapper.toLineDomainProps(input);

      // Assert
      expect(props.quantity).toBeInstanceOf(Quantity);
      expect(props.quantity.getNumericValue()).toBe(5);
      expect(props.salePrice).toBeInstanceOf(SalePrice);
      expect(props.salePrice.getAmount()).toBe(150.5);
      expect(props.salePrice.getCurrency()).toBe('USD');
      expect(props.productId).toBe('product-123');
      expect(props.locationId).toBe('location-123');
      expect(props.extra).toEqual({ discount: 10 });
    });

    it('Given: line input without currency When: converting to line props Then: should use default COP', () => {
      // Arrange
      const input: ISaleLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 3,
        salePrice: 100,
      };

      // Act
      const props = SaleMapper.toLineDomainProps(input);

      // Assert
      expect(props.salePrice.getCurrency()).toBe('COP');
    });
  });

  describe('createLineEntity', () => {
    it('Given: valid line input When: creating line entity Then: should return SaleLine', () => {
      // Arrange
      const input: ISaleLineCreateInput = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: 5,
        salePrice: 100,
      };

      // Act
      const line = SaleMapper.createLineEntity(input, 'org-123');

      // Assert
      expect(line).toBeInstanceOf(SaleLine);
      expect(line.productId).toBe('product-123');
      expect(line.locationId).toBe('location-123');
      expect(line.quantity.getNumericValue()).toBe(5);
      expect(line.salePrice.getAmount()).toBe(100);
    });
  });

  describe('lineToResponseData', () => {
    it('Given: SaleLine entity When: converting to response DTO Then: should extract all values', () => {
      // Arrange
      const props = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: Quantity.create(5, 2),
        salePrice: SalePrice.create(100, 'COP', 2),
        extra: { discount: 10 },
      };
      const line = SaleLine.create(props, 'org-123');

      // Act
      const dto = SaleMapper.lineToResponseData(line);

      // Assert
      expect(dto.id).toBe(line.id);
      expect(dto.productId).toBe('product-123');
      expect(dto.locationId).toBe('location-123');
      expect(dto.quantity).toBe(5);
      expect(dto.salePrice).toBe(100);
      expect(dto.currency).toBe('COP');
      expect(dto.totalPrice).toBe(500); // 5 * 100
      expect(dto.extra).toEqual({ discount: 10 });
    });
  });

  describe('toResponseData', () => {
    const createTestSale = (includeLines: boolean = true): Sale => {
      const props = {
        saleNumber: SaleNumber.create(2024, 1),
        status: SaleStatus.create('DRAFT'),
        warehouseId: 'warehouse-123',
        customerReference: 'John Doe',
        externalReference: 'INV-001',
        note: 'Test note',
        createdBy: 'user-123',
      };
      const sale = Sale.create(props, 'org-123');

      if (includeLines) {
        const lineProps = {
          productId: 'product-123',
          locationId: 'location-123',
          quantity: Quantity.create(5, 2),
          salePrice: SalePrice.create(100, 'COP', 2),
        };
        const line = SaleLine.create(lineProps, 'org-123');
        sale.addLine(line);
      }

      return sale;
    };

    it('Given: Sale entity without lines flag When: converting to response DTO Then: should exclude lines', () => {
      // Arrange
      const sale = createTestSale();

      // Act
      const dto = SaleMapper.toResponseData(sale, false);

      // Assert
      expect(dto.id).toBe(sale.id);
      expect(dto.saleNumber).toBe('SALE-2024-001');
      expect(dto.status).toBe('DRAFT');
      expect(dto.warehouseId).toBe('warehouse-123');
      expect(dto.customerReference).toBe('John Doe');
      expect(dto.externalReference).toBe('INV-001');
      expect(dto.note).toBe('Test note');
      expect(dto.createdBy).toBe('user-123');
      expect(dto.orgId).toBe('org-123');
      expect(dto.totalAmount).toBe(500); // 5 * 100
      expect(dto.currency).toBe('COP');
      expect(dto.lines).toBeUndefined();
    });

    it('Given: Sale entity with lines flag When: converting to response DTO Then: should include lines', () => {
      // Arrange
      const sale = createTestSale();

      // Act
      const dto = SaleMapper.toResponseData(sale, true);

      // Assert
      expect(dto.lines).toBeDefined();
      expect(dto.lines).toHaveLength(1);
      expect(dto.lines![0].productId).toBe('product-123');
      expect(dto.lines![0].quantity).toBe(5);
    });

    it('Given: Sale entity without optional fields When: converting to response DTO Then: should handle undefined', () => {
      // Arrange
      const props = {
        saleNumber: SaleNumber.create(2024, 2),
        status: SaleStatus.create('DRAFT'),
        warehouseId: 'warehouse-456',
        createdBy: 'user-456',
      };
      const sale = Sale.create(props, 'org-456');

      // Act
      const dto = SaleMapper.toResponseData(sale);

      // Assert
      expect(dto.customerReference).toBeUndefined();
      expect(dto.externalReference).toBeUndefined();
      expect(dto.note).toBeUndefined();
      expect(dto.confirmedAt).toBeUndefined();
      expect(dto.cancelledAt).toBeUndefined();
      expect(dto.movementId).toBeUndefined();
    });
  });

  describe('toResponseDataList', () => {
    it('Given: array of Sale entities When: converting to response DTOs Then: should convert all sales', () => {
      // Arrange
      const props1 = {
        saleNumber: SaleNumber.create(2024, 1),
        status: SaleStatus.create('DRAFT'),
        warehouseId: 'warehouse-123',
        createdBy: 'user-123',
      };
      const props2 = {
        saleNumber: SaleNumber.create(2024, 2),
        status: SaleStatus.create('CONFIRMED'),
        warehouseId: 'warehouse-456',
        createdBy: 'user-456',
      };
      const sales = [Sale.create(props1, 'org-123'), Sale.create(props2, 'org-123')];

      // Act
      const dtos = SaleMapper.toResponseDataList(sales);

      // Assert
      expect(dtos).toHaveLength(2);
      expect(dtos[0].saleNumber).toBe('SALE-2024-001');
      expect(dtos[1].saleNumber).toBe('SALE-2024-002');
    });

    it('Given: empty array of sales When: converting to response DTOs Then: should return empty array', () => {
      // Arrange
      const sales: Sale[] = [];

      // Act
      const dtos = SaleMapper.toResponseDataList(sales);

      // Assert
      expect(dtos).toHaveLength(0);
    });

    it('Given: array of sales with includeLines flag When: converting Then: should include lines in all', () => {
      // Arrange
      const props = {
        saleNumber: SaleNumber.create(2024, 1),
        status: SaleStatus.create('DRAFT'),
        warehouseId: 'warehouse-123',
        createdBy: 'user-123',
      };
      const sale = Sale.create(props, 'org-123');
      const lineProps = {
        productId: 'product-123',
        locationId: 'location-123',
        quantity: Quantity.create(2, 0),
        salePrice: SalePrice.create(50, 'COP', 2),
      };
      sale.addLine(SaleLine.create(lineProps, 'org-123'));

      // Act
      const dtos = SaleMapper.toResponseDataList([sale], true);

      // Assert
      expect(dtos[0].lines).toBeDefined();
      expect(dtos[0].lines).toHaveLength(1);
    });
  });
});
