/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// TODO: This test needs to be updated to match the current API
// Reports Integration Tests
// Integration tests for reports flows following AAA and Given-When-Then patterns

import { CreateProductUseCase } from '@application/productUseCases/createProductUseCase';
import { GetReportsUseCase } from '@application/reportUseCases/getReportsUseCase';
import { ViewReportUseCase } from '@application/reportUseCases/viewReportUseCase';
import { CreateWarehouseUseCase } from '@application/warehouseUseCases/createWarehouseUseCase';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { InventoryModule } from '@inventory/inventory.module';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { REPORT_TYPES } from '@report/domain/valueObjects';
import { ReportModule } from '@report/report.module';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!!process.env.DATABASE_URL)('Reports Integration Tests', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let getReportsUseCase: GetReportsUseCase;
  let viewReportUseCase: ViewReportUseCase;
  let createProductUseCase: CreateProductUseCase;
  let createWarehouseUseCase: CreateWarehouseUseCase;

  const testOrgId = 'test-org-reports-integration';
  let testWarehouseId: string;
  let testProductId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [InventoryModule, ReportModule],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    getReportsUseCase = module.get<GetReportsUseCase>(GetReportsUseCase);
    viewReportUseCase = module.get<ViewReportUseCase>(ViewReportUseCase);
    createProductUseCase = module.get<CreateProductUseCase>(CreateProductUseCase);
    createWarehouseUseCase = module.get<CreateWarehouseUseCase>(CreateWarehouseUseCase);

    await cleanupTestData();
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    if (module) {
      await module.close();
    }
  });

  beforeEach(async () => {
    await cleanupTestData();
    await setupTestData();
  });

  describe('Report Generation Flow', () => {
    it('Given: products and warehouses When: generating available inventory report Then: should generate report successfully', async () => {
      // Arrange
      const parameters = {
        warehouseIds: [testWarehouseId],
      };

      // Act
      const result = await viewReportUseCase.execute({
        type: REPORT_TYPES.AVAILABLE_INVENTORY,
        parameters,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.metadata.reportType).toBe(REPORT_TYPES.AVAILABLE_INVENTORY);
          expect(value.data.columns).toBeDefined();
          expect(value.data.rows).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: products When: generating low stock report Then: should generate report successfully', async () => {
      // Arrange
      const parameters = {
        warehouseIds: [testWarehouseId],
        minStockLevel: 10,
      };

      // Act
      const result = await viewReportUseCase.execute({
        type: REPORT_TYPES.LOW_STOCK,
        parameters,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.metadata.reportType).toBe(REPORT_TYPES.LOW_STOCK);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: invalid report type When: generating report Then: should return ValidationError', async () => {
      // Arrange
      const parameters = {};

      // Act
      const result = await viewReportUseCase.execute({
        type: 'INVALID_TYPE' as unknown as string,
        parameters,
        orgId: testOrgId,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error.message).toBeDefined();
        }
      );
    });
  });

  describe('Report Query Flow', () => {
    it('Given: no filters When: getting reports Then: should return all reports', async () => {
      // Act
      const result = await getReportsUseCase.execute({
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(Array.isArray(value.data)).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: type filter When: getting reports Then: should return filtered reports', async () => {
      // Act
      const result = await getReportsUseCase.execute({
        orgId: testOrgId,
        type: REPORT_TYPES.AVAILABLE_INVENTORY,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          // All returned reports should match the type filter
          value.data.forEach(report => {
            expect(report.type).toBe(REPORT_TYPES.AVAILABLE_INVENTORY);
          });
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: date range filter When: getting reports Then: should return reports in date range', async () => {
      // Arrange
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-12-31');

      // Act
      const result = await getReportsUseCase.execute({
        orgId: testOrgId,
        startDate,
        endDate,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          // Verify all reports are within date range
          value.data.forEach(report => {
            const reportDate = new Date(report.createdAt);
            expect(reportDate >= startDate).toBe(true);
            expect(reportDate <= endDate).toBe(true);
          });
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });

  describe('Multi-tenant Isolation', () => {
    const otherOrgId = 'test-org-reports-other';

    it('Given: reports in different organizations When: querying reports Then: should only return reports from correct organization', async () => {
      // Arrange - Create other organization
      await prisma.organization.create({
        data: {
          id: otherOrgId,
          name: 'Other Organization',
          slug: 'other-org-reports',
          isActive: true,
        },
      });

      // Act - Query reports for testOrgId
      const result = await getReportsUseCase.execute({
        orgId: testOrgId,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.data.every(r => r.orgId === testOrgId)).toBe(true);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );

      // Cleanup
      await prisma.organization.deleteMany({ where: { id: otherOrgId } });
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create organization
    await prisma.organization.create({
      data: {
        id: testOrgId,
        name: 'Test Organization',
        slug: 'test-org-reports',
        isActive: true,
      },
    });

    // Create user (not used in current tests but may be needed for future tests)
    await prisma.user.create({
      data: {
        email: 'test-user-reports@test.com',
        username: 'testuserreports',
        passwordHash: 'hashed',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        orgId: testOrgId,
      },
    });

    // Create warehouse
    const warehouseResult = await createWarehouseUseCase.execute({
      code: 'WH-REPORTS-001',
      name: 'Reports Test Warehouse',
      isActive: true,
      orgId: testOrgId,
    });

    warehouseResult.match(
      value => {
        testWarehouseId = value.data.id;
      },
      () => {
        throw new Error('Warehouse creation failed');
      }
    );

    // Create product
    const productResult = await createProductUseCase.execute({
      sku: 'PROD-REPORTS-001',
      name: 'Reports Test Product',
      unit: {
        code: 'UNIT',
        name: 'Unit',
        precision: 0,
      },
      orgId: testOrgId,
    });

    productResult.match(
      value => {
        testProductId = value.data.id;
      },
      () => {
        throw new Error('Product creation failed');
      }
    );

    // Create stock
    await prisma.stock.create({
      data: {
        productId: testProductId,
        warehouseId: testWarehouseId,
        locationId: 'default-location',
        quantity: 50,
        averageCost: 50,
        currency: 'COP',
        orgId: testOrgId,
      },
    });
  }

  async function cleanupTestData() {
    if (!prisma) {
      return;
    }

    try {
      await prisma.report.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.stock.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.product.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.warehouse.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.user.deleteMany({
        where: { orgId: testOrgId },
      });
      await prisma.organization.deleteMany({
        where: { id: testOrgId },
      });
    } catch (_error) {
      // Ignore cleanup errors
    }
  }
});
