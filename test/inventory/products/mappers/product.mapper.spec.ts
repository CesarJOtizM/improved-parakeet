import { IProductCreateInput, ProductMapper } from '@inventory/products/mappers/product.mapper';
import { Product } from '@product/domain/entities/product.entity';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';

describe('ProductMapper', () => {
  describe('toDomainProps', () => {
    it('Given: valid CreateProductDto When: converting to domain props Then: should create correct value objects', () => {
      // Arrange
      const input: IProductCreateInput = {
        sku: 'PROD-001',
        name: 'Test Product',
        description: 'Test Description',
        unit: {
          code: 'UNIT',
          name: 'Unit',
          precision: 0,
        },
        barcode: '1234567890',
        brand: 'Test Brand',
        model: 'Test Model',
        status: 'ACTIVE',
        costMethod: 'AVG',
      };

      // Act
      const props = ProductMapper.toDomainProps(input);

      // Assert
      expect(props.sku).toBeInstanceOf(SKU);
      expect(props.sku.getValue()).toBe('PROD-001');
      expect(props.name).toBeInstanceOf(ProductName);
      expect(props.name.getValue()).toBe('Test Product');
      expect(props.unit).toBeInstanceOf(UnitValueObject);
      expect(props.unit.getValue().code).toBe('UNIT');
      expect(props.unit.getValue().name).toBe('Unit');
      expect(props.unit.getValue().precision).toBe(0);
      expect(props.status).toBeInstanceOf(ProductStatus);
      expect(props.status.getValue()).toBe('ACTIVE');
      expect(props.costMethod).toBeInstanceOf(CostMethod);
      expect(props.costMethod.getValue()).toBe('AVG');
      expect(props.description).toBe('Test Description');
      expect(props.barcode).toBe('1234567890');
      expect(props.brand).toBe('Test Brand');
      expect(props.model).toBe('Test Model');
    });

    it('Given: minimal CreateProductDto When: converting to domain props Then: should use default values', () => {
      // Arrange
      const input: IProductCreateInput = {
        sku: 'PROD-002',
        name: 'Minimal Product',
        unit: {
          code: 'KG',
          name: 'Kilogram',
          precision: 2,
        },
      };

      // Act
      const props = ProductMapper.toDomainProps(input);

      // Assert
      expect(props.sku.getValue()).toBe('PROD-002');
      expect(props.name.getValue()).toBe('Minimal Product');
      expect(props.status.getValue()).toBe('ACTIVE'); // Default
      expect(props.costMethod.getValue()).toBe('AVG'); // Default
      expect(props.description).toBeUndefined();
      expect(props.barcode).toBeUndefined();
      expect(props.brand).toBeUndefined();
      expect(props.model).toBeUndefined();
    });

    it('Given: FIFO cost method When: converting to domain props Then: should create FIFO value object', () => {
      // Arrange
      const input: IProductCreateInput = {
        sku: 'PROD-003',
        name: 'FIFO Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        costMethod: 'FIFO',
      };

      // Act
      const props = ProductMapper.toDomainProps(input);

      // Assert
      expect(props.costMethod.getValue()).toBe('FIFO');
    });

    it('Given: INACTIVE status When: converting to domain props Then: should create INACTIVE value object', () => {
      // Arrange
      const input: IProductCreateInput = {
        sku: 'PROD-004',
        name: 'Inactive Product',
        unit: { code: 'UNIT', name: 'Unit', precision: 0 },
        status: 'INACTIVE',
      };

      // Act
      const props = ProductMapper.toDomainProps(input);

      // Assert
      expect(props.status.getValue()).toBe('INACTIVE');
    });
  });

  describe('toResponseData', () => {
    const createTestProduct = (): Product => {
      const props = {
        sku: SKU.create('PROD-001'),
        name: ProductName.create('Test Product'),
        description: 'Test Description',
        unit: UnitValueObject.create('UNIT', 'Unit', 0),
        barcode: '1234567890',
        brand: 'Test Brand',
        model: 'Test Model',
        status: ProductStatus.create('ACTIVE'),
        costMethod: CostMethod.create('AVG'),
      };
      return Product.create(props, 'org-123');
    };

    it('Given: valid Product entity When: converting to response DTO Then: should extract all values correctly', () => {
      // Arrange
      const product = createTestProduct();

      // Act
      const dto = ProductMapper.toResponseData(product);

      // Assert
      expect(dto.id).toBe(product.id);
      expect(dto.sku).toBe('PROD-001');
      expect(dto.name).toBe('Test Product');
      expect(dto.description).toBe('Test Description');
      expect(dto.unit.code).toBe('UNIT');
      expect(dto.unit.name).toBe('Unit');
      expect(dto.unit.precision).toBe(0);
      expect(dto.barcode).toBe('1234567890');
      expect(dto.brand).toBe('Test Brand');
      expect(dto.model).toBe('Test Model');
      expect(dto.status).toBe('ACTIVE');
      expect(dto.costMethod).toBe('AVG');
      expect(dto.orgId).toBe('org-123');
      expect(dto.createdAt).toBeDefined();
      expect(dto.updatedAt).toBeDefined();
    });

    it('Given: Product entity with optional fields undefined When: converting to response DTO Then: should handle undefined fields', () => {
      // Arrange
      const props = {
        sku: SKU.create('PROD-002'),
        name: ProductName.create('Minimal Product'),
        unit: UnitValueObject.create('KG', 'Kilogram', 2),
        status: ProductStatus.create('ACTIVE'),
        costMethod: CostMethod.create('FIFO'),
      };
      const product = Product.create(props, 'org-456');

      // Act
      const dto = ProductMapper.toResponseData(product);

      // Assert
      expect(dto.sku).toBe('PROD-002');
      expect(dto.name).toBe('Minimal Product');
      expect(dto.description).toBeUndefined();
      expect(dto.barcode).toBeUndefined();
      expect(dto.brand).toBeUndefined();
      expect(dto.model).toBeUndefined();
      expect(dto.costMethod).toBe('FIFO');
    });
  });

  describe('toResponseDataList', () => {
    it('Given: array of Product entities When: converting to response DTOs Then: should convert all products', () => {
      // Arrange
      const props1 = {
        sku: SKU.create('PROD-001'),
        name: ProductName.create('Product 1'),
        unit: UnitValueObject.create('UNIT', 'Unit', 0),
        status: ProductStatus.create('ACTIVE'),
        costMethod: CostMethod.create('AVG'),
      };
      const props2 = {
        sku: SKU.create('PROD-002'),
        name: ProductName.create('Product 2'),
        unit: UnitValueObject.create('KG', 'Kilogram', 2),
        status: ProductStatus.create('INACTIVE'),
        costMethod: CostMethod.create('FIFO'),
      };
      const products = [Product.create(props1, 'org-123'), Product.create(props2, 'org-123')];

      // Act
      const dtos = ProductMapper.toResponseDataList(products);

      // Assert
      expect(dtos).toHaveLength(2);
      expect(dtos[0].sku).toBe('PROD-001');
      expect(dtos[0].name).toBe('Product 1');
      expect(dtos[1].sku).toBe('PROD-002');
      expect(dtos[1].name).toBe('Product 2');
    });

    it('Given: empty array of products When: converting to response DTOs Then: should return empty array', () => {
      // Arrange
      const products: Product[] = [];

      // Act
      const dtos = ProductMapper.toResponseDataList(products);

      // Assert
      expect(dtos).toHaveLength(0);
    });
  });
});
