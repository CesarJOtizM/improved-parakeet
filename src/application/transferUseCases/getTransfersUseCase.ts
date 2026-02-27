import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { ITransferData } from './initiateTransferUseCase';
import type { ITransferRepository } from '@transfer/domain/repositories/transferRepository.interface';

export interface IGetTransfersRequest {
  orgId: string;
  page?: number;
  limit?: number;
  fromWarehouseId?: string;
  toWarehouseId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ITransferListItemData extends ITransferData {
  fromWarehouseName: string;
  toWarehouseName: string;
  totalQuantity: number;
}

export type IGetTransfersResponse = IPaginatedResponse<ITransferListItemData>;

@Injectable()
export class GetTransfersUseCase {
  private readonly logger = new Logger(GetTransfersUseCase.name);

  constructor(
    @Inject('TransferRepository') private readonly transferRepository: ITransferRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IGetTransfersRequest
  ): Promise<Result<IGetTransfersResponse, DomainError>> {
    this.logger.log('Getting transfers', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
      fromWarehouseId: request.fromWarehouseId,
      toWarehouseId: request.toWarehouseId,
      status: request.status,
    });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const skip = (page - 1) * limit;

    // Get transfers based on filters
    let transfers;
    if (request.fromWarehouseId) {
      transfers = await this.transferRepository.findByFromWarehouse(
        request.fromWarehouseId,
        request.orgId
      );
    } else if (request.toWarehouseId) {
      transfers = await this.transferRepository.findByToWarehouse(
        request.toWarehouseId,
        request.orgId
      );
    } else if (request.status) {
      transfers = await this.transferRepository.findByStatus(request.status, request.orgId);
    } else if (request.startDate && request.endDate) {
      transfers = await this.transferRepository.findByDateRange(
        request.startDate,
        request.endDate,
        request.orgId
      );
    } else {
      transfers = await this.transferRepository.findAll(request.orgId);
    }

    // Apply additional filters
    if (request.fromWarehouseId && transfers.length > 0) {
      transfers = transfers.filter(t => t.fromWarehouseId === request.fromWarehouseId);
    }

    if (request.toWarehouseId && transfers.length > 0) {
      transfers = transfers.filter(t => t.toWarehouseId === request.toWarehouseId);
    }

    if (request.status && transfers.length > 0) {
      transfers = transfers.filter(t => t.status.getValue() === request.status);
    }

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      transfers.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'status':
            aValue = a.status.getValue();
            bValue = b.status.getValue();
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'initiatedAt':
            aValue = a.initiatedAt?.getTime() || 0;
            bValue = b.initiatedAt?.getTime() || 0;
            break;
          case 'receivedAt':
            aValue = a.receivedAt?.getTime() || 0;
            bValue = b.receivedAt?.getTime() || 0;
            break;
          default:
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    const total = transfers.length;
    const paginatedTransfers = transfers.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    // Batch-load warehouse names for the paginated results
    const warehouseIds = new Set<string>();
    paginatedTransfers.forEach(t => {
      warehouseIds.add(t.fromWarehouseId);
      warehouseIds.add(t.toWarehouseId);
    });

    const warehouses = await this.prisma.warehouse.findMany({
      where: { id: { in: [...warehouseIds] } },
      select: { id: true, name: true },
    });
    const warehouseMap = new Map(warehouses.map(w => [w.id, w.name]));

    return ok({
      success: true,
      message: 'Transfers retrieved successfully',
      data: paginatedTransfers.map(transfer => ({
        id: transfer.id,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        fromWarehouseName: warehouseMap.get(transfer.fromWarehouseId) || '',
        toWarehouseName: warehouseMap.get(transfer.toWarehouseId) || '',
        status: transfer.status.getValue(),
        createdBy: transfer.createdBy,
        note: transfer.note,
        linesCount: transfer.getLines().length,
        totalQuantity: transfer
          .getLines()
          .reduce((sum, l) => sum + l.quantity.getNumericValue(), 0),
        orgId: transfer.orgId!,
        createdAt: transfer.createdAt,
        updatedAt: transfer.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
