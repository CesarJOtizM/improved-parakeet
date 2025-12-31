import { PrismaService } from '@infrastructure/database/prisma.service';
import {
  IPaginatedResult,
  IPaginationOptions,
} from '@infrastructure/database/utils/queryOptimizer';
import { Money } from '@inventory/stock/domain/valueObjects/money.valueObject';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementLine } from '@movement/domain/entities/movementLine.entity';
import { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';
import { MovementStatus } from '@movement/domain/valueObjects/movementStatus.valueObject';
import { MovementType } from '@movement/domain/valueObjects/movementType.valueObject';
import { Injectable, Logger } from '@nestjs/common';
import { pipe } from '@shared/utils/functional';

@Injectable()
export class PrismaMovementRepository implements IMovementRepository {
  private readonly logger = new Logger(PrismaMovementRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Movement | null> {
    try {
      const movementData = await this.prisma.movement.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!movementData || movementData.orgId !== orgId) return null;

      return this.mapToEntity(movementData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding movement by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding movement by ID: ${error}`);
      }
      throw error;
    }
  }

  async findByIdWithoutLines(id: string, orgId: string): Promise<Movement | null> {
    try {
      const movementData = await this.prisma.movement.findUnique({
        where: { id },
      });

      if (!movementData || movementData.orgId !== orgId) return null;

      return this.mapToEntityWithoutLines(movementData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding movement by ID without lines: ${error.message}`);
      } else {
        this.logger.error(`Error finding movement by ID without lines: ${error}`);
      }
      throw error;
    }
  }

  async loadLines(movementId: string, orgId: string): Promise<MovementLine[]> {
    try {
      const linesData = await this.prisma.movementLine.findMany({
        where: { movementId, orgId },
      });

      return linesData.map(lineData => {
        const quantity = Quantity.create(lineData.quantity, 0);
        const unitCostValue =
          lineData.unitCost !== null
            ? typeof lineData.unitCost === 'object' && 'toNumber' in lineData.unitCost
              ? lineData.unitCost.toNumber()
              : Number(lineData.unitCost)
            : null;
        const unitCost =
          unitCostValue !== null ? Money.create(unitCostValue, lineData.currency, 2) : undefined;

        return MovementLine.reconstitute(
          {
            productId: lineData.productId,
            locationId: lineData.locationId || '',
            quantity,
            unitCost,
            currency: lineData.currency,
            extra: undefined,
          },
          lineData.id,
          orgId
        );
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error loading movement lines: ${error.message}`);
      } else {
        this.logger.error(`Error loading movement lines: ${error}`);
      }
      throw error;
    }
  }

  async findAllWithoutLines(
    orgId: string,
    pagination?: IPaginationOptions
  ): Promise<IPaginatedResult<Movement>> {
    try {
      const skip = pagination?.skip ?? 0;
      const take = pagination?.take ?? 20;

      const [movementsData, total] = await Promise.all([
        this.prisma.movement.findMany({
          where: { orgId },
          skip,
          take: take + 1, // Fetch one extra to determine hasMore
        }),
        this.prisma.movement.count({ where: { orgId } }),
      ]);

      const hasMore = movementsData.length > take;
      const data = movementsData
        .slice(0, take)
        .map(movementData => this.mapToEntityWithoutLines(movementData));
      const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : undefined;

      return {
        data,
        total,
        hasMore,
        nextCursor,
      };
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all movements without lines: ${error.message}`);
      } else {
        this.logger.error(`Error finding all movements without lines: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Movement[]> {
    try {
      const movementsData = await this.prisma.movement.findMany({
        where: { orgId },
        include: { lines: true },
      });

      return movementsData.map(movementData => this.mapToEntity(movementData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all movements: ${error.message}`);
      } else {
        this.logger.error(`Error finding all movements: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.movement.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking movement existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking movement existence: ${error}`);
      }
      throw error;
    }
  }

  async save(movement: Movement): Promise<Movement> {
    try {
      this.logger.debug('Saving movement', {
        movementId: movement.id,
        type: movement.type.getValue(),
        orgId: movement.orgId,
        hasId: !!movement.id,
      });

      return await this.prisma.$transaction(async tx => {
        const movementData = {
          type: movement.type.getValue(),
          status: movement.status.getValue(),
          warehouseId: movement.warehouseId,
          reference: movement.reference || null,
          reason: movement.reason || null,
          notes: movement.note || null,
          postedAt: movement.postedAt || null,
          createdBy: movement.createdBy,
          orgId: movement.orgId,
        };

        let savedMovement;

        if (movement.id) {
          const existingMovement = await tx.movement.findUnique({
            where: { id: movement.id },
          });

          if (existingMovement) {
            // Update movement
            savedMovement = await tx.movement.update({
              where: { id: movement.id },
              data: movementData,
            });

            // Delete existing lines
            await tx.movementLine.deleteMany({
              where: { movementId: movement.id },
            });
          } else {
            // Create new movement with provided ID
            savedMovement = await tx.movement.create({
              data: { ...movementData, id: movement.id },
            });
          }
        } else {
          // Create new movement
          savedMovement = await tx.movement.create({
            data: movementData,
          });
        }

        // Create lines
        const lines = movement.getLines();
        if (lines.length > 0) {
          const linesToCreate = lines.map(line => {
            const lineData: {
              movementId: string;
              productId: string;
              locationId: string | null;
              quantity: number;
              unitCost: number | null;
              currency: string;
              orgId: string;
              id?: string;
            } = {
              movementId: savedMovement.id,
              productId: line.productId,
              locationId: line.locationId || null,
              quantity: line.quantity.getNumericValue(),
              unitCost: line.unitCost ? line.unitCost.getAmount() : null,
              currency: line.currency,
              orgId: movement.orgId,
            };

            if (line.id) {
              lineData.id = line.id;
            }

            return lineData;
          });

          await tx.movementLine.createMany({
            data: linesToCreate,
          });
        }

        // Fetch the complete movement with lines
        const completeMovement = await tx.movement.findUnique({
          where: { id: savedMovement.id },
          include: { lines: true },
        });

        if (!completeMovement) {
          throw new Error('Failed to retrieve saved movement');
        }

        return this.mapToEntity(completeMovement);
      });
    } catch (error) {
      this.logger.error('Error saving movement', {
        error: error instanceof Error ? error.message : 'Unknown error',
        movementId: movement.id,
        orgId: movement.orgId,
      });
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async tx => {
        await tx.movementLine.deleteMany({
          where: { movementId: id, orgId },
        });
        await tx.movement.deleteMany({
          where: { id, orgId },
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting movement: ${error.message}`);
      } else {
        this.logger.error(`Error deleting movement: ${error}`);
      }
      throw error;
    }
  }

  async findByWarehouse(warehouseId: string, orgId: string): Promise<Movement[]> {
    try {
      const movementsData = await this.prisma.movement.findMany({
        where: { warehouseId, orgId },
        include: { lines: true },
      });

      return movementsData.map(movementData => this.mapToEntity(movementData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding movements by warehouse: ${error.message}`);
      } else {
        this.logger.error(`Error finding movements by warehouse: ${error}`);
      }
      throw error;
    }
  }

  async findByStatus(status: string, orgId: string): Promise<Movement[]> {
    try {
      const movementsData = await this.prisma.movement.findMany({
        where: { status, orgId },
        include: { lines: true },
      });

      return movementsData.map(movementData => this.mapToEntity(movementData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding movements by status: ${error.message}`);
      } else {
        this.logger.error(`Error finding movements by status: ${error}`);
      }
      throw error;
    }
  }

  async findByType(type: string, orgId: string): Promise<Movement[]> {
    try {
      const movementsData = await this.prisma.movement.findMany({
        where: { type, orgId },
        include: { lines: true },
      });

      return movementsData.map(movementData => this.mapToEntity(movementData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding movements by type: ${error.message}`);
      } else {
        this.logger.error(`Error finding movements by type: ${error}`);
      }
      throw error;
    }
  }

  async findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Movement[]> {
    try {
      const movementsData = await this.prisma.movement.findMany({
        where: {
          orgId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { lines: true },
      });

      return movementsData.map(movementData => this.mapToEntity(movementData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding movements by date range: ${error.message}`);
      } else {
        this.logger.error(`Error finding movements by date range: ${error}`);
      }
      throw error;
    }
  }

  async findByProduct(productId: string, orgId: string): Promise<Movement[]> {
    try {
      // Optimized: Query movements directly using join through lines
      const movementsData = await this.prisma.movement.findMany({
        where: {
          orgId,
          lines: {
            some: {
              productId,
              orgId,
            },
          },
        },
        include: { lines: true },
      });

      return movementsData.map(movementData => this.mapToEntity(movementData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding movements by product: ${error.message}`);
      } else {
        this.logger.error(`Error finding movements by product: ${error}`);
      }
      throw error;
    }
  }

  async findDraftMovements(orgId: string): Promise<Movement[]> {
    try {
      const movementsData = await this.prisma.movement.findMany({
        where: { status: 'DRAFT', orgId },
        include: { lines: true },
      });

      return movementsData.map(movementData => this.mapToEntity(movementData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding draft movements: ${error.message}`);
      } else {
        this.logger.error(`Error finding draft movements: ${error}`);
      }
      throw error;
    }
  }

  async findPostedMovements(orgId: string): Promise<Movement[]> {
    try {
      const movementsData = await this.prisma.movement.findMany({
        where: { status: 'POSTED', orgId },
        include: { lines: true },
      });

      return movementsData.map(movementData => this.mapToEntity(movementData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding posted movements: ${error.message}`);
      } else {
        this.logger.error(`Error finding posted movements: ${error}`);
      }
      throw error;
    }
  }

  // Helper functions for functional composition
  private createMovementValueObjects(movementData: {
    type: string;
    status: string;
    warehouseId: string;
    reference: string | null;
    reason: string | null;
    notes: string | null;
    postedAt: Date | null;
    createdBy: string;
  }) {
    return {
      type: MovementType.create(
        movementData.type as
          | 'IN'
          | 'OUT'
          | 'ADJUST_IN'
          | 'ADJUST_OUT'
          | 'TRANSFER_OUT'
          | 'TRANSFER_IN'
      ),
      status: MovementStatus.create('DRAFT'), // Temporary DRAFT status
      warehouseId: movementData.warehouseId,
      reference: movementData.reference || undefined,
      reason: movementData.reason || undefined,
      note: movementData.notes || undefined,
      postedAt: movementData.postedAt || undefined,
      createdBy: movementData.createdBy,
      actualStatus: MovementStatus.create(movementData.status as 'DRAFT' | 'POSTED' | 'VOID'),
      actualPostedAt: movementData.postedAt || undefined,
    };
  }

  private createMovementLine(lineData: {
    id: string;
    productId: string;
    locationId: string | null;
    quantity: number;
    unitCost: number | string | { toNumber(): number } | null;
    currency: string;
    orgId: string;
  }): MovementLine {
    const quantity = Quantity.create(lineData.quantity, 0);
    const unitCostValue =
      lineData.unitCost !== null
        ? typeof lineData.unitCost === 'object' && 'toNumber' in lineData.unitCost
          ? lineData.unitCost.toNumber()
          : Number(lineData.unitCost)
        : null;
    const unitCost =
      unitCostValue !== null ? Money.create(unitCostValue, lineData.currency, 2) : undefined;

    return MovementLine.reconstitute(
      {
        productId: lineData.productId,
        locationId: lineData.locationId || '',
        quantity,
        unitCost,
        currency: lineData.currency,
        extra: undefined,
      },
      lineData.id,
      lineData.orgId
    );
  }

  private addLinesToMovement(movement: Movement, lines: MovementLine[]): Movement {
    // Add lines to movement (only works when status is DRAFT)
    for (const line of lines) {
      movement.addLine(line);
    }
    return movement;
  }

  private restoreMovementStatus(
    movement: Movement,
    actualStatus: MovementStatus,
    actualPostedAt?: Date
  ): Movement {
    // Restore the actual status if it's not DRAFT
    if (actualStatus.getValue() !== 'DRAFT') {
      // Use type assertion to access private props
      // This is necessary because we can't change status after adding lines
      (movement as unknown as { props: { status: MovementStatus; postedAt?: Date } }).props.status =
        actualStatus;
      if (actualPostedAt) {
        (movement as unknown as { props: { postedAt?: Date } }).props.postedAt = actualPostedAt;
      }
    }
    return movement;
  }

  private mapToEntity(movementData: {
    id: string;
    type: string;
    status: string;
    warehouseId: string;
    reference: string | null;
    reason: string | null;
    notes: string | null;
    postedAt: Date | null;
    createdBy: string;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
    lines: Array<{
      id: string;
      productId: string;
      locationId: string | null;
      quantity: number;
      unitCost: number | string | { toNumber(): number } | null;
      currency: string;
      orgId: string;
    }>;
  }): Movement {
    // Use functional composition with pipe
    const valueObjects = this.createMovementValueObjects(movementData);
    const movement = Movement.reconstitute(
      {
        type: valueObjects.type,
        status: valueObjects.status, // Temporary DRAFT
        warehouseId: valueObjects.warehouseId,
        reference: valueObjects.reference,
        reason: valueObjects.reason,
        note: valueObjects.note,
        postedAt: valueObjects.postedAt,
        createdBy: valueObjects.createdBy,
      },
      movementData.id,
      movementData.orgId
    );

    // Create lines using functional approach
    const lines = movementData.lines.map(lineData => this.createMovementLine(lineData));

    // Compose operations using pipe
    return pipe(
      (m: Movement) => this.addLinesToMovement(m, lines),
      (m: Movement) =>
        this.restoreMovementStatus(m, valueObjects.actualStatus, valueObjects.actualPostedAt)
    )(movement);
  }

  private mapToEntityWithoutLines(movementData: {
    id: string;
    type: string;
    status: string;
    warehouseId: string;
    reference: string | null;
    reason: string | null;
    notes: string | null;
    postedAt: Date | null;
    createdBy: string;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
  }): Movement {
    const movement = Movement.reconstitute(
      {
        type: MovementType.create(
          movementData.type as
            | 'IN'
            | 'OUT'
            | 'ADJUST_IN'
            | 'ADJUST_OUT'
            | 'TRANSFER_OUT'
            | 'TRANSFER_IN'
        ),
        status: MovementStatus.create(movementData.status as 'DRAFT' | 'POSTED' | 'VOID'),
        warehouseId: movementData.warehouseId,
        reference: movementData.reference || undefined,
        reason: movementData.reason || undefined,
        note: movementData.notes || undefined,
        postedAt: movementData.postedAt || undefined,
        createdBy: movementData.createdBy,
      },
      movementData.id,
      movementData.orgId
    );

    return movement;
  }
}
