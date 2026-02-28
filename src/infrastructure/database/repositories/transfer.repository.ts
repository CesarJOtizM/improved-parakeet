import { PrismaService } from '@infrastructure/database/prisma.service';
import { Quantity } from '@inventory/stock/domain/valueObjects/quantity.valueObject';
import { Injectable, Logger } from '@nestjs/common';
import { Transfer } from '@transfer/domain/entities/transfer.entity';
import { TransferLine } from '@transfer/domain/entities/transferLine.entity';
import { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';
import { TransferStatus } from '@transfer/domain/valueObjects/transferStatus.valueObject';

@Injectable()
export class PrismaTransferRepository implements ITransferRepository {
  private readonly logger = new Logger(PrismaTransferRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, orgId: string): Promise<Transfer | null> {
    try {
      const transferData = await this.prisma.transfer.findFirst({
        where: { id, orgId },
        include: { lines: true },
      });

      if (!transferData) return null;

      return this.mapToEntity(transferData);
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding transfer by ID: ${error.message}`);
      } else {
        this.logger.error(`Error finding transfer by ID: ${error}`);
      }
      throw error;
    }
  }

  async findAll(orgId: string): Promise<Transfer[]> {
    try {
      const transfersData = await this.prisma.transfer.findMany({
        where: { orgId },
        include: { lines: true },
      });

      return transfersData.map(transferData => this.mapToEntity(transferData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding all transfers: ${error.message}`);
      } else {
        this.logger.error(`Error finding all transfers: ${error}`);
      }
      throw error;
    }
  }

  async exists(id: string, orgId: string): Promise<boolean> {
    try {
      const count = await this.prisma.transfer.count({
        where: { id, orgId },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error checking transfer existence: ${error.message}`);
      } else {
        this.logger.error(`Error checking transfer existence: ${error}`);
      }
      throw error;
    }
  }

  async save(transfer: Transfer): Promise<Transfer> {
    try {
      this.logger.debug('Saving transfer', {
        transferId: transfer.id,
        status: transfer.status.getValue(),
        orgId: transfer.orgId,
        hasId: !!transfer.id,
      });

      return await this.prisma.$transaction(async tx => {
        const transferData = {
          fromWarehouseId: transfer.fromWarehouseId,
          toWarehouseId: transfer.toWarehouseId,
          status: transfer.status.getValue(),
          note: transfer.note || null,
          initiatedAt: transfer.initiatedAt || null,
          receivedAt: transfer.receivedAt || null,
          receivedBy: transfer.receivedBy || null,
          createdBy: transfer.createdBy,
          orgId: transfer.orgId,
        };

        let savedTransfer;

        if (transfer.id) {
          const existingTransfer = await tx.transfer.findUnique({
            where: { id: transfer.id },
          });

          if (existingTransfer) {
            // Update transfer
            savedTransfer = await tx.transfer.update({
              where: { id: transfer.id },
              data: transferData,
            });

            // Delete existing lines
            await tx.transferLine.deleteMany({
              where: { transferId: transfer.id },
            });
          } else {
            // Create new transfer with provided ID
            savedTransfer = await tx.transfer.create({
              data: { ...transferData, id: transfer.id },
            });
          }
        } else {
          // Create new transfer
          savedTransfer = await tx.transfer.create({
            data: transferData,
          });
        }

        // Create lines
        const lines = transfer.getLines();
        if (lines.length > 0) {
          await tx.transferLine.createMany({
            data: lines.map(line => ({
              id: line.id || undefined,
              transferId: savedTransfer.id,
              productId: line.productId,
              quantity: line.quantity.getNumericValue(),
              fromLocationId: line.fromLocationId || null,
              toLocationId: line.toLocationId || null,
              orgId: transfer.orgId,
            })),
          });
        }

        // Fetch the complete transfer with lines
        const completeTransfer = await tx.transfer.findUnique({
          where: { id: savedTransfer.id },
          include: { lines: true },
        });

        if (!completeTransfer) {
          throw new Error('Failed to retrieve saved transfer');
        }

        return this.mapToEntity(completeTransfer);
      });
    } catch (error) {
      this.logger.error('Error saving transfer', {
        error: error instanceof Error ? error.message : 'Unknown error',
        transferId: transfer.id,
        orgId: transfer.orgId,
      });
      throw error;
    }
  }

  async delete(id: string, orgId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async tx => {
        await tx.transferLine.deleteMany({
          where: { transferId: id, orgId },
        });
        await tx.transfer.deleteMany({
          where: { id, orgId },
        });
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error deleting transfer: ${error.message}`);
      } else {
        this.logger.error(`Error deleting transfer: ${error}`);
      }
      throw error;
    }
  }

  async findByFromWarehouse(warehouseId: string, orgId: string): Promise<Transfer[]> {
    try {
      const transfersData = await this.prisma.transfer.findMany({
        where: { fromWarehouseId: warehouseId, orgId },
        include: { lines: true },
      });

      return transfersData.map(transferData => this.mapToEntity(transferData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding transfers by from warehouse: ${error.message}`);
      } else {
        this.logger.error(`Error finding transfers by from warehouse: ${error}`);
      }
      throw error;
    }
  }

  async findByToWarehouse(warehouseId: string, orgId: string): Promise<Transfer[]> {
    try {
      const transfersData = await this.prisma.transfer.findMany({
        where: { toWarehouseId: warehouseId, orgId },
        include: { lines: true },
      });

      return transfersData.map(transferData => this.mapToEntity(transferData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding transfers by to warehouse: ${error.message}`);
      } else {
        this.logger.error(`Error finding transfers by to warehouse: ${error}`);
      }
      throw error;
    }
  }

  async findByStatus(status: string, orgId: string): Promise<Transfer[]> {
    try {
      const statuses = status.split(',').map(s => s.trim());
      const transfersData = await this.prisma.transfer.findMany({
        where: {
          orgId,
          status: statuses.length === 1 ? statuses[0] : { in: statuses },
        },
        include: { lines: true },
      });

      return transfersData.map(transferData => this.mapToEntity(transferData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding transfers by status: ${error.message}`);
      } else {
        this.logger.error(`Error finding transfers by status: ${error}`);
      }
      throw error;
    }
  }

  async findByDateRange(startDate: Date, endDate: Date, orgId: string): Promise<Transfer[]> {
    try {
      const transfersData = await this.prisma.transfer.findMany({
        where: {
          orgId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: { lines: true },
      });

      return transfersData.map(transferData => this.mapToEntity(transferData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding transfers by date range: ${error.message}`);
      } else {
        this.logger.error(`Error finding transfers by date range: ${error}`);
      }
      throw error;
    }
  }

  async findInTransitTransfers(orgId: string): Promise<Transfer[]> {
    try {
      const transfersData = await this.prisma.transfer.findMany({
        where: { status: 'IN_TRANSIT', orgId },
        include: { lines: true },
      });

      return transfersData.map(transferData => this.mapToEntity(transferData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding in-transit transfers: ${error.message}`);
      } else {
        this.logger.error(`Error finding in-transit transfers: ${error}`);
      }
      throw error;
    }
  }

  async findPendingTransfers(orgId: string): Promise<Transfer[]> {
    try {
      const transfersData = await this.prisma.transfer.findMany({
        where: { status: 'DRAFT', orgId },
        include: { lines: true },
      });

      return transfersData.map(transferData => this.mapToEntity(transferData));
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(`Error finding pending transfers: ${error.message}`);
      } else {
        this.logger.error(`Error finding pending transfers: ${error}`);
      }
      throw error;
    }
  }

  private mapToEntity(transferData: {
    id: string;
    fromWarehouseId: string;
    toWarehouseId: string;
    status: string;
    note: string | null;
    initiatedAt: Date | null;
    receivedAt: Date | null;
    receivedBy: string | null;
    createdBy: string;
    orgId: string;
    createdAt: Date;
    updatedAt: Date;
    lines: Array<{
      id: string;
      productId: string;
      quantity: number;
      fromLocationId: string | null;
      toLocationId: string | null;
      orgId: string;
    }>;
  }): Transfer {
    // Create transfer with DRAFT status first to allow adding lines
    const tempStatus = TransferStatus.create('DRAFT');
    const transfer = Transfer.reconstitute(
      {
        fromWarehouseId: transferData.fromWarehouseId,
        toWarehouseId: transferData.toWarehouseId,
        status: tempStatus,
        createdBy: transferData.createdBy,
        note: transferData.note || undefined,
        initiatedAt: transferData.initiatedAt || undefined,
        receivedAt: transferData.receivedAt || undefined,
        receivedBy: transferData.receivedBy || undefined,
      },
      transferData.id,
      transferData.orgId
    );

    // Add lines to transfer (only works when status is DRAFT)
    for (const lineData of transferData.lines) {
      const quantity = Quantity.create(lineData.quantity, 0);

      const line = TransferLine.reconstitute(
        {
          productId: lineData.productId,
          quantity,
          fromLocationId: lineData.fromLocationId || undefined,
          toLocationId: lineData.toLocationId || undefined,
        },
        lineData.id,
        transferData.orgId
      );

      transfer.addLine(line);
    }

    // Now restore the actual status if it's not DRAFT
    if (transferData.status !== 'DRAFT') {
      // Use type assertion to access private props

      (
        transfer as unknown as {
          props: { status: TransferStatus; initiatedAt?: Date; receivedAt?: Date };
        }
      ).props.status = TransferStatus.create(
        transferData.status as
          | 'DRAFT'
          | 'IN_TRANSIT'
          | 'PARTIAL'
          | 'RECEIVED'
          | 'REJECTED'
          | 'CANCELED'
      );
      if (transferData.initiatedAt) {
        (transfer as unknown as { props: { initiatedAt?: Date } }).props.initiatedAt =
          transferData.initiatedAt;
      }
      if (transferData.receivedAt) {
        (transfer as unknown as { props: { receivedAt?: Date } }).props.receivedAt =
          transferData.receivedAt;
      }
    }

    return transfer;
  }
}
