import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { BusinessRuleError, DomainError, Result, ok, err } from '@shared/domain/result';

export interface IGetDashboardMetricsRequest {
  orgId: string;
  companyId?: string;
}

export interface IDashboardMetricsData {
  inventory: {
    totalProducts: number;
    totalStockQuantity: number;
    totalInventoryValue: number;
    currency: string;
  };
  lowStock: { count: number };
  sales: {
    monthlyCount: number;
    monthlyRevenue: number;
    currency: string;
  };
  salesTrend: Array<{ date: string; count: number; revenue: number }>;
  topProducts: Array<{ name: string; sku: string; revenue: number; quantitySold: number }>;
  stockByWarehouse: Array<{ warehouseName: string; quantity: number; value: number }>;
  recentActivity: Array<{
    type: string;
    reference: string;
    status: string;
    description: string;
    createdAt: string;
  }>;
}

export interface IGetDashboardMetricsResponse {
  success: true;
  message: string;
  data: IDashboardMetricsData;
  timestamp: string;
}

const VALID_SALE_STATUSES = ['CONFIRMED', 'COMPLETED', 'SHIPPED', 'PICKING'];

@Injectable()
export class GetDashboardMetricsUseCase {
  private readonly logger = new Logger(GetDashboardMetricsUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    request: IGetDashboardMetricsRequest
  ): Promise<Result<IGetDashboardMetricsResponse, DomainError>> {
    const { orgId, companyId } = request;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      const [
        currency,
        inventory,
        lowStockCount,
        sales,
        salesTrend,
        topProducts,
        stockByWarehouse,
        recentActivity,
      ] = await Promise.all([
        this.detectCurrency(orgId, companyId),
        this.getInventorySummary(orgId, companyId),
        this.getLowStockCount(orgId, companyId),
        this.getMonthlySales(orgId, monthStart, companyId),
        this.getSalesTrend(orgId, sevenDaysAgo, companyId),
        this.getTopProducts(orgId, monthStart, companyId),
        this.getStockByWarehouse(orgId, companyId),
        this.getRecentActivity(orgId, companyId),
      ]);

      return ok({
        success: true as const,
        message: 'Dashboard metrics retrieved successfully',
        data: {
          inventory: { ...inventory, currency },
          lowStock: { count: lowStockCount },
          sales: { ...sales, currency },
          salesTrend,
          topProducts,
          stockByWarehouse,
          recentActivity,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to retrieve dashboard metrics: ${message}`, stack);
      return err(new BusinessRuleError('Failed to retrieve dashboard metrics'));
    }
  }

  private async detectCurrency(orgId: string, companyId?: string): Promise<string> {
    const product = await this.prisma.product.findFirst({
      where: { orgId, currency: { not: null }, ...(companyId && { companyId }) },
      select: { currency: true },
    });
    return product?.currency || 'COP';
  }

  private async getInventorySummary(orgId: string, companyId?: string) {
    const [productCount, stockSummary] = await Promise.all([
      this.prisma.product.count({
        where: { orgId, isActive: true, ...(companyId && { companyId }) },
      }),
      companyId
        ? this.prisma.$queryRaw<Array<{ totalQuantity: bigint; totalValue: string }>>`
            SELECT
              COALESCE(SUM(s."quantity"), 0) AS "totalQuantity",
              COALESCE(SUM(CAST(s."quantity" AS DECIMAL) * s."unitCost"), 0) AS "totalValue"
            FROM "stock" s
            JOIN "products" p ON p.id = s."productId" AND p."orgId" = s."orgId"
            WHERE s."orgId" = ${orgId} AND p."companyId" = ${companyId}
          `
        : this.prisma.$queryRaw<Array<{ totalQuantity: bigint; totalValue: string }>>`
            SELECT
              COALESCE(SUM("quantity"), 0) AS "totalQuantity",
              COALESCE(SUM(CAST("quantity" AS DECIMAL) * "unitCost"), 0) AS "totalValue"
            FROM "stock"
            WHERE "orgId" = ${orgId}
          `,
    ]);

    const row = stockSummary[0];
    return {
      totalProducts: productCount,
      totalStockQuantity: Number(row?.totalQuantity ?? 0),
      totalInventoryValue: parseFloat(String(row?.totalValue ?? 0)),
    };
  }

  private async getLowStockCount(orgId: string, companyId?: string): Promise<number> {
    const result = companyId
      ? await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) AS count FROM (
            SELECT s."productId"
            FROM "stock" s
            JOIN "products" p ON p.id = s."productId" AND p."orgId" = s."orgId"
            JOIN "reorder_rules" rr ON rr."productId" = s."productId" AND rr."orgId" = s."orgId"
            WHERE s."orgId" = ${orgId} AND p."isActive" = true AND p."companyId" = ${companyId}
            GROUP BY s."productId", rr."minQty"
            HAVING SUM(s."quantity") < rr."minQty"
          ) sub
        `
      : await this.prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) AS count FROM (
            SELECT s."productId"
            FROM "stock" s
            JOIN "products" p ON p.id = s."productId" AND p."orgId" = s."orgId"
            JOIN "reorder_rules" rr ON rr."productId" = s."productId" AND rr."orgId" = s."orgId"
            WHERE s."orgId" = ${orgId} AND p."isActive" = true
            GROUP BY s."productId", rr."minQty"
            HAVING SUM(s."quantity") < rr."minQty"
          ) sub
        `;
    return Number(result[0]?.count ?? 0);
  }

  private async getMonthlySales(orgId: string, monthStart: Date, companyId?: string) {
    const saleWhere = companyId
      ? {
          orgId,
          status: { in: VALID_SALE_STATUSES },
          createdAt: { gte: monthStart },
          lines: { some: { product: { companyId } } },
        }
      : {
          orgId,
          status: { in: VALID_SALE_STATUSES },
          createdAt: { gte: monthStart },
        };

    const [count, revenueResult] = await Promise.all([
      this.prisma.sale.count({ where: saleWhere }),
      companyId
        ? this.prisma.$queryRaw<Array<{ revenue: string }>>`
            SELECT COALESCE(SUM(CAST(sl."quantity" AS DECIMAL) * sl."salePrice"), 0) AS revenue
            FROM "sale_lines" sl
            JOIN "sales" s ON s.id = sl."saleId"
            JOIN "products" p ON p.id = sl."productId"
            WHERE sl."orgId" = ${orgId}
              AND s.status IN ('CONFIRMED', 'COMPLETED', 'SHIPPED', 'PICKING')
              AND s."createdAt" >= ${monthStart}
              AND p."companyId" = ${companyId}
          `
        : this.prisma.$queryRaw<Array<{ revenue: string }>>`
            SELECT COALESCE(SUM(CAST(sl."quantity" AS DECIMAL) * sl."salePrice"), 0) AS revenue
            FROM "sale_lines" sl
            JOIN "sales" s ON s.id = sl."saleId"
            WHERE sl."orgId" = ${orgId}
              AND s.status IN ('CONFIRMED', 'COMPLETED', 'SHIPPED', 'PICKING')
              AND s."createdAt" >= ${monthStart}
          `,
    ]);

    return {
      monthlyCount: count,
      monthlyRevenue: parseFloat(String(revenueResult[0]?.revenue ?? 0)),
    };
  }

  private async getSalesTrend(orgId: string, sevenDaysAgo: Date, companyId?: string) {
    const result = companyId
      ? await this.prisma.$queryRaw<Array<{ date: Date; count: bigint; revenue: string }>>`
          SELECT
            DATE(s."createdAt") AS date,
            COUNT(DISTINCT s.id) AS count,
            COALESCE(SUM(CAST(sl."quantity" AS DECIMAL) * sl."salePrice"), 0) AS revenue
          FROM "sales" s
          LEFT JOIN "sale_lines" sl ON sl."saleId" = s.id
          LEFT JOIN "products" p ON p.id = sl."productId"
          WHERE s."orgId" = ${orgId}
            AND s.status IN ('CONFIRMED', 'COMPLETED', 'SHIPPED', 'PICKING')
            AND s."createdAt" >= ${sevenDaysAgo}
            AND p."companyId" = ${companyId}
          GROUP BY DATE(s."createdAt")
          ORDER BY date
        `
      : await this.prisma.$queryRaw<Array<{ date: Date; count: bigint; revenue: string }>>`
          SELECT
            DATE(s."createdAt") AS date,
            COUNT(DISTINCT s.id) AS count,
            COALESCE(SUM(CAST(sl."quantity" AS DECIMAL) * sl."salePrice"), 0) AS revenue
          FROM "sales" s
          LEFT JOIN "sale_lines" sl ON sl."saleId" = s.id
          WHERE s."orgId" = ${orgId}
            AND s.status IN ('CONFIRMED', 'COMPLETED', 'SHIPPED', 'PICKING')
            AND s."createdAt" >= ${sevenDaysAgo}
          GROUP BY DATE(s."createdAt")
          ORDER BY date
        `;

    return result.map(row => ({
      date: new Date(row.date).toISOString().split('T')[0],
      count: Number(row.count),
      revenue: parseFloat(String(row.revenue)),
    }));
  }

  private async getTopProducts(orgId: string, monthStart: Date, companyId?: string) {
    const result = companyId
      ? await this.prisma.$queryRaw<
          Array<{ name: string; sku: string; revenue: string; quantitySold: string }>
        >`
          SELECT
            p.name,
            p.sku,
            SUM(CAST(sl."quantity" AS DECIMAL) * sl."salePrice") AS revenue,
            SUM(CAST(sl."quantity" AS DECIMAL)) AS "quantitySold"
          FROM "sale_lines" sl
          JOIN "products" p ON p.id = sl."productId"
          JOIN "sales" s ON s.id = sl."saleId"
          WHERE sl."orgId" = ${orgId}
            AND s.status IN ('CONFIRMED', 'COMPLETED', 'SHIPPED', 'PICKING')
            AND s."createdAt" >= ${monthStart}
            AND p."companyId" = ${companyId}
          GROUP BY p.id, p.name, p.sku
          ORDER BY revenue DESC
          LIMIT 5
        `
      : await this.prisma.$queryRaw<
          Array<{ name: string; sku: string; revenue: string; quantitySold: string }>
        >`
          SELECT
            p.name,
            p.sku,
            SUM(CAST(sl."quantity" AS DECIMAL) * sl."salePrice") AS revenue,
            SUM(CAST(sl."quantity" AS DECIMAL)) AS "quantitySold"
          FROM "sale_lines" sl
          JOIN "products" p ON p.id = sl."productId"
          JOIN "sales" s ON s.id = sl."saleId"
          WHERE sl."orgId" = ${orgId}
            AND s.status IN ('CONFIRMED', 'COMPLETED', 'SHIPPED', 'PICKING')
            AND s."createdAt" >= ${monthStart}
          GROUP BY p.id, p.name, p.sku
          ORDER BY revenue DESC
          LIMIT 5
        `;

    return result.map(row => ({
      name: row.name,
      sku: row.sku,
      revenue: parseFloat(String(row.revenue)),
      quantitySold: parseFloat(String(row.quantitySold)),
    }));
  }

  private async getStockByWarehouse(orgId: string, companyId?: string) {
    const result = companyId
      ? await this.prisma.$queryRaw<
          Array<{ warehouseName: string; quantity: bigint; value: string }>
        >`
          SELECT
            w.name AS "warehouseName",
            COALESCE(SUM(s."quantity"), 0) AS quantity,
            COALESCE(SUM(CAST(s."quantity" AS DECIMAL) * s."unitCost"), 0) AS value
          FROM "warehouses" w
          LEFT JOIN "stock" s ON s."warehouseId" = w.id AND s."orgId" = w."orgId"
          LEFT JOIN "products" p ON p.id = s."productId" AND p."orgId" = s."orgId"
          WHERE w."orgId" = ${orgId} AND w."isActive" = true AND (p."companyId" = ${companyId} OR s.id IS NULL)
          GROUP BY w.id, w.name
          ORDER BY value DESC
        `
      : await this.prisma.$queryRaw<
          Array<{ warehouseName: string; quantity: bigint; value: string }>
        >`
          SELECT
            w.name AS "warehouseName",
            COALESCE(SUM(s."quantity"), 0) AS quantity,
            COALESCE(SUM(CAST(s."quantity" AS DECIMAL) * s."unitCost"), 0) AS value
          FROM "warehouses" w
          LEFT JOIN "stock" s ON s."warehouseId" = w.id AND s."orgId" = w."orgId"
          WHERE w."orgId" = ${orgId} AND w."isActive" = true
          GROUP BY w.id, w.name
          ORDER BY value DESC
        `;

    return result.map(row => ({
      warehouseName: row.warehouseName,
      quantity: Number(row.quantity),
      value: parseFloat(String(row.value)),
    }));
  }

  private async getRecentActivity(orgId: string, companyId?: string) {
    const companyLineFilter = companyId ? { lines: { some: { product: { companyId } } } } : {};

    const [sales, movements, returns, transfers] = await Promise.all([
      this.prisma.sale.findMany({
        where: { orgId, ...companyLineFilter },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { saleNumber: true, status: true, createdAt: true },
      }),
      this.prisma.movement.findMany({
        where: { orgId, ...companyLineFilter },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, type: true, status: true, reference: true, createdAt: true },
      }),
      this.prisma.return.findMany({
        where: { orgId, ...companyLineFilter },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { returnNumber: true, status: true, type: true, createdAt: true },
      }),
      this.prisma.transfer.findMany({
        where: { orgId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, status: true, createdAt: true },
      }),
    ]);

    const activities = [
      ...sales.map(s => ({
        type: 'SALE',
        reference: s.saleNumber,
        status: s.status,
        description: `Sale ${s.saleNumber}`,
        createdAt: s.createdAt.toISOString(),
      })),
      ...movements.map(m => ({
        type: 'MOVEMENT',
        reference: m.reference || m.id.slice(0, 8),
        status: m.status,
        description: `${m.type} movement`,
        createdAt: m.createdAt.toISOString(),
      })),
      ...returns.map(r => ({
        type: 'RETURN',
        reference: r.returnNumber,
        status: r.status,
        description: `${r.type === 'RETURN_CUSTOMER' ? 'Customer' : 'Supplier'} return ${r.returnNumber}`,
        createdAt: r.createdAt.toISOString(),
      })),
      ...transfers.map(t => ({
        type: 'TRANSFER',
        reference: t.id.slice(0, 8),
        status: t.status,
        description: `Transfer ${t.id.slice(0, 8)}`,
        createdAt: t.createdAt.toISOString(),
      })),
    ];

    return activities
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }
}
