import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IMovementData } from './createMovementUseCase';
import type { IMovementRepository } from '@movement/domain/repositories/movementRepository.interface';

export interface IGetMovementsRequest {
  orgId: string;
  page?: number;
  limit?: number;
  warehouseId?: string;
  status?: string;
  type?: string;
  productId?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type IGetMovementsResponse = IPaginatedResponse<IMovementData>;

@Injectable()
export class GetMovementsUseCase {
  private readonly logger = new Logger(GetMovementsUseCase.name);

  constructor(
    @Inject('MovementRepository') private readonly movementRepository: IMovementRepository
  ) {}

  async execute(
    request: IGetMovementsRequest
  ): Promise<Result<IGetMovementsResponse, DomainError>> {
    this.logger.log('Getting movements', {
      orgId: request.orgId,
      page: request.page,
      limit: request.limit,
      warehouseId: request.warehouseId,
      status: request.status,
      type: request.type,
    });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const skip = (page - 1) * limit;

    // Get movements based on filters
    let movements;
    if (request.warehouseId) {
      movements = await this.movementRepository.findByWarehouse(request.warehouseId, request.orgId);
    } else if (request.status) {
      movements = await this.movementRepository.findByStatus(request.status, request.orgId);
    } else if (request.type) {
      movements = await this.movementRepository.findByType(request.type, request.orgId);
    } else if (request.productId) {
      movements = await this.movementRepository.findByProduct(request.productId, request.orgId);
    } else if (request.startDate && request.endDate) {
      movements = await this.movementRepository.findByDateRange(
        request.startDate,
        request.endDate,
        request.orgId
      );
    } else {
      movements = await this.movementRepository.findAll(request.orgId);
    }

    // Apply additional filters
    if (request.warehouseId && movements.length > 0) {
      movements = movements.filter(m => m.warehouseId === request.warehouseId);
    }

    if (request.status && movements.length > 0) {
      movements = movements.filter(m => m.status.getValue() === request.status);
    }

    if (request.type && movements.length > 0) {
      movements = movements.filter(m => m.type.getValue() === request.type);
    }

    if (request.productId && movements.length > 0) {
      movements = movements.filter(m =>
        m.getLines().some(line => line.productId === request.productId)
      );
    }

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      movements.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'type':
            aValue = a.type.getValue();
            bValue = b.type.getValue();
            break;
          case 'status':
            aValue = a.status.getValue();
            bValue = b.status.getValue();
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'postedAt':
            aValue = a.postedAt?.getTime() || 0;
            bValue = b.postedAt?.getTime() || 0;
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
    const total = movements.length;
    const paginatedMovements = movements.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return ok({
      success: true,
      message: 'Movements retrieved successfully',
      data: paginatedMovements.map(movement => ({
        id: movement.id,
        type: movement.type.getValue(),
        status: movement.status.getValue(),
        warehouseId: movement.warehouseId,
        reference: movement.reference,
        reason: movement.reason,
        note: movement.note,
        lines: movement.getLines().map(line => ({
          id: line.id,
          productId: line.productId,
          locationId: line.locationId,
          quantity: line.quantity.getNumericValue(),
          unitCost: line.unitCost?.getAmount(),
          currency: line.currency,
          extra: line.extra,
        })),
        createdBy: movement.createdBy,
        orgId: movement.orgId!,
        createdAt: movement.createdAt,
        updatedAt: movement.updatedAt,
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
