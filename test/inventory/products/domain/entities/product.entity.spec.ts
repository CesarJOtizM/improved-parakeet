import { describe, expect, it } from '@jest/globals';
import { Product, IProductProps } from '@product/domain/entities/product.entity';
import { ProductCreatedEvent } from '@product/domain/events/productCreated.event';
import { ProductUpdatedEvent } from '@product/domain/events/productUpdated.event';
import { CostMethod } from '@product/domain/valueObjects/costMethod.valueObject';
import { ProductName } from '@product/domain/valueObjects/productName.valueObject';
import { ProductStatus } from '@product/domain/valueObjects/productStatus.valueObject';
import { SKU } from '@product/domain/valueObjects/sku.valueObject';
import { UnitValueObject } from '@product/domain/valueObjects/unit.valueObject';

describe('Product Entity', () => {
  const createDefaultProps = (): IProductProps => ({
    sku: SKU.reconstitute('SKU-001'),
    name: ProductName.reconstitute('Test Product'),
    description: 'A test product',
    categories: [{ id: 'cat-1', name: 'Electronics' }],
    unit: UnitValueObject.create('EA', 'Each', 0),
    barcode: '1234567890',
    brand: 'TestBrand',
    model: 'Model-X',
    status: ProductStatus.create('ACTIVE'),
    costMethod: CostMethod.create('AVG'),
  });

  describe('create', () => {
    it('Given: valid props When: creating product Then: should create with generated id and emit ProductCreatedEvent', () => {
      // Arrange
      const props = createDefaultProps();

      // Act
      const product = Product.create(props, 'org-123');

      // Assert
      expect(product).toBeInstanceOf(Product);
      expect(product.id).toBeDefined();
      expect(product.orgId).toBe('org-123');
      expect(product.sku.getValue()).toBe('SKU-001');
      expect(product.name.getValue()).toBe('Test Product');
      expect(product.domainEvents).toHaveLength(1);
      expect(product.domainEvents[0]).toBeInstanceOf(ProductCreatedEvent);
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with given id and no events', () => {
      // Arrange
      const props = createDefaultProps();

      // Act
      const product = Product.reconstitute(props, 'product-123', 'org-123');

      // Assert
      expect(product.id).toBe('product-123');
      expect(product.orgId).toBe('org-123');
      expect(product.domainEvents).toHaveLength(0);
    });
  });

  describe('canChangeStatus', () => {
    it('Given: active product When: checking status change Then: should return true', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act
      const result = product.canChangeStatus('INACTIVE');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: inactive product When: checking status change Then: should return true', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('INACTIVE') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act
      const result = product.canChangeStatus('ACTIVE');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: discontinued product When: checking status change Then: should return false', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('DISCONTINUED') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act
      const result = product.canChangeStatus('ACTIVE');

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('canChangeCostMethod', () => {
    it('Given: any product When: checking cost method change Then: should return true', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act
      const result = product.canChangeCostMethod();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('validateActiveForOperation', () => {
    it('Given: active product When: validating for operation Then: should not throw', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act & Assert
      expect(() => product.validateActiveForOperation()).not.toThrow();
    });

    it('Given: inactive product When: validating for operation Then: should throw error', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('INACTIVE') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(() => product.validateActiveForOperation()).toThrow(
        'Product must be active to perform this operation'
      );
    });

    it('Given: discontinued product When: validating for operation Then: should throw error', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('DISCONTINUED') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(() => product.validateActiveForOperation()).toThrow(
        'Product must be active to perform this operation'
      );
    });
  });

  describe('update', () => {
    it('Given: active product When: updating name Then: should return updated product with event', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act
      const updated = product.update({ name: ProductName.reconstitute('Updated Name') });

      // Assert
      expect(updated.name.getValue()).toBe('Updated Name');
      expect(updated.id).toBe('p-1');
      expect(updated.domainEvents).toHaveLength(1);
      expect(updated.domainEvents[0]).toBeInstanceOf(ProductUpdatedEvent);
    });

    it('Given: active product When: updating status Then: should track statusChangedBy and statusChangedAt', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act
      const updated = product.update({
        status: ProductStatus.create('INACTIVE'),
        statusChangedBy: 'user-999',
        statusChangedAt: new Date('2026-02-20T12:00:00Z'),
      });

      // Assert
      expect(updated.status.getValue()).toBe('INACTIVE');
      expect(updated.statusChangedBy).toBe('user-999');
      expect(updated.statusChangedAt).toEqual(new Date('2026-02-20T12:00:00Z'));
    });

    it('Given: active product When: updating status without explicit changedBy Then: should use default statusChangedAt', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act
      const updated = product.update({
        status: ProductStatus.create('INACTIVE'),
      });

      // Assert
      expect(updated.status.getValue()).toBe('INACTIVE');
      expect(updated.statusChangedAt).toBeInstanceOf(Date);
    });

    it('Given: product When: updating non-status fields Then: should preserve original statusChangedBy', () => {
      // Arrange
      const props = {
        ...createDefaultProps(),
        statusChangedBy: 'user-original',
        statusChangedAt: new Date('2026-01-01'),
      };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act
      const updated = product.update({ brand: 'NewBrand' });

      // Assert
      expect(updated.brand).toBe('NewBrand');
      expect(updated.statusChangedBy).toBe('user-original');
      expect(updated.statusChangedAt).toEqual(new Date('2026-01-01'));
    });

    it('Given: discontinued product When: updating status Then: should throw error', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('DISCONTINUED') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(() => product.update({ status: ProductStatus.create('ACTIVE') })).toThrow(
        'Cannot change status of a discontinued product'
      );
    });
  });

  describe('activate', () => {
    it('Given: inactive product When: activating Then: should return active product with event', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('INACTIVE') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act
      const activated = product.activate();

      // Assert
      expect(activated.status.getValue()).toBe('ACTIVE');
      expect(activated.isActive).toBe(true);
      expect(activated.domainEvents).toHaveLength(1);
      expect(activated.domainEvents[0]).toBeInstanceOf(ProductUpdatedEvent);
    });

    it('Given: discontinued product When: activating Then: should throw error', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('DISCONTINUED') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(() => product.activate()).toThrow('Cannot change status of a discontinued product');
    });
  });

  describe('deactivate', () => {
    it('Given: active product When: deactivating Then: should return inactive product with event', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act
      const deactivated = product.deactivate();

      // Assert
      expect(deactivated.status.getValue()).toBe('INACTIVE');
      expect(deactivated.isActive).toBe(false);
      expect(deactivated.domainEvents).toHaveLength(1);
      expect(deactivated.domainEvents[0]).toBeInstanceOf(ProductUpdatedEvent);
    });

    it('Given: discontinued product When: deactivating Then: should throw error', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('DISCONTINUED') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(() => product.deactivate()).toThrow('Cannot change status of a discontinued product');
    });
  });

  describe('getters', () => {
    it('Given: product with all props When: accessing getters Then: should return correct values', () => {
      // Arrange
      const props = createDefaultProps();
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(product.sku).toBe(props.sku);
      expect(product.name).toBe(props.name);
      expect(product.description).toBe('A test product');
      expect(product.categories).toEqual([{ id: 'cat-1', name: 'Electronics' }]);
      expect(product.unit).toBe(props.unit);
      expect(product.barcode).toBe('1234567890');
      expect(product.brand).toBe('TestBrand');
      expect(product.model).toBe('Model-X');
      expect(product.status).toBe(props.status);
      expect(product.costMethod).toBe(props.costMethod);
      expect(product.isActive).toBe(true);
    });

    it('Given: product without optional props When: accessing getters Then: should return undefined for optional fields', () => {
      // Arrange
      const props: IProductProps = {
        sku: SKU.reconstitute('SKU-002'),
        name: ProductName.reconstitute('Minimal Product'),
        unit: UnitValueObject.create('KG', 'Kilogram', 2),
        status: ProductStatus.create('ACTIVE'),
        costMethod: CostMethod.create('FIFO'),
      };
      const product = Product.reconstitute(props, 'p-2', 'org-1');

      // Act & Assert
      expect(product.description).toBeUndefined();
      expect(product.categories).toEqual([]);
      expect(product.barcode).toBeUndefined();
      expect(product.brand).toBeUndefined();
      expect(product.model).toBeUndefined();
      expect(product.price).toBeUndefined();
      expect(product.statusChangedBy).toBeUndefined();
      expect(product.statusChangedAt).toBeUndefined();
    });

    it('Given: product with statusChangedBy When: accessing getter Then: should return the value', () => {
      // Arrange
      const props = {
        ...createDefaultProps(),
        statusChangedBy: 'user-admin',
        statusChangedAt: new Date('2026-02-15'),
      };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(product.statusChangedBy).toBe('user-admin');
      expect(product.statusChangedAt).toEqual(new Date('2026-02-15'));
    });

    it('Given: inactive product When: checking isActive Then: should return false', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('INACTIVE') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(product.isActive).toBe(false);
    });

    it('Given: product with companyId and companyName When: accessing getters Then: should return values', () => {
      // Arrange
      const props = {
        ...createDefaultProps(),
        companyId: 'company-001',
        companyName: 'Acme Corp',
      };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(product.companyId).toBe('company-001');
      expect(product.companyName).toBe('Acme Corp');
    });

    it('Given: product without companyId and companyName When: accessing getters Then: should return undefined', () => {
      // Arrange
      const props = createDefaultProps();
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(product.companyId).toBeUndefined();
      expect(product.companyName).toBeUndefined();
    });

    it('Given: product with price When: accessing price getter Then: should return price', () => {
      // Arrange
      const { Price } = require('@product/domain/valueObjects/price.valueObject');
      const props = {
        ...createDefaultProps(),
        price: Price.create(99.99, 'USD', 2),
      };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act & Assert
      expect(product.price).toBeDefined();
    });
  });

  describe('update', () => {
    it('Given: active product When: updating multiple fields Then: should update all provided fields', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act
      const updated = product.update({
        description: 'New description',
        barcode: '9999999999',
        model: 'Model-Y',
        companyId: 'company-new',
        companyName: 'New Corp',
      });

      // Assert
      expect(updated.description).toBe('New description');
      expect(updated.barcode).toBe('9999999999');
      expect(updated.model).toBe('Model-Y');
      expect(updated.companyId).toBe('company-new');
      expect(updated.companyName).toBe('New Corp');
    });

    it('Given: active product When: updating categories Then: should update categories', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');
      const newCategories = [
        { id: 'cat-2', name: 'Appliances' },
        { id: 'cat-3', name: 'Tools' },
      ];

      // Act
      const updated = product.update({ categories: newCategories });

      // Assert
      expect(updated.categories).toEqual(newCategories);
    });

    it('Given: active product When: updating unit Then: should update unit', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');
      const newUnit = UnitValueObject.create('KG', 'Kilogram', 2);

      // Act
      const updated = product.update({ unit: newUnit });

      // Assert
      expect(updated.unit).toBe(newUnit);
    });

    it('Given: active product When: updating costMethod Then: should update costMethod', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act
      const updated = product.update({ costMethod: CostMethod.create('FIFO') });

      // Assert
      expect(updated.costMethod.getValue()).toBe('FIFO');
    });

    it('Given: active product When: updating sku Then: should update sku', () => {
      // Arrange
      const product = Product.reconstitute(createDefaultProps(), 'p-1', 'org-1');

      // Act
      const updated = product.update({ sku: SKU.reconstitute('SKU-NEW') });

      // Assert
      expect(updated.sku.getValue()).toBe('SKU-NEW');
    });

    it('Given: active product When: updating status to same value Then: should not change statusChangedBy', () => {
      // Arrange
      const props = {
        ...createDefaultProps(),
        statusChangedBy: 'original-user',
        statusChangedAt: new Date('2026-01-01'),
      };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act
      const updated = product.update({ status: ProductStatus.create('ACTIVE') });

      // Assert
      expect(updated.statusChangedBy).toBe('original-user');
      expect(updated.statusChangedAt).toEqual(new Date('2026-01-01'));
    });

    it('Given: discontinued product When: updating non-status field Then: should still update', () => {
      // Arrange
      const props = { ...createDefaultProps(), status: ProductStatus.create('DISCONTINUED') };
      const product = Product.reconstitute(props, 'p-1', 'org-1');

      // Act
      const updated = product.update({ brand: 'NewBrand' });

      // Assert
      expect(updated.brand).toBe('NewBrand');
    });
  });
});
