// ReportParameters Value Object Tests
// Unit tests for ReportParameters following AAA and Given-When-Then pattern

import {
  GROUP_BY_OPTIONS,
  LOW_STOCK_SEVERITY,
  PERIOD_OPTIONS,
  ReportParameters,
  RETURN_TYPE_OPTIONS,
} from '@report/domain/valueObjects';

describe('ReportParameters Value Object', () => {
  describe('create', () => {
    it('Given: valid parameters When: creating ReportParameters Then: should create instance', () => {
      // Arrange
      const input = {
        warehouseId: 'warehouse-123',
        productId: 'product-456',
      };

      // Act
      const params = ReportParameters.create(input);

      // Assert
      expect(params).toBeDefined();
      expect(params.getWarehouseId()).toBe(input.warehouseId);
      expect(params.getProductId()).toBe(input.productId);
    });

    it('Given: empty object When: creating ReportParameters Then: should create empty instance', () => {
      // Act
      const params = ReportParameters.create({});

      // Assert
      expect(params).toBeDefined();
      expect(params.getWarehouseId()).toBeUndefined();
    });

    it('Given: valid date range When: creating ReportParameters Then: should set date range', () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Act
      const params = ReportParameters.create({
        dateRange: { startDate, endDate },
      });

      // Assert
      expect(params.getDateRange()).toBeDefined();
      expect(params.getDateRange()?.startDate).toEqual(startDate);
      expect(params.getDateRange()?.endDate).toEqual(endDate);
    });

    it('Given: invalid date range (start after end) When: creating Then: should throw error', () => {
      // Arrange
      const startDate = new Date('2024-12-31');
      const endDate = new Date('2024-01-01');

      // Act & Assert
      expect(() =>
        ReportParameters.create({
          dateRange: { startDate, endDate },
        })
      ).toThrow('Start date cannot be after end date');
    });

    it('Given: valid groupBy When: creating ReportParameters Then: should set groupBy', () => {
      // Arrange
      const groupBy = GROUP_BY_OPTIONS.MONTH;

      // Act
      const params = ReportParameters.create({ groupBy });

      // Assert
      expect(params.getGroupBy()).toBe(groupBy);
    });

    it('Given: invalid groupBy When: creating Then: should throw error', () => {
      // Arrange
      const groupBy = 'INVALID' as 'DAY';

      // Act & Assert
      expect(() => ReportParameters.create({ groupBy })).toThrow('Invalid groupBy value');
    });

    it('Given: valid period When: creating ReportParameters Then: should set period', () => {
      // Arrange
      const period = PERIOD_OPTIONS.QUARTERLY;

      // Act
      const params = ReportParameters.create({ period });

      // Assert
      expect(params.getPeriod()).toBe(period);
    });

    it('Given: valid returnType When: creating ReportParameters Then: should set returnType', () => {
      // Arrange
      const returnType = RETURN_TYPE_OPTIONS.CUSTOMER;

      // Act
      const params = ReportParameters.create({ returnType });

      // Assert
      expect(params.getReturnType()).toBe(returnType);
    });

    it('Given: valid severity When: creating ReportParameters Then: should set severity', () => {
      // Arrange
      const severity = LOW_STOCK_SEVERITY.CRITICAL;

      // Act
      const params = ReportParameters.create({ severity });

      // Assert
      expect(params.getSeverity()).toBe(severity);
    });
  });

  describe('empty', () => {
    it('Given: calling empty() When: creating parameters Then: should return empty instance', () => {
      // Act
      const params = ReportParameters.empty();

      // Assert
      expect(params).toBeDefined();
      expect(params.getWarehouseId()).toBeUndefined();
      expect(params.getProductId()).toBeUndefined();
      expect(params.getDateRange()).toBeUndefined();
    });
  });

  describe('getters', () => {
    it('Given: parameters with all values When: getting values Then: should return all values', () => {
      // Arrange
      const input = {
        warehouseId: 'warehouse-123',
        productId: 'product-456',
        category: 'Electronics',
        status: 'CONFIRMED',
        movementType: 'IN',
        customerReference: 'CUST-001',
        includeInactive: true,
        locationId: 'location-789',
      };

      // Act
      const params = ReportParameters.create(input);

      // Assert
      expect(params.getWarehouseId()).toBe(input.warehouseId);
      expect(params.getProductId()).toBe(input.productId);
      expect(params.getCategory()).toBe(input.category);
      expect(params.getStatus()).toBe(input.status);
      expect(params.getMovementType()).toBe(input.movementType);
      expect(params.getCustomerReference()).toBe(input.customerReference);
      expect(params.getIncludeInactive()).toBe(true);
      expect(params.getLocationId()).toBe(input.locationId);
    });

    it('Given: parameters without includeInactive When: getting includeInactive Then: should return false', () => {
      // Arrange
      const params = ReportParameters.create({});

      // Act
      const result = params.getIncludeInactive();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('Given: parameters When: converting to JSON Then: should return correct object', () => {
      // Arrange
      const input = {
        warehouseId: 'warehouse-123',
        productId: 'product-456',
      };
      const params = ReportParameters.create(input);

      // Act
      const json = params.toJSON();

      // Assert
      expect(json.warehouseId).toBe(input.warehouseId);
      expect(json.productId).toBe(input.productId);
    });
  });

  describe('hasDateRange', () => {
    it('Given: parameters with date range When: checking hasDateRange Then: should return true', () => {
      // Arrange
      const params = ReportParameters.create({
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      });

      // Act
      const result = params.hasDateRange();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: parameters without date range When: checking hasDateRange Then: should return false', () => {
      // Arrange
      const params = ReportParameters.create({});

      // Act
      const result = params.hasDateRange();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('hasWarehouseFilter', () => {
    it('Given: parameters with warehouse When: checking hasWarehouseFilter Then: should return true', () => {
      // Arrange
      const params = ReportParameters.create({ warehouseId: 'warehouse-123' });

      // Act
      const result = params.hasWarehouseFilter();

      // Assert
      expect(result).toBe(true);
    });

    it('Given: parameters without warehouse When: checking hasWarehouseFilter Then: should return false', () => {
      // Arrange
      const params = ReportParameters.create({});

      // Act
      const result = params.hasWarehouseFilter();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('equals', () => {
    it('Given: two parameters with same values When: comparing Then: should be equal', () => {
      // Arrange
      const input = { warehouseId: 'warehouse-123' };
      const params1 = ReportParameters.create(input);
      const params2 = ReportParameters.create(input);

      // Act
      const result = params1.equals(params2);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: two parameters with different values When: comparing Then: should not be equal', () => {
      // Arrange
      const params1 = ReportParameters.create({ warehouseId: 'warehouse-123' });
      const params2 = ReportParameters.create({ warehouseId: 'warehouse-456' });

      // Act
      const result = params1.equals(params2);

      // Assert
      expect(result).toBe(false);
    });
  });
});
