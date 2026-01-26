import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IPaginatedResult,
  IPaginationOptions,
} from '@infrastructure/database/utils/queryOptimizer';
import { Injectable, Logger } from '@nestjs/common';
import { Sale } from '@sale/domain/entities/sale.entity';
import { SaleLine } from '@sale/domain/entities/saleLine.entity';
import { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import { SaleNumber } from '@sale/domain/valueObjects/saleNumber.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { SaleStatus } from '@sale/domain/valueObjects/saleStatus.valueObject';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { IPrismaSpecification } from '@shared/domain/specifications';

@Injectable()
export class PrismaSaleRepository implements ISaleRepository {
  private readonly logger = new Logger(PrismaSaleRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Sale | null> {
    try {
      const saleData = await this.prisma.sale.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!saleData || saleData.orgId !== orgId) return null;

      return this.mapToEntity(saleData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sale by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding sale by ID: ${error}`);
      }
      throw error;
    }
  }

  async findByIdWithoutLines(id: string, orgId: string): Promise<Sale | null> {
    try {
      const saleData = await this.prisma.sale.findUnique({
        where: { id },
      });

      if (!saleData || saleData.orgId !== orgId) return null;

      return this.mapToEntityWithoutLines(saleData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sale by ID without lines: ${error.message}`);
      } else {
        this.logger.error(`Error finding sale by ID without lines: ${error}`);
      }
      throw error;
    }
  }

  async loadLines(saleId: string, orgId: string): Promise<SaleLine[]> {
    try {
      const linesData = await this.prisma.saleLine.findMany({
        where: { saleId, orgId },
      });

      return linesData.map(lineData => {
        const quantityValue =
          typeof lineData.quantity === 'object' && 'toNumber' in lineData.quantity
            ? lineData.quantity.toNumber()
            : Number(lineData.quantity);
        const quantity = Quantity.create(quantityValue, 6);

        const salePriceValue =
          typeof lineData.salePrice === 'object' && 'toNumber' in lineData.salePrice
            ? lineData.salePrice.toNumber()
            : Number(lineData.salePrice);
        const salePrice = SalePrice.create(salePriceValue, lineData.currency);

        return SaleLine.reconstitute(
          {
            productId: lineData.productId,
            locationId: lineData.locationId || undefined,
            quantity,
            salePrice,
            extra: lineData.extra as Record<string, unknown> | undefined,
          },
          lineData.id,
          orgId
        );
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error loading sale lines: ${error.message}`);
      } else {
        this.logger.error(`Error loading sale lines: ${error}`);
      }
      throw error;
    }
  }

  async findAllWithoutLines(
    orgId: string,
    pagination?: IPaginationOptions
  ): Promise<IPaginatedResult<Sale>> {
    try {
      const skip = pagination?.skip ?? 0;
      const take = pagination?.take ?? 20;

      const [salesData, total] = await Promise.all([
        this.prisma.sale.findMany({
          where: { orgId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: take + 1,
        }),
        this.prisma.sale.count({ where: { orgId } }),
      ]);

      const hasMore = salesData.length > take;
      const data = salesData.slice(0, take).map(saleData => this.mapToEntityWithoutLines(saleData));
      const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined;

      return { data, total, hasMore, nextCursor };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all sales without lines: ${error.message}`);
      } else {
        this.logger.error(`Error finding all sales without lines: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Sale[]> {
    try {
      const salesData = await this.prisma.sale.findMany({
        where: { orgId },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      });

      return salesData.map(saleData => this.mapToEntity(saleData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all sales: ${error.message}`);
      } else {
        this.logger.error(`Error finding all sales: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.sale.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking sale existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking sale existence: ${error}`);
      }
      throw error;
    }
  }

  async save(sale: Sale): Promise<Sale> {
    try {
      this.logger.debug('Saving sale', {
        saleId: sale.id,
        saleNumber: sale.saleNumber.getValue(),
        orgId: sale.orgId,
        hasId: !!sale.id,
      });

      return await this.prisma.$transaction(async tx => {
        const saleData = {
          saleNumber: sale.saleNumber.getValue(),
          status: sale.status.getValue(),
          warehouseId: sale.warehouseId,
          customerReference: sale.customerReference || null,
          externalReference: sale.externalReference || null,
          note: sale.note || null,
          confirmedAt: sale.confirmedAt || null,
          cancelledAt: sale.cancelledAt || null,
          movementId: sale.movementId || null,
          createdBy: sale.createdBy,
          orgId: sale.orgId,
        };

        let savedSale;

        if (sale.id) {
          const existingSale = await tx.sale.findUnique({
            where: { id: sale.id },
          });

          if (existingSale) {
            // Update sale
            savedSale = await tx.sale.update({
              where: { id: sale.id },
              data: saleData,
            });

            // Delete existing lines
            await tx.saleLine.deleteMany({
              where: { saleId: sale.id },
            });
          } else {
            // Create new sale with provided ID
            savedSale = await tx.sale.create({
              data: { ...saleData, id: sale.id },
            });
          }
        } else {
          // Create new sale
          savedSale = await tx.sale.create({
            data: saleData,
          });
        }

        // Create lines
        const lines = sale.getLines();
        if (lines.length > 0) {
          const linesToCreate = lines.map(line => ({
            id: line.id || undefined,
            saleId: savedSale.id,
            productId: line.productId,
            locationId: line.locationId,
            quantity: line.quantity.getNumericValue(),
            salePrice: line.salePrice.getAmount(),
            currency: line.salePrice.getCurrency(),
            extra: line.extra || undefined,
            orgId: sale.orgId,
          }));

          await tx.saleLine.createMany({
            data: linesToCreate as NonNullable<
              Parameters<typeof tx.saleLine.createMany>[0]
            >['data'],
          });
        }

        // Fetch the complete sale with lines
        const completeSale = await tx.sale.findUnique({
          where: { id: savedSale.id },
          include: { lines: true },
        });

        if (!completeSale) {
          throw new Error('Failed to retrieve saved sale');
        }

        return this.mapToEntity(completeSale);
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error saving sale: ${error.message}`);
      } else {
        this.logger.error(`Error saving sale: ${error}`);
      }
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.sale.delete({
        where: { id, orgId },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting sale: ${error.message}`);
      } else {
        this.logger.error(`Error deleting sale: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Adds a line directly to the sale without loading all existing lines.
   * This prevents race conditions when multiple lines are added concurrently.
   * Uses a transaction to validate sale status and add the line atomically.
   */
  async addLine(saleId: string, line: SaleLine, orgId: string): Promise<SaleLine> {
    try {
      this.logger.debug('Adding line directly to sale', {
        saleId,
        lineId: line.id,
        productId: line.productId,
        orgId,
      });

      return await this.prisma.$transaction(async tx => {
        // 1. Verify sale exists and is in DRAFT status
        const sale = await tx.sale.findUnique({
          where: { id: saleId },
          select: { id: true, status: true, orgId: true },
        });

        if (!sale || sale.orgId !== orgId) {
          throw new NotFoundError(`Sale with ID ${saleId} not found`);
        }

        if (sale.status !== 'DRAFT') {
          throw new BusinessRuleError(
            `Cannot add lines to sale in ${sale.status} status. Sale must be in DRAFT status.`
          );
        }

        // 2. Create the line directly (no need to read existing lines)
        const createdLine = await tx.saleLine.create({
          data: {
            id: line.id,
            saleId,
            productId: line.productId,
            locationId: line.locationId || null,
            quantity: line.quantity.getNumericValue(),
            salePrice: line.salePrice.getAmount(),
            currency: line.salePrice.getCurrency(),
            extra: line.extra ? JSON.parse(JSON.stringify(line.extra)) : undefined,
            orgId,
          },
        });

        // 3. Return the line as a domain entity
        return this.createSaleLine(createdLine);
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessRuleError) {
        throw error;
      }
      if (error instanceof Error) {
        this.logger.error(`Error adding line to sale: ${error.message}`);
      } else {
        this.logger.error(`Error adding line to sale: ${error}`);
      }
      throw error;
    }
  }

  async findBySaleNumber(saleNumber: string, orgId: string): Promise<Sale | null> {
    try {
      const saleData = await this.prisma.sale.findFirst({
        where: { saleNumber, orgId },
        include: { lines: true },
      });

      if (!saleData) return null;

      return this.mapToEntity(saleData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sale by number: ${error.message}`);
      } else {
        this.logger.error(`Error finding sale by number: ${error}`);
      }
      throw error;
    }
  }

  async findByStatus(status: string, orgId: string): Promise<Sale[]> {
    try {
      const salesData = await this.prisma.sale.findMany({
        where: { status, orgId },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      });

      return salesData.map(saleData => this.mapToEntity(saleData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sales by status: ${error.message}`);
      } else {
        this.logger.error(`Error finding sales by status: ${error}`);
      }
      throw error;
    }
  }

  async findByWarehouse(warehouseId: string, orgId: string): Promise<Sale[]> {
    try {
      const salesData = await this.prisma.sale.findMany({
        where: { warehouseId, orgId },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      });

      return salesData.map(saleData => this.mapToEntity(saleData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sales by warehouse: ${error.message}`);
      } else {
        this.logger.error(`Error finding sales by warehouse: ${error}`);
      }
      throw error;
    }
  }

  async findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Sale[]> {
    try {
      const salesData = await this.prisma.sale.findMany({
        where: {
          orgId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { lines: true },
        orderBy: { createdAt: 'desc' },
      });

      return salesData.map(saleData => this.mapToEntity(saleData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sales by date range: ${error.message}`);
      } else {
        this.logger.error(`Error finding sales by date range: ${error}`);
      }
      throw error;
    }
  }

  async getLastSaleNumberForYear(year: number, orgId: string): Promise<string | null> {
    try {
      const sale = await this.prisma.sale.findFirst({
        where: {
          orgId,
          saleNumber: {
            startsWith: `SALE-${year}-`,
          },
        },
        orderBy: { saleNumber: 'desc' },
        select: { saleNumber: true },
      });

      return sale?.saleNumber || null;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error getting last sale number for year: ${error.message}`);
      } else {
        this.logger.error(`Error getting last sale number for year: ${error}`);
      }
      throw error;
    }
  }

  async getNextSaleNumber(orgId: string, year: number): Promise<string> {
    try {
      const result = await this.prisma.$queryRaw<[{ get_next_sale_number: string }]>`
        SELECT get_next_sale_number(${orgId}, ${year})
      `;

      return result[0].get_next_sale_number;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error getting next sale number: ${error.message}`);
      } else {
        this.logger.error(`Error getting next sale number: ${error}`);
      }
      throw error;
    }
  }

  async findByMovementId(movementId: string, orgId: string): Promise<Sale | null> {
    try {
      const saleData = await this.prisma.sale.findFirst({
        where: { movementId, orgId },
        include: { lines: true },
      });

      if (!saleData) return null;

      return this.mapToEntity(saleData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sale by movement ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding sale by movement ID: ${error}`);
      }
      throw error;
    }
  }

  // Helper functions for functional composition
  private createSaleValueObjects(saleData: {
    saleNumber: string;
    status: string;
    warehouseId: string;
    customerReference: string | null;
    externalReference: string | null;
    note: string | null;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    movementId: string | null;
    createdBy: string;
  }) {
    return {
      saleNumber: SaleNumber.fromString(saleData.saleNumber),
      status: SaleStatus.create(saleData.status as 'DRAFT' | 'CONFIRMED' | 'CANCELLED'),
      warehouseId: saleData.warehouseId,
      customerReference: saleData.customerReference || undefined,
      externalReference: saleData.externalReference || undefined,
      note: saleData.note || undefined,
      confirmedAt: saleData.confirmedAt || undefined,
      cancelledAt: saleData.cancelledAt || undefined,
      createdBy: saleData.createdBy,
      movementId: saleData.movementId || undefined,
    };
  }

  private createSaleLine(lineData: {
    id: string;
    productId: string;
    locationId: string | null;
    quantity: number | string | { toNumber(): number };
    salePrice: number | string | { toNumber(): number };
    currency: string;
    extra: unknown;
    orgId: string;
  }): SaleLine {
    const quantityValue =
      typeof lineData.quantity === 'object' && 'toNumber' in lineData.quantity
        ? lineData.quantity.toNumber()
        : Number(lineData.quantity);
    const quantity = Quantity.create(quantityValue, 6);

    const salePriceValue =
      typeof lineData.salePrice === 'object' && 'toNumber' in lineData.salePrice
        ? lineData.salePrice.toNumber()
        : Number(lineData.salePrice);
    const salePrice = SalePrice.create(salePriceValue, lineData.currency, 2);

    return SaleLine.reconstitute(
      {
        productId: lineData.productId,
        locationId: lineData.locationId || undefined,
        quantity,
        salePrice,
        extra: (lineData.extra as Record<string, unknown>) || undefined,
      },
      lineData.id,
      lineData.orgId
    );
  }

  private mapToEntity(saleData: {
    id: string;
    saleNumber: string;
    status: string;
    warehouseId: string;
    customerReference: string | null;
    externalReference: string | null;
    note: string | null;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    movementId: string | null;
    createdBy: string;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
    lines: Array<{
      id: string;
      productId: string;
      locationId: string | null;
      quantity: number | string | { toNumber(): number };
      salePrice: number | string | { toNumber(): number };
      currency: string;
      extra: unknown;
      orgId: string;
    }>;
  }): Sale {
    const valueObjects = this.createSaleValueObjects(saleData);

    // Create lines using functional approach
    const lines = saleData.lines.map(lineData => this.createSaleLine(lineData));

    // Use reconstitute with lines parameter to bypass addLine validation
    // This is correct because we are reconstituting from database, not adding new lines
    return Sale.reconstitute(
      {
        saleNumber: valueObjects.saleNumber,
        status: valueObjects.status,
        warehouseId: valueObjects.warehouseId,
        customerReference: valueObjects.customerReference,
        externalReference: valueObjects.externalReference,
        note: valueObjects.note,
        confirmedAt: valueObjects.confirmedAt,
        cancelledAt: valueObjects.cancelledAt,
        createdBy: valueObjects.createdBy,
        movementId: valueObjects.movementId,
      },
      saleData.id,
      saleData.orgId,
      lines
    );
  }

  private mapToEntityWithoutLines(saleData: {
    id: string;
    saleNumber: string;
    status: string;
    warehouseId: string;
    customerReference: string | null;
    externalReference: string | null;
    note: string | null;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    movementId: string | null;
    createdBy: string;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Sale {
    const saleNumber = SaleNumber.fromString(saleData.saleNumber);
    const status = SaleStatus.create(saleData.status as 'DRAFT' | 'CONFIRMED' | 'CANCELLED');

    const sale = Sale.reconstitute(
      {
        saleNumber,
        status,
        warehouseId: saleData.warehouseId,
        customerReference: saleData.customerReference || undefined,
        externalReference: saleData.externalReference || undefined,
        note: saleData.note || undefined,
        confirmedAt: saleData.confirmedAt || undefined,
        cancelledAt: saleData.cancelledAt || undefined,
        createdBy: saleData.createdBy,
        movementId: saleData.movementId || undefined,
      },
      saleData.id,
      saleData.orgId
    );

    return sale;
  }

  async findBySpecification(
    spec: IPrismaSpecification<Sale>,
    orgId: string,
    options?: IPaginationOptions
  ): Promise<IPaginatedResult<Sale>> {
    try {
      const where = spec.toPrismaWhere(orgId);
      const skip = options?.skip;
      const take = options?.take;

      const [salesData, total] = await Promise.all([
        this.prisma.sale.findMany({
          where,
          skip,
          take,
          include: { lines: true },
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.sale.count({ where }),
      ]);

      const sales = salesData.map(saleData => this.mapToEntity(saleData));

      return {
        data: sales,
        total,
        hasMore: skip !== undefined && take !== undefined ? skip + take < total : false,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding sales by specification: ${error.message}`);
      } else {
        this.logger.error(`Error finding sales by specification: ${error}`);
      }
      throw error;
    }
  }
}
