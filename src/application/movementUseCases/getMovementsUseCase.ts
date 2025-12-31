import { Movement } from '@movement/domain/entities/movement.entity';
import { MovementMapper } from '@movement/mappers';
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
  includeLines?: boolean; // Optional: include lines in response (default: true)
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

    // Determine if we should include lines (default: true for backward compatibility)
    const includeLines = request.includeLines !== false;

    // Get movements based on filters
    // Use lazy loading methods if includeLines is false and repository supports it
    let movements;
    if (!includeLines && this.movementRepository.findAllWithoutLines) {
      // Use lazy loading for list operations
      const page = request.page || 1;
      const limit = request.limit || 10;
      const skip = (page - 1) * limit;
      const paginationResult = await this.movementRepository.findAllWithoutLines(request.orgId, {
        skip,
        take: limit,
      });
      movements = paginationResult.data;
    } else {
      // Use regular methods that include lines
      if (request.warehouseId) {
        movements = await this.movementRepository.findByWarehouse(
          request.warehouseId,
          request.orgId
        );
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
    }

    // Apply additional filters
    if (request.warehouseId && movements.length > 0) {
      movements = movements.filter((m: Movement) => m.warehouseId === request.warehouseId);
    }

    if (request.status && movements.length > 0) {
      movements = movements.filter((m: Movement) => m.status.getValue() === request.status);
    }

    if (request.type && movements.length > 0) {
      movements = movements.filter((m: Movement) => m.type.getValue() === request.type);
    }

    if (request.productId && movements.length > 0) {
      movements = movements.filter((m: Movement) =>
        m.getLines().some((line: { productId: string }) => line.productId === request.productId)
      );
    }

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      movements.sort((a: Movement, b: Movement) => {
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

    // Use mapper to convert entities to response DTOs
    return ok({
      success: true,
      message: 'Movements retrieved successfully',
      data: MovementMapper.toResponseDataList(paginatedMovements),
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
