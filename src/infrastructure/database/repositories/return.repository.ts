import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IPaginatedResult,
  IPaginationOptions,
} from '@infrastructure/database/utils/queryOptimizer';
import { Injectable, Logger } from '@nestjs/common';
import { Return } from '@returns/domain/entities/return.entity';
import { ReturnLine } from '@returns/domain/entities/returnLine.entity';
import { IReturnRepository } from '@returns/domain/ports/repositories/iReturnRepository.port';
import { ReturnNumber } from '@returns/domain/valueObjects/returnNumber.valueObject';
import { ReturnReason } from '@returns/domain/valueObjects/returnReason.valueObject';
import { ReturnStatus } from '@returns/domain/valueObjects/returnStatus.valueObject';
import { ReturnType } from '@returns/domain/valueObjects/returnType.valueObject';
import { SalePrice } from '@sale/domain/valueObjects/salePrice.valueObject';
import { BusinessRuleError, NotFoundError } from '@shared/domain/result';
import { Money } from '@stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@stock/domain/valueObjects/quantity.valueObject';

import type { IPrismaSpecification } from '@shared/domain/specifications';

@Injectable()
export class PrismaReturnRepository implements IReturnRepository {
  private readonly logger = new Logger(PrismaReturnRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Standard include for return queries - includes warehouse, sale, and product relations */
  private readonly returnInclude = {
    lines: {
      include: {
        product: { select: { id: true, name: true, sku: true } },
      },
    },
    warehouse: { select: { id: true, name: true } },
    sale: { select: { id: true, saleNumber: true } },
  } as const;

  async findById(id: string, orgId: string): Promise<Return | null> {
    try {
      const returnData = await this.prisma.return.findUnique({
        where: { id },
        include: this.returnInclude,
      });

      if (!returnData || returnData.orgId !== orgId) return null;

      return this.mapToEntity(returnData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding return by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding return by ID: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Return[]> {
    try {
      const returnsData = await this.prisma.return.findMany({
        where: { orgId },
        include: this.returnInclude,
        orderBy: { createdAt: 'desc' },
      });

      return returnsData.map(returnData => this.mapToEntity(returnData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all returns: ${error.message}`);
      } else {
        this.logger.error(`Error finding all returns: ${error}`);
      }
      throw error;
    }
  }

  async findAllPaginated(
    orgId: string,
    pagination?: IPaginationOptions
  ): Promise<IPaginatedResult<Return>> {
    try {
      const skip = pagination?.skip ?? 0;
      const take = pagination?.take ?? 20;

      const [returnsData, total] = await Promise.all([
        this.prisma.return.findMany({
          where: { orgId },
          include: this.returnInclude,
          orderBy: { createdAt: 'desc' },
          skip,
          take: take + 1,
        }),
        this.prisma.return.count({ where: { orgId } }),
      ]);

      const hasMore = returnsData.length > take;
      const data = returnsData.slice(0, take).map(returnData => this.mapToEntity(returnData));
      const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined;

      return { data, total, hasMore, nextCursor };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all returns paginated: ${error.message}`);
      } else {
        this.logger.error(`Error finding all returns paginated: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.return.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking return existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking return existence: ${error}`);
      }
      throw error;
    }
  }

  async save(returnEntity: Return): Promise<Return> {
    try {
      this.logger.debug('Saving return', {
        returnId: returnEntity.id,
        returnNumber: returnEntity.returnNumber.getValue(),
        orgId: returnEntity.orgId,
        hasId: !!returnEntity.id,
      });

      return await this.prisma.$transaction(async tx => {
        const returnData = {
          returnNumber: returnEntity.returnNumber.getValue(),
          status: returnEntity.status.getValue(),
          type: returnEntity.type.getValue(),
          reason: returnEntity.reason.getValue(),
          warehouseId: returnEntity.warehouseId,
          saleId: returnEntity.saleId || null,
          sourceMovementId: returnEntity.sourceMovementId || null,
          returnMovementId: returnEntity.returnMovementId || null,
          note: returnEntity.note || null,
          confirmedAt: returnEntity.confirmedAt || null,
          cancelledAt: returnEntity.cancelledAt || null,
          createdBy: returnEntity.createdBy,
          orgId: returnEntity.orgId!,
        };

        let savedReturn;

        if (returnEntity.id) {
          const existingReturn = await tx.return.findUnique({
            where: { id: returnEntity.id },
          });

          if (existingReturn) {
            // Update return
            savedReturn = await tx.return.update({
              where: { id: returnEntity.id },
              data: returnData,
            });

            // Delete existing lines
            await tx.returnLine.deleteMany({
              where: { returnId: returnEntity.id },
            });
          } else {
            // Create new return with provided ID
            savedReturn = await tx.return.create({
              data: { ...returnData, id: returnEntity.id },
            });
          }
        } else {
          // Create new return
          savedReturn = await tx.return.create({
            data: returnData,
          });
        }

        // Create lines
        const lines = returnEntity.getLines();
        if (lines.length > 0) {
          const linesToCreate = lines.map(line => ({
            id: line.id || undefined,
            returnId: savedReturn.id,
            productId: line.productId,
            locationId: line.locationId,
            quantity: line.quantity.getNumericValue(),
            originalSalePrice: line.originalSalePrice?.getAmount() || null,
            originalUnitCost: line.originalUnitCost?.getAmount() || null,
            currency: line.currency,
            extra: line.extra || undefined,
            orgId: returnEntity.orgId!,
          }));

          await tx.returnLine.createMany({
            data: linesToCreate as NonNullable<
              Parameters<typeof tx.returnLine.createMany>[0]
            >['data'],
          });
        }

        // Fetch the complete return with lines and relations
        const completeReturn = await tx.return.findUnique({
          where: { id: savedReturn.id },
          include: {
            lines: {
              include: {
                product: { select: { id: true, name: true, sku: true } },
              },
            },
            warehouse: { select: { id: true, name: true } },
            sale: { select: { id: true, saleNumber: true } },
          },
        });

        if (!completeReturn) {
          throw new Error('Failed to retrieve saved return');
        }

        return this.mapToEntity(completeReturn);
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error saving return: ${error.message}`);
      } else {
        this.logger.error(`Error saving return: ${error}`);
      }
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.return.delete({
        where: { id, orgId },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting return: ${error.message}`);
      } else {
        this.logger.error(`Error deleting return: ${error}`);
      }
      throw error;
    }
  }

  /**
   * Adds a line directly to the return without loading all existing lines.
   * This prevents race conditions when multiple lines are added concurrently.
   * Uses a transaction to validate return status and add the line atomically.
   */
  async addLine(returnId: string, line: ReturnLine, orgId: string): Promise<ReturnLine> {
    try {
      this.logger.debug('Adding line directly to return', {
        returnId,
        lineId: line.id,
        productId: line.productId,
        orgId,
      });

      return await this.prisma.$transaction(async tx => {
        // 1. Verify return exists and is in DRAFT status
        const returnEntity = await tx.return.findUnique({
          where: { id: returnId },
          select: { id: true, status: true, type: true, orgId: true },
        });

        if (!returnEntity || returnEntity.orgId !== orgId) {
          throw new NotFoundError(`Return with ID ${returnId} not found`);
        }

        if (returnEntity.status !== 'DRAFT') {
          throw new BusinessRuleError(
            `Cannot add lines to return in ${returnEntity.status} status. Return must be in DRAFT status.`
          );
        }

        // 2. Create the line directly (no need to read existing lines)
        const createdLine = await tx.returnLine.create({
          data: {
            id: line.id,
            returnId,
            productId: line.productId,
            locationId: line.locationId || null,
            quantity: line.quantity.getNumericValue(),
            originalSalePrice: line.originalSalePrice?.getAmount() || null,
            originalUnitCost: line.originalUnitCost?.getAmount() || null,
            currency: line.currency,
            extra: line.extra ? JSON.parse(JSON.stringify(line.extra)) : undefined,
            orgId,
          },
        });

        // 3. Return the line as a domain entity
        const returnType = ReturnType.create(
          returnEntity.type as 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER'
        );
        return this.createReturnLine(createdLine, returnType);
      });
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof BusinessRuleError) {
        throw error;
      }
      if (error instanceof Error) {
        this.logger.error(`Error adding line to return: ${error.message}`);
      } else {
        this.logger.error(`Error adding line to return: ${error}`);
      }
      throw error;
    }
  }

  async findByReturnNumber(returnNumber: string, orgId: string): Promise<Return | null> {
    try {
      const returnData = await this.prisma.return.findFirst({
        where: { returnNumber, orgId },
        include: this.returnInclude,
      });

      if (!returnData) return null;

      return this.mapToEntity(returnData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding return by number: ${error.message}`);
      } else {
        this.logger.error(`Error finding return by number: ${error}`);
      }
      throw error;
    }
  }

  async findByStatus(status: string, orgId: string): Promise<Return[]> {
    try {
      const statuses = status.split(',').map(s => s.trim());
      const returnsData = await this.prisma.return.findMany({
        where: {
          orgId,
          status: statuses.length === 1 ? statuses[0] : { in: statuses },
        },
        include: this.returnInclude,
        orderBy: { createdAt: 'desc' },
      });

      return returnsData.map(returnData => this.mapToEntity(returnData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding returns by status: ${error.message}`);
      } else {
        this.logger.error(`Error finding returns by status: ${error}`);
      }
      throw error;
    }
  }

  async findByType(type: string, orgId: string): Promise<Return[]> {
    try {
      const returnsData = await this.prisma.return.findMany({
        where: { type, orgId },
        include: this.returnInclude,
        orderBy: { createdAt: 'desc' },
      });

      return returnsData.map(returnData => this.mapToEntity(returnData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding returns by type: ${error.message}`);
      } else {
        this.logger.error(`Error finding returns by type: ${error}`);
      }
      throw error;
    }
  }

  async findBySaleId(saleId: string, orgId: string): Promise<Return[]> {
    try {
      const returnsData = await this.prisma.return.findMany({
        where: { saleId, orgId },
        include: this.returnInclude,
        orderBy: { createdAt: 'desc' },
      });

      return returnsData.map(returnData => this.mapToEntity(returnData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding returns by sale ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding returns by sale ID: ${error}`);
      }
      throw error;
    }
  }

  async findBySourceMovementId(movementId: string, orgId: string): Promise<Return[]> {
    try {
      const returnsData = await this.prisma.return.findMany({
        where: { sourceMovementId: movementId, orgId },
        include: this.returnInclude,
        orderBy: { createdAt: 'desc' },
      });

      return returnsData.map(returnData => this.mapToEntity(returnData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding returns by source movement ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding returns by source movement ID: ${error}`);
      }
      throw error;
    }
  }

  async findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Return[]> {
    try {
      const returnsData = await this.prisma.return.findMany({
        where: {
          orgId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: this.returnInclude,
        orderBy: { createdAt: 'desc' },
      });

      return returnsData.map(returnData => this.mapToEntity(returnData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding returns by date range: ${error.message}`);
      } else {
        this.logger.error(`Error finding returns by date range: ${error}`);
      }
      throw error;
    }
  }

  async getLastReturnNumberForYear(year: number, orgId: string): Promise<string | null> {
    try {
      const returnData = await this.prisma.return.findFirst({
        where: {
          orgId,
          returnNumber: {
            startsWith: `RETURN-${year}-`,
          },
        },
        orderBy: { returnNumber: 'desc' },
        select: { returnNumber: true },
      });

      return returnData?.returnNumber || null;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error getting last return number for year: ${error.message}`);
      } else {
        this.logger.error(`Error getting last return number for year: ${error}`);
      }
      throw error;
    }
  }

  async getNextReturnNumber(orgId: string, year: number): Promise<string> {
    try {
      const result = await this.prisma.$queryRaw<[{ get_next_return_number: string }]>`
        SELECT get_next_return_number(${orgId}, ${year})
      `;

      return result[0].get_next_return_number;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error getting next return number: ${error.message}`);
      } else {
        this.logger.error(`Error getting next return number: ${error}`);
      }
      throw error;
    }
  }

  async findByReturnMovementId(movementId: string, orgId: string): Promise<Return | null> {
    try {
      const returnData = await this.prisma.return.findFirst({
        where: { returnMovementId: movementId, orgId },
        include: this.returnInclude,
      });

      if (!returnData) return null;

      return this.mapToEntity(returnData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding return by movement ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding return by movement ID: ${error}`);
      }
      throw error;
    }
  }

  // Helper functions for functional composition
  private createReturnValueObjects(returnData: {
    returnNumber: string;
    status: string;
    type: string;
    reason: string | null;
    warehouseId: string;
    saleId: string | null;
    sourceMovementId: string | null;
    returnMovementId: string | null;
    note: string | null;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    createdBy: string;
  }) {
    return {
      returnNumber: ReturnNumber.fromString(returnData.returnNumber),
      status: ReturnStatus.create(returnData.status as 'DRAFT' | 'CONFIRMED' | 'CANCELLED'),
      type: ReturnType.create(returnData.type as 'RETURN_CUSTOMER' | 'RETURN_SUPPLIER'),
      reason: ReturnReason.create(returnData.reason),
      warehouseId: returnData.warehouseId,
      saleId: returnData.saleId || undefined,
      sourceMovementId: returnData.sourceMovementId || undefined,
      returnMovementId: returnData.returnMovementId || undefined,
      note: returnData.note || undefined,
      confirmedAt: returnData.confirmedAt || undefined,
      cancelledAt: returnData.cancelledAt || undefined,
      createdBy: returnData.createdBy,
    };
  }

  private createReturnLine(
    lineData: {
      id: string;
      productId: string;
      locationId: string | null;
      quantity: number | string | { toNumber(): number };
      originalSalePrice: number | string | { toNumber(): number } | null;
      originalUnitCost: number | string | { toNumber(): number } | null;
      currency: string;
      extra: unknown;
      orgId: string;
    },
    returnType: ReturnType
  ): ReturnLine {
    const quantityValue =
      typeof lineData.quantity === 'object' && 'toNumber' in lineData.quantity
        ? lineData.quantity.toNumber()
        : Number(lineData.quantity);
    const quantity = Quantity.create(quantityValue, 6);

    let originalSalePrice: SalePrice | undefined;
    let originalUnitCost: Money | undefined;

    if (returnType.isCustomerReturn() && lineData.originalSalePrice) {
      const salePriceValue =
        typeof lineData.originalSalePrice === 'object' && 'toNumber' in lineData.originalSalePrice
          ? lineData.originalSalePrice.toNumber()
          : Number(lineData.originalSalePrice);
      originalSalePrice = SalePrice.create(salePriceValue, lineData.currency, 2);
    }

    if (returnType.isSupplierReturn() && lineData.originalUnitCost) {
      const unitCostValue =
        typeof lineData.originalUnitCost === 'object' && 'toNumber' in lineData.originalUnitCost
          ? lineData.originalUnitCost.toNumber()
          : Number(lineData.originalUnitCost);
      originalUnitCost = Money.create(unitCostValue, lineData.currency, 2);
    }

    return ReturnLine.reconstitute(
      {
        productId: lineData.productId,
        locationId: lineData.locationId || undefined,
        quantity,
        originalSalePrice,
        originalUnitCost,
        currency: lineData.currency,
        extra: (lineData.extra as Record<string, unknown>) || undefined,
      },
      lineData.id,
      lineData.orgId
    );
  }

  private mapToEntity(returnData: {
    id: string;
    returnNumber: string;
    status: string;
    type: string;
    reason: string | null;
    warehouseId: string;
    saleId: string | null;
    sourceMovementId: string | null;
    returnMovementId: string | null;
    note: string | null;
    confirmedAt: Date | null;
    cancelledAt: Date | null;
    createdBy: string;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
    warehouse?: { id: string; name: string } | null;
    sale?: { id: string; saleNumber: string } | null;
    lines: Array<{
      id: string;
      productId: string;
      locationId: string | null;
      quantity: number | string | { toNumber(): number };
      originalSalePrice: number | string | { toNumber(): number } | null;
      originalUnitCost: number | string | { toNumber(): number } | null;
      currency: string;
      extra: unknown;
      orgId: string;
      product?: { id: string; name: string; sku: string } | null;
    }>;
  }): Return {
    const valueObjects = this.createReturnValueObjects(returnData);

    // Create lines using functional approach
    const lines = returnData.lines.map(lineData =>
      this.createReturnLine(lineData, valueObjects.type)
    );

    // Use reconstitute with lines parameter to bypass addLine validation
    // This is correct because we are reconstituting from database, not adding new lines
    const entity = Return.reconstitute(
      {
        returnNumber: valueObjects.returnNumber,
        status: valueObjects.status,
        type: valueObjects.type,
        reason: valueObjects.reason,
        warehouseId: valueObjects.warehouseId,
        saleId: valueObjects.saleId,
        sourceMovementId: valueObjects.sourceMovementId,
        returnMovementId: valueObjects.returnMovementId,
        note: valueObjects.note,
        confirmedAt: valueObjects.confirmedAt,
        cancelledAt: valueObjects.cancelledAt,
        createdBy: valueObjects.createdBy,
      },
      returnData.id,
      returnData.orgId,
      lines
    );

    // Set transient read metadata from joined relations
    const lineProducts: Record<string, { name: string; sku: string }> = {};
    for (const line of returnData.lines) {
      if (line.product) {
        lineProducts[line.productId] = { name: line.product.name, sku: line.product.sku };
      }
    }

    entity.setReadMetadata({
      warehouseName: returnData.warehouse?.name,
      saleNumber: returnData.sale?.saleNumber,
      lineProducts,
    });

    return entity;
  }

  async findBySpecification(
    spec: IPrismaSpecification<Return>,
    orgId: string,
    options?: IPaginationOptions
  ): Promise<IPaginatedResult<Return>> {
    try {
      const where = spec.toPrismaWhere(orgId);
      const skip = options?.skip;
      const take = options?.take;

      const [returnsData, total] = await Promise.all([
        this.prisma.return.findMany({
          where,
          include: this.returnInclude,
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.return.count({ where }),
      ]);

      const data = returnsData.map(returnData => this.mapToEntity(returnData));
      const hasMore = take ? data.length === take : false;
      const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined;

      return { data, total, hasMore, nextCursor };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding returns by specification: ${error.message}`);
      } else {
        this.logger.error(`Error finding returns by specification: ${error}`);
      }
      throw error;
    }
  }
}
