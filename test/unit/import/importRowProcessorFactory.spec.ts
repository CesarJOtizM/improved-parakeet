import { ImportRowProcessorFactory } from '@import/application/services/importRowProcessorFactory';
import { ImportRow, ImportType, ValidationResult } from '@import/domain';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('ImportRowProcessorFactory', () => {
  let factory: ImportRowProcessorFactory;
  let mockProductRepo: any;
  let mockWarehouseRepo: any;
  let mockLocationRepo: any;
  let mockCompanyRepo: any;
  let mockCreateProductUseCase: any;
  let mockCreateMovementUseCase: any;
  let mockCreateWarehouseUseCase: any;
  let mockInitiateTransferUseCase: any;

  beforeEach(() => {
    mockProductRepo = {
      findBySku: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByCategory: jest.fn(),
      findByStatus: jest.fn(),
      findByWarehouse: jest.fn(),
      findLowStock: jest.fn(),
      existsBySku: jest.fn(),
      findBySpecification: jest.fn(),
    };
    mockWarehouseRepo = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      existsByCode: jest.fn(),
      findActive: jest.fn(),
    };
    mockLocationRepo = {
      findByCode: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByWarehouse: jest.fn(),
      findDefaultLocation: jest.fn(),
      existsByCode: jest.fn(),
    };
    mockCompanyRepo = {
      findByCode: jest.fn(),
    };
    mockCreateProductUseCase = {
      execute: jest.fn(),
    };
    mockCreateMovementUseCase = {
      execute: jest.fn(),
    };
    mockCreateWarehouseUseCase = {
      execute: jest.fn(),
    };
    mockInitiateTransferUseCase = {
      execute: jest.fn(),
    };

    factory = new ImportRowProcessorFactory(
      mockProductRepo,
      mockWarehouseRepo,
      mockLocationRepo,
      mockCompanyRepo,
      mockCreateProductUseCase,
      mockCreateMovementUseCase,
      mockCreateWarehouseUseCase,
      mockInitiateTransferUseCase
    );
  });

  // Helper to create an ImportRow
  const createRow = (rowNumber: number, data: Record<string, unknown>) => {
    return ImportRow.create(
      {
        rowNumber,
        data,
        validationResult: ValidationResult.valid(),
      },
      'org-1'
    );
  };

  describe('createProcessor', () => {
    it('should return a processor for PRODUCTS type', () => {
      const processor = factory.createProcessor(ImportType.create('PRODUCTS'));
      expect(processor).toBeDefined();
      expect(typeof processor).toBe('function');
    });

    it('should return a processor for MOVEMENTS type', () => {
      const processor = factory.createProcessor(ImportType.create('MOVEMENTS'));
      expect(processor).toBeDefined();
      expect(typeof processor).toBe('function');
    });

    it('should return a processor for WAREHOUSES type', () => {
      const processor = factory.createProcessor(ImportType.create('WAREHOUSES'));
      expect(processor).toBeDefined();
      expect(typeof processor).toBe('function');
    });

    it('should return a processor for STOCK type', () => {
      const processor = factory.createProcessor(ImportType.create('STOCK'));
      expect(processor).toBeDefined();
      expect(typeof processor).toBe('function');
    });

    it('should return a processor for TRANSFERS type', () => {
      const processor = factory.createProcessor(ImportType.create('TRANSFERS'));
      expect(processor).toBeDefined();
      expect(typeof processor).toBe('function');
    });
  });

  describe('PRODUCTS processor', () => {
    it('should create a product successfully', async () => {
      const processor = factory.createProcessor(ImportType.create('PRODUCTS'));
      const row = createRow(2, {
        SKU: 'PROD-001',
        Name: 'Test Product',
        'Unit Code': 'UND',
        'Unit Name': 'Unit',
        'Unit Precision': 0,
      });

      mockCreateProductUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'product-1' } }),
      });

      const result = await processor(row, ImportType.create('PRODUCTS'), 'org-1');
      expect(result.success).toBe(true);
      expect(result.rowNumber).toBe(2);
      expect(result.entityId).toBe('product-1');
    });

    it('should resolve company code if present', async () => {
      const processor = factory.createProcessor(ImportType.create('PRODUCTS'));
      const row = createRow(2, {
        SKU: 'PROD-001',
        Name: 'Test Product',
        'Unit Code': 'UND',
        'Unit Name': 'Unit',
        'Unit Precision': 0,
        'Company Code': 'GYM-001',
      });

      mockCompanyRepo.findByCode.mockResolvedValue({ id: 'company-1' });
      mockCreateProductUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'product-1' } }),
      });

      const result = await processor(row, ImportType.create('PRODUCTS'), 'org-1');
      expect(result.success).toBe(true);
      expect(mockCompanyRepo.findByCode).toHaveBeenCalledWith('GYM-001', 'org-1');
      expect(mockCreateProductUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 'company-1' })
      );
    });

    it('should fail if company code not found', async () => {
      const processor = factory.createProcessor(ImportType.create('PRODUCTS'));
      const row = createRow(2, {
        SKU: 'PROD-001',
        Name: 'Test Product',
        'Unit Code': 'UND',
        'Unit Name': 'Unit',
        'Unit Precision': 0,
        'Company Code': 'INVALID',
      });

      mockCompanyRepo.findByCode.mockResolvedValue(null);

      const result = await processor(row, ImportType.create('PRODUCTS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Company code "INVALID" not found');
    });

    it('should fail if create use case returns error', async () => {
      const processor = factory.createProcessor(ImportType.create('PRODUCTS'));
      const row = createRow(2, {
        SKU: 'PROD-001',
        Name: 'Test Product',
        'Unit Code': 'UND',
        'Unit Name': 'Unit',
        'Unit Precision': 0,
      });

      mockCreateProductUseCase.execute.mockResolvedValue({
        isOk: () => false,
        unwrapErr: () => ({ message: 'SKU already exists' }),
      });

      const result = await processor(row, ImportType.create('PRODUCTS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('SKU already exists');
    });

    it('should handle unexpected exceptions gracefully', async () => {
      const processor = factory.createProcessor(ImportType.create('PRODUCTS'));
      const row = createRow(2, {
        SKU: 'PROD-001',
        Name: 'Test Product',
        'Unit Code': 'UND',
        'Unit Name': 'Unit',
        'Unit Precision': 0,
      });

      mockCreateProductUseCase.execute.mockRejectedValue(new Error('Connection lost'));

      const result = await processor(row, ImportType.create('PRODUCTS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection lost');
    });
  });

  describe('MOVEMENTS processor', () => {
    it('should create a movement after resolving codes', async () => {
      const processor = factory.createProcessor(ImportType.create('MOVEMENTS'));
      const row = createRow(2, {
        Type: 'IN',
        'Warehouse Code': 'WH-001',
        'Product SKU': 'PROD-001',
        Quantity: 100,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue({ id: 'wh-1' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockCreateMovementUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'mov-1' } }),
      });

      const result = await processor(row, ImportType.create('MOVEMENTS'), 'org-1');
      expect(result.success).toBe(true);
      expect(mockWarehouseRepo.findByCode).toHaveBeenCalledWith('WH-001', 'org-1');
      expect(mockProductRepo.findBySku).toHaveBeenCalledWith('PROD-001', 'org-1');
    });

    it('should fail if warehouse not found', async () => {
      const processor = factory.createProcessor(ImportType.create('MOVEMENTS'));
      const row = createRow(2, {
        Type: 'IN',
        'Warehouse Code': 'INVALID',
        'Product SKU': 'PROD-001',
        Quantity: 100,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue(null);

      const result = await processor(row, ImportType.create('MOVEMENTS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Warehouse code "INVALID" not found');
    });

    it('should fail if product not found', async () => {
      const processor = factory.createProcessor(ImportType.create('MOVEMENTS'));
      const row = createRow(2, {
        Type: 'IN',
        'Warehouse Code': 'WH-001',
        'Product SKU': 'INVALID',
        Quantity: 100,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue({ id: 'wh-1' });
      mockProductRepo.findBySku.mockResolvedValue(null);

      const result = await processor(row, ImportType.create('MOVEMENTS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Product SKU "INVALID" not found');
    });

    it('should resolve location code if present', async () => {
      const processor = factory.createProcessor(ImportType.create('MOVEMENTS'));
      const row = createRow(2, {
        Type: 'IN',
        'Warehouse Code': 'WH-001',
        'Product SKU': 'PROD-001',
        'Location Code': 'LOC-A1',
        Quantity: 50,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue({ id: 'wh-1' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockLocationRepo.findByCode.mockResolvedValue({ id: 'loc-1' });
      mockCreateMovementUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'mov-1' } }),
      });

      const result = await processor(row, ImportType.create('MOVEMENTS'), 'org-1');
      expect(result.success).toBe(true);
      expect(mockLocationRepo.findByCode).toHaveBeenCalledWith('LOC-A1', 'wh-1', 'org-1');
      expect(mockCreateMovementUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([expect.objectContaining({ locationId: 'loc-1' })]),
        })
      );
    });

    it('should fail if location code not found', async () => {
      const processor = factory.createProcessor(ImportType.create('MOVEMENTS'));
      const row = createRow(2, {
        Type: 'IN',
        'Warehouse Code': 'WH-001',
        'Product SKU': 'PROD-001',
        'Location Code': 'INVALID-LOC',
        Quantity: 50,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue({ id: 'wh-1' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockLocationRepo.findByCode.mockResolvedValue(null);

      const result = await processor(row, ImportType.create('MOVEMENTS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Location code "INVALID-LOC" not found');
    });

    it('should fail if create movement use case returns error', async () => {
      const processor = factory.createProcessor(ImportType.create('MOVEMENTS'));
      const row = createRow(2, {
        Type: 'IN',
        'Warehouse Code': 'WH-001',
        'Product SKU': 'PROD-001',
        Quantity: 100,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue({ id: 'wh-1' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockCreateMovementUseCase.execute.mockResolvedValue({
        isOk: () => false,
        unwrapErr: () => ({ message: 'Insufficient stock' }),
      });

      const result = await processor(row, ImportType.create('MOVEMENTS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient stock');
    });
  });

  describe('WAREHOUSES processor', () => {
    it('should create a warehouse successfully', async () => {
      const processor = factory.createProcessor(ImportType.create('WAREHOUSES'));
      const row = createRow(2, {
        Code: 'WH-003',
        Name: 'New Warehouse',
      });

      mockCreateWarehouseUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'wh-3' } }),
      });

      const result = await processor(row, ImportType.create('WAREHOUSES'), 'org-1');
      expect(result.success).toBe(true);
      expect(result.entityId).toBe('wh-3');
    });

    it('should pass description and address if provided', async () => {
      const processor = factory.createProcessor(ImportType.create('WAREHOUSES'));
      const row = createRow(2, {
        Code: 'WH-003',
        Name: 'New Warehouse',
        Description: 'Main storage facility',
        Address: '123 Main St',
      });

      mockCreateWarehouseUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'wh-3' } }),
      });

      const result = await processor(row, ImportType.create('WAREHOUSES'), 'org-1');
      expect(result.success).toBe(true);
      expect(mockCreateWarehouseUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'WH-003',
          name: 'New Warehouse',
          description: 'Main storage facility',
          address: { street: '123 Main St' },
          orgId: 'org-1',
        })
      );
    });

    it('should fail if create warehouse use case returns error', async () => {
      const processor = factory.createProcessor(ImportType.create('WAREHOUSES'));
      const row = createRow(2, {
        Code: 'WH-003',
        Name: 'New Warehouse',
      });

      mockCreateWarehouseUseCase.execute.mockResolvedValue({
        isOk: () => false,
        unwrapErr: () => ({ message: 'Code already exists' }),
      });

      const result = await processor(row, ImportType.create('WAREHOUSES'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Code already exists');
    });
  });

  describe('STOCK processor', () => {
    it('should create an ADJUST_IN movement for stock', async () => {
      const processor = factory.createProcessor(ImportType.create('STOCK'));
      const row = createRow(2, {
        'Product SKU': 'PROD-001',
        'Warehouse Code': 'WH-001',
        Quantity: 500,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue({ id: 'wh-1' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockCreateMovementUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'mov-1' } }),
      });

      const result = await processor(row, ImportType.create('STOCK'), 'org-1');
      expect(result.success).toBe(true);
      expect(mockCreateMovementUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ADJUST_IN' })
      );
    });

    it('should fail if warehouse not found for stock import', async () => {
      const processor = factory.createProcessor(ImportType.create('STOCK'));
      const row = createRow(2, {
        'Product SKU': 'PROD-001',
        'Warehouse Code': 'BAD-WH',
        Quantity: 500,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue(null);

      const result = await processor(row, ImportType.create('STOCK'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Warehouse code "BAD-WH" not found');
    });

    it('should fail if product not found for stock import', async () => {
      const processor = factory.createProcessor(ImportType.create('STOCK'));
      const row = createRow(2, {
        'Product SKU': 'BAD-SKU',
        'Warehouse Code': 'WH-001',
        Quantity: 500,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue({ id: 'wh-1' });
      mockProductRepo.findBySku.mockResolvedValue(null);

      const result = await processor(row, ImportType.create('STOCK'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Product SKU "BAD-SKU" not found');
    });

    it('should include reference and reason for stock adjustment', async () => {
      const processor = factory.createProcessor(ImportType.create('STOCK'));
      const row = createRow(5, {
        'Product SKU': 'PROD-001',
        'Warehouse Code': 'WH-001',
        Quantity: 100,
      });

      mockWarehouseRepo.findByCode.mockResolvedValue({ id: 'wh-1' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockCreateMovementUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'mov-1' } }),
      });

      await processor(row, ImportType.create('STOCK'), 'org-1');
      expect(mockCreateMovementUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          reference: 'STOCK-IMPORT-5',
          reason: 'Stock import adjustment',
        })
      );
    });
  });

  describe('TRANSFERS processor', () => {
    it('should create a transfer after resolving all codes', async () => {
      const processor = factory.createProcessor(ImportType.create('TRANSFERS'));
      const row = createRow(2, {
        'From Warehouse Code': 'WH-001',
        'To Warehouse Code': 'WH-002',
        'Product SKU': 'PROD-001',
        Quantity: 50,
      });

      mockWarehouseRepo.findByCode
        .mockResolvedValueOnce({ id: 'wh-1' })
        .mockResolvedValueOnce({ id: 'wh-2' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockInitiateTransferUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'transfer-1' } }),
      });

      const result = await processor(row, ImportType.create('TRANSFERS'), 'org-1');
      expect(result.success).toBe(true);
      expect(result.entityId).toBe('transfer-1');
    });

    it('should fail if from warehouse not found', async () => {
      const processor = factory.createProcessor(ImportType.create('TRANSFERS'));
      const row = createRow(2, {
        'From Warehouse Code': 'BAD-WH',
        'To Warehouse Code': 'WH-002',
        'Product SKU': 'PROD-001',
        Quantity: 50,
      });

      mockWarehouseRepo.findByCode.mockResolvedValueOnce(null);

      const result = await processor(row, ImportType.create('TRANSFERS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('From warehouse code "BAD-WH" not found');
    });

    it('should fail if to warehouse not found', async () => {
      const processor = factory.createProcessor(ImportType.create('TRANSFERS'));
      const row = createRow(2, {
        'From Warehouse Code': 'WH-001',
        'To Warehouse Code': 'BAD-WH',
        'Product SKU': 'PROD-001',
        Quantity: 50,
      });

      mockWarehouseRepo.findByCode
        .mockResolvedValueOnce({ id: 'wh-1' })
        .mockResolvedValueOnce(null);

      const result = await processor(row, ImportType.create('TRANSFERS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('To warehouse code "BAD-WH" not found');
    });

    it('should fail if product not found for transfer', async () => {
      const processor = factory.createProcessor(ImportType.create('TRANSFERS'));
      const row = createRow(2, {
        'From Warehouse Code': 'WH-001',
        'To Warehouse Code': 'WH-002',
        'Product SKU': 'BAD-SKU',
        Quantity: 50,
      });

      mockWarehouseRepo.findByCode
        .mockResolvedValueOnce({ id: 'wh-1' })
        .mockResolvedValueOnce({ id: 'wh-2' });
      mockProductRepo.findBySku.mockResolvedValue(null);

      const result = await processor(row, ImportType.create('TRANSFERS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Product SKU "BAD-SKU" not found');
    });

    it('should resolve from/to location codes if present', async () => {
      const processor = factory.createProcessor(ImportType.create('TRANSFERS'));
      const row = createRow(2, {
        'From Warehouse Code': 'WH-001',
        'To Warehouse Code': 'WH-002',
        'Product SKU': 'PROD-001',
        'From Location Code': 'LOC-A1',
        'To Location Code': 'LOC-B2',
        Quantity: 50,
      });

      mockWarehouseRepo.findByCode
        .mockResolvedValueOnce({ id: 'wh-1' })
        .mockResolvedValueOnce({ id: 'wh-2' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockLocationRepo.findByCode
        .mockResolvedValueOnce({ id: 'loc-a1' })
        .mockResolvedValueOnce({ id: 'loc-b2' });
      mockInitiateTransferUseCase.execute.mockResolvedValue({
        isOk: () => true,
        unwrap: () => ({ data: { id: 'transfer-1' } }),
      });

      const result = await processor(row, ImportType.create('TRANSFERS'), 'org-1');
      expect(result.success).toBe(true);
      expect(mockLocationRepo.findByCode).toHaveBeenCalledWith('LOC-A1', 'wh-1', 'org-1');
      expect(mockLocationRepo.findByCode).toHaveBeenCalledWith('LOC-B2', 'wh-2', 'org-1');
      expect(mockInitiateTransferUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({
              fromLocationId: 'loc-a1',
              toLocationId: 'loc-b2',
            }),
          ]),
        })
      );
    });

    it('should fail if from location code not found', async () => {
      const processor = factory.createProcessor(ImportType.create('TRANSFERS'));
      const row = createRow(2, {
        'From Warehouse Code': 'WH-001',
        'To Warehouse Code': 'WH-002',
        'Product SKU': 'PROD-001',
        'From Location Code': 'BAD-LOC',
        Quantity: 50,
      });

      mockWarehouseRepo.findByCode
        .mockResolvedValueOnce({ id: 'wh-1' })
        .mockResolvedValueOnce({ id: 'wh-2' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockLocationRepo.findByCode.mockResolvedValueOnce(null);

      const result = await processor(row, ImportType.create('TRANSFERS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toContain('From location code "BAD-LOC" not found');
    });

    it('should fail if initiate transfer use case returns error', async () => {
      const processor = factory.createProcessor(ImportType.create('TRANSFERS'));
      const row = createRow(2, {
        'From Warehouse Code': 'WH-001',
        'To Warehouse Code': 'WH-002',
        'Product SKU': 'PROD-001',
        Quantity: 50,
      });

      mockWarehouseRepo.findByCode
        .mockResolvedValueOnce({ id: 'wh-1' })
        .mockResolvedValueOnce({ id: 'wh-2' });
      mockProductRepo.findBySku.mockResolvedValue({ id: 'prod-1' });
      mockInitiateTransferUseCase.execute.mockResolvedValue({
        isOk: () => false,
        unwrapErr: () => ({ message: 'Insufficient stock for transfer' }),
      });

      const result = await processor(row, ImportType.create('TRANSFERS'), 'org-1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient stock for transfer');
    });
  });
});
