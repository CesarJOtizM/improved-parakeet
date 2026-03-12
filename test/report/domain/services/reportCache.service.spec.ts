import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Cache } from '@nestjs/cache-manager';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ReportCacheService } from '@report/domain/services/reportCache.service';
import { IReportParametersInput } from '@report/domain/valueObjects/reportParameters.valueObject';

describe('ReportCacheService', () => {
  let service: ReportCacheService;
  let mockCacheManager: jest.Mocked<Cache>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    mockConfigService = {
      get: jest.fn<any>().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'REPORT_CACHE_ENABLED') return true;
        if (key === 'REPORT_CACHE_TTL_VIEW') return 300;
        if (key === 'REPORT_CACHE_TTL_EXPORT') return 600;
        return defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ReportCacheService>(ReportCacheService);
  });

  describe('isCacheable', () => {
    it('Given: cache enabled and cacheable report type with dateRange When: checking cacheability Then: should return true', () => {
      // Arrange
      const reportType = 'MOVEMENT_HISTORY';
      const parameters = {
        orgId: 'org-123',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      } as IReportParametersInput;

      // Act
      const result = service.isCacheable(reportType, parameters);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: cache enabled and export flag When: checking cacheability Then: should return true', () => {
      // Arrange
      const reportType = 'AVAILABLE_INVENTORY';
      const parameters = {
        orgId: 'org-123',
      } as IReportParametersInput;

      // Act
      const result = service.isCacheable(reportType, parameters, true);

      // Assert
      expect(result).toBe(true);
    });

    it('Given: cache enabled but non-cacheable report type When: checking cacheability Then: should return false', () => {
      // Arrange
      const reportType = 'AVAILABLE_INVENTORY';
      const parameters = {
        orgId: 'org-123',
      } as IReportParametersInput;

      // Act
      const result = service.isCacheable(reportType, parameters);

      // Assert
      expect(result).toBe(false);
    });

    it('Given: cache enabled and cacheable report type without dateRange When: checking cacheability Then: should return false', () => {
      // Arrange
      const reportType = 'MOVEMENT_HISTORY';
      const parameters = {
        orgId: 'org-123',
      } as IReportParametersInput;

      // Act
      const result = service.isCacheable(reportType, parameters);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('generateKey', () => {
    it('Given: report type and parameters When: generating key for view Then: should create proper key format', () => {
      // Arrange
      const reportType = 'AVAILABLE_INVENTORY';
      const parameters = {
        orgId: 'org-123',
        warehouseId: 'warehouse-123',
      } as IReportParametersInput;

      // Act
      const key = service.generateKey(reportType, parameters);

      // Assert
      expect(key).toMatch(/^report:view:AVAILABLE_INVENTORY:[a-f0-9]{16}$/);
    });

    it('Given: report type, parameters and format When: generating key for export Then: should include format and export prefix', () => {
      // Arrange
      const reportType = 'AVAILABLE_INVENTORY';
      const parameters = {
        orgId: 'org-123',
      } as IReportParametersInput;
      const format = 'csv';

      // Act
      const key = service.generateKey(reportType, parameters, format, true);

      // Assert
      expect(key).toMatch(/^report:export:AVAILABLE_INVENTORY:csv:[a-f0-9]{16}$/);
    });

    it('Given: same parameters When: generating key multiple times Then: should produce same key', () => {
      // Arrange
      const reportType = 'AVAILABLE_INVENTORY';
      const parameters = {
        orgId: 'org-123',
        warehouseId: 'warehouse-123',
      } as IReportParametersInput;

      // Act
      const key1 = service.generateKey(reportType, parameters);
      const key2 = service.generateKey(reportType, parameters);

      // Assert
      expect(key1).toBe(key2);
    });

    it('Given: different parameters When: generating keys Then: should produce different keys', () => {
      // Arrange
      const reportType = 'AVAILABLE_INVENTORY';
      const parameters1 = {
        orgId: 'org-123',
        warehouseId: 'warehouse-123',
      } as IReportParametersInput;
      const parameters2 = {
        orgId: 'org-123',
        warehouseId: 'warehouse-456',
      } as IReportParametersInput;

      // Act
      const key1 = service.generateKey(reportType, parameters1);
      const key2 = service.generateKey(reportType, parameters2);

      // Assert
      expect(key1).not.toBe(key2);
    });

    it('Given: parameters with dateRange When: generating key Then: should include dateRange in hash', () => {
      // Arrange
      const reportType = 'MOVEMENT_HISTORY';
      const parameters = {
        orgId: 'org-123',
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
      } as IReportParametersInput;

      // Act
      const key = service.generateKey(reportType, parameters);

      // Assert
      expect(key).toMatch(/^report:view:MOVEMENT_HISTORY:[a-f0-9]{16}$/);
    });
  });

  describe('get', () => {
    it('Given: key exists in cache When: getting value Then: should return cached value', async () => {
      // Arrange
      const key = 'report:view:TEST:abc123';
      const cachedValue = { data: [{ id: 1 }], total: 1 };
      mockCacheManager.get.mockResolvedValue(cachedValue);

      // Act
      const result = await service.get<typeof cachedValue>(key);

      // Assert
      expect(result).toEqual(cachedValue);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('Given: key does not exist in cache When: getting value Then: should return null', async () => {
      // Arrange
      const key = 'report:view:TEST:nonexistent';
      mockCacheManager.get.mockResolvedValue(undefined);

      // Act
      const result = await service.get<unknown>(key);

      // Assert
      expect(result).toBeNull();
    });

    it('Given: cache throws error When: getting value Then: should return null', async () => {
      // Arrange
      const key = 'report:view:TEST:error';
      mockCacheManager.get.mockRejectedValue(new Error('Connection failed'));

      // Act
      const result = await service.get<unknown>(key);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('Given: key and value When: setting cache Then: should call cache manager', async () => {
      // Arrange
      const key = 'report:view:TEST:abc123';
      const value = { data: [{ id: 1 }] };
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      await service.set(key, value);

      // Assert
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('Given: key, value and TTL When: setting cache Then: should convert TTL to milliseconds', async () => {
      // Arrange
      const key = 'report:view:TEST:abc123';
      const value = { data: [] };
      const ttlSeconds = 300;
      mockCacheManager.set.mockResolvedValue(undefined);

      // Act
      await service.set(key, value, ttlSeconds);

      // Assert
      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, 300000);
    });

    it('Given: cache throws error When: setting value Then: should not throw', async () => {
      // Arrange
      const key = 'report:view:TEST:error';
      const value = { data: [] };
      mockCacheManager.set.mockRejectedValue(new Error('Write failed'));

      // Act & Assert
      await expect(service.set(key, value)).resolves.not.toThrow();
    });
  });

  describe('invalidate', () => {
    it('Given: pattern When: invalidating cache Then: should not throw', async () => {
      // Arrange
      const pattern = 'report:view:TEST:*';

      // Act & Assert
      await expect(service.invalidate(pattern)).resolves.not.toThrow();
    });
  });

  describe('getTtlForView', () => {
    it('Given: report type When: getting view TTL Then: should return TTL value', () => {
      // Arrange
      const reportType = 'AVAILABLE_INVENTORY';

      // Act
      const ttl = service.getTtlForView(reportType);

      // Assert
      expect(typeof ttl).toBe('number');
      expect(ttl).toBeGreaterThan(0);
    });
  });

  describe('getTtlForExport', () => {
    it('Given: report type When: getting export TTL Then: should return TTL value', () => {
      // Arrange
      const reportType = 'AVAILABLE_INVENTORY';

      // Act
      const ttl = service.getTtlForExport(reportType);

      // Assert
      expect(typeof ttl).toBe('number');
      expect(ttl).toBeGreaterThan(0);
    });
  });
});

describe('ReportCacheService with cache disabled', () => {
  let service: ReportCacheService;
  let mockCacheManager: jest.Mocked<Cache>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    mockConfigService = {
      get: jest.fn<any>().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'REPORT_CACHE_ENABLED') return false;
        return defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ReportCacheService>(ReportCacheService);
  });

  describe('isCacheable with cache disabled', () => {
    it('Given: cache disabled When: checking cacheability Then: should return false', () => {
      // Arrange
      const reportType = 'AVAILABLE_INVENTORY';
      const parameters = { orgId: 'org-123' } as IReportParametersInput;

      // Act
      const result = service.isCacheable(reportType, parameters);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('get with cache disabled', () => {
    it('Given: cache disabled When: getting value Then: should return null without calling cache', async () => {
      // Arrange
      const key = 'report:view:TEST:abc123';

      // Act
      const result = await service.get<unknown>(key);

      // Assert
      expect(result).toBeNull();
      expect(mockCacheManager.get).not.toHaveBeenCalled();
    });
  });

  describe('set with cache disabled', () => {
    it('Given: cache disabled When: setting value Then: should not call cache', async () => {
      // Arrange
      const key = 'report:view:TEST:abc123';
      const value = { data: [] };

      // Act
      await service.set(key, value);

      // Assert
      expect(mockCacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('invalidate with cache disabled', () => {
    it('Given: cache disabled When: invalidating Then: should return early', async () => {
      // Arrange
      const pattern = 'report:*';

      // Act & Assert
      await expect(service.invalidate(pattern)).resolves.not.toThrow();
    });
  });
});

describe('ReportCacheService - additional branch coverage', () => {
  let service: ReportCacheService;
  let mockCacheManager: jest.Mocked<Cache>;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    mockConfigService = {
      get: jest.fn<any>().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'REPORT_CACHE_ENABLED') return true;
        if (key === 'REPORT_CACHE_TTL_VIEW') return 300;
        if (key === 'REPORT_CACHE_TTL_EXPORT') return 600;
        return defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ReportCacheService>(ReportCacheService);
  });

  describe('generateKey - hash coverage for all parameter branches', () => {
    it('Given: parameters with all optional fields When: generating key Then: should include all in hash', () => {
      const parameters: IReportParametersInput = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
        },
        warehouseId: 'wh-1',
        productId: 'prod-1',
        category: 'electronics',
        status: 'ACTIVE',
        returnType: 'REFUND' as any,
        groupBy: 'product' as any,
        period: 'daily' as any,
        movementType: 'IN',
        customerReference: 'CUST-001',
        saleId: 'sale-1',
        movementId: 'mov-1',
        includeInactive: true,
        locationId: 'loc-1',
        severity: 'critical' as any,
      };

      const key = service.generateKey('TEST_REPORT', parameters);
      expect(key).toMatch(/^report:view:TEST_REPORT:[a-f0-9]{16}$/);
    });

    it('Given: parameters with includeInactive=false When: generating key Then: should include it in hash', () => {
      const parameters: IReportParametersInput = {
        includeInactive: false,
      };

      const key = service.generateKey('TEST_REPORT', parameters);
      expect(key).toMatch(/^report:view:TEST_REPORT:[a-f0-9]{16}$/);
    });

    it('Given: parameters with no optional fields When: generating key Then: should produce a hash for empty object', () => {
      const parameters: IReportParametersInput = {};

      const key = service.generateKey('TEST_REPORT', parameters);
      expect(key).toMatch(/^report:view:TEST_REPORT:[a-f0-9]{16}$/);
    });

    it('Given: isExport=true with format When: generating key Then: should use export prefix with format', () => {
      const parameters: IReportParametersInput = {
        warehouseId: 'wh-1',
      };

      const key = service.generateKey('TEST_REPORT', parameters, 'xlsx', true);
      expect(key).toMatch(/^report:export:TEST_REPORT:xlsx:[a-f0-9]{16}$/);
    });

    it('Given: isExport=false without format When: generating key Then: should use view prefix without format', () => {
      const parameters: IReportParametersInput = {};

      const key = service.generateKey('TEST_REPORT', parameters, undefined, false);
      expect(key).toMatch(/^report:view:TEST_REPORT:[a-f0-9]{16}$/);
    });
  });

  describe('get - cache hit branch', () => {
    it('Given: key exists with falsy value (0) in cache When: getting value Then: should return null (falsy check)', async () => {
      const key = 'report:view:TEST:zero';
      mockCacheManager.get.mockResolvedValue(0);

      // The service uses `if (cached)` so 0 is falsy -> returns null
      const result = await service.get<number>(key);

      expect(result).toBeNull();
    });

    it('Given: key exists with truthy object When: getting value Then: should return the cached object (cache hit)', async () => {
      const key = 'report:view:TEST:hit';
      const cachedData = { rows: [{ id: 1 }], total: 1 };
      mockCacheManager.get.mockResolvedValue(cachedData);

      const result = await service.get<typeof cachedData>(key);

      expect(result).toEqual(cachedData);
    });
  });

  describe('set - TTL branches', () => {
    it('Given: TTL=0 (falsy) When: setting cache Then: should pass undefined as TTL', async () => {
      const key = 'report:view:TEST:zeroTtl';
      mockCacheManager.set.mockResolvedValue(undefined);

      await service.set(key, { data: [] }, 0);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, { data: [] }, undefined);
    });
  });

  describe('getTtlForView - different report types', () => {
    it('Given: MOVEMENT_HISTORY report type When: getting TTL Then: should return override value', () => {
      const ttl = service.getTtlForView('MOVEMENT_HISTORY');
      expect(ttl).toBe(7200);
    });

    it('Given: FINANCIAL report type When: getting TTL Then: should return override value', () => {
      const ttl = service.getTtlForView('FINANCIAL');
      expect(ttl).toBe(1800);
    });

    it('Given: unknown report type When: getting TTL Then: should return configured default', () => {
      const ttl = service.getTtlForView('UNKNOWN_TYPE');
      expect(typeof ttl).toBe('number');
    });
  });

  describe('getTtlForExport - different report types', () => {
    it('Given: MOVEMENT_HISTORY report type When: getting export TTL Then: should return override value', () => {
      const ttl = service.getTtlForExport('MOVEMENT_HISTORY');
      expect(ttl).toBe(86400);
    });

    it('Given: FINANCIAL report type When: getting export TTL Then: should return override value', () => {
      const ttl = service.getTtlForExport('FINANCIAL');
      expect(ttl).toBe(43200);
    });

    it('Given: unknown report type When: getting export TTL Then: should return configured default', () => {
      const ttl = service.getTtlForExport('UNKNOWN_TYPE');
      expect(typeof ttl).toBe('number');
    });
  });
});

describe('ReportCacheService - zero TTL config', () => {
  let service: ReportCacheService;
  let mockCacheManager: jest.Mocked<Cache>;

  beforeEach(async () => {
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<Cache>;

    // Return 0 for TTL values so the `|| DEFAULT_CACHE_TTL.VIEW` fallback kicks in
    const mockConfigService = {
      get: jest.fn<any>().mockImplementation((key: string, defaultValue?: unknown) => {
        if (key === 'REPORT_CACHE_ENABLED') return true;
        if (key === 'REPORT_CACHE_TTL_VIEW') return 0;
        if (key === 'REPORT_CACHE_TTL_EXPORT') return 0;
        return defaultValue;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportCacheService,
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ReportCacheService>(ReportCacheService);
  });

  it('Given: TTL config returns 0 When: constructed Then: should fallback to DEFAULT_CACHE_TTL values', () => {
    // The constructor has `|| DEFAULT_CACHE_TTL.VIEW` and `|| DEFAULT_CACHE_TTL.EXPORT`
    // So when config returns 0 (falsy), it should use defaults: VIEW=3600, EXPORT=86400
    const viewTtl = service.getTtlForView('UNKNOWN_TYPE');
    const exportTtl = service.getTtlForExport('UNKNOWN_TYPE');

    expect(viewTtl).toBe(3600);
    expect(exportTtl).toBe(86400);
  });
});
