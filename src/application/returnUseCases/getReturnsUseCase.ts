import { Inject, Injectable, Logger } from '@nestjs/common';
import { ReturnMapper } from '@returns/mappers';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

export interface IGetReturnsRequest {
  orgId: string;
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  status?: string;
  type?: string;
  startDate?: Date;
  endDate?: Date;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export type IGetReturnsResponse = IPaginatedResponse<IReturnData>;

@Injectable()
export class GetReturnsUseCase {
  private readonly logger = new Logger(GetReturnsUseCase.name);

  constructor(
    @Inject('ReturnRepository')
    private readonly returnRepository: IReturnRepository
  ) {}

  async execute(request: IGetReturnsRequest): Promise<Result<IGetReturnsResponse, DomainError>> {
    this.logger.log('Getting returns', {
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

    // Get returns based on filters
    let returns;
    if (request.status) {
      returns = await this.returnRepository.findByStatus(request.status, request.orgId);
    } else if (request.type) {
      returns = await this.returnRepository.findByType(request.type, request.orgId);
    } else if (request.startDate && request.endDate) {
      returns = await this.returnRepository.findByDateRange(
        request.startDate,
        request.endDate,
        request.orgId
      );
    } else {
      returns = await this.returnRepository.findAll(request.orgId);
    }

    // Apply additional filters
    if (request.warehouseId && returns.length > 0) {
      const allowedWarehouses = request.warehouseId
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);
      returns = returns.filter(r => allowedWarehouses.includes(r.warehouseId));
    }

    if (request.status && returns.length > 0) {
      const allowedStatuses = request.status.split(',').map(s => s.trim());
      returns = returns.filter(r => allowedStatuses.includes(r.status.getValue()));
    }

    if (request.type && returns.length > 0) {
      const allowedTypes = request.type
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);
      returns = returns.filter(r => allowedTypes.includes(r.type.getValue()));
    }

    // Apply search filter (by return number)
    if (request.search && returns.length > 0) {
      const searchLower = request.search.toLowerCase();
      returns = returns.filter(r => r.returnNumber.getValue().toLowerCase().includes(searchLower));
    }

    // Map entities to response DTOs (before sorting so warehouseName/lines are available)
    const responseData = ReturnMapper.toResponseDataList(returns);

    // Apply sorting on mapped data
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      responseData.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'returnNumber':
            aValue = a.returnNumber || '';
            bValue = b.returnNumber || '';
            break;
          case 'type':
            aValue = a.type || '';
            bValue = b.type || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'total':
            aValue = a.totalAmount || 0;
            bValue = b.totalAmount || 0;
            break;
          case 'warehouseName':
            aValue = (a.warehouseName || '').toLowerCase();
            bValue = (b.warehouseName || '').toLowerCase();
            break;
          case 'items':
            aValue = a.lines?.length || 0;
            bValue = b.lines?.length || 0;
            break;
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'confirmedAt':
            aValue = a.confirmedAt ? new Date(a.confirmedAt).getTime() : 0;
            bValue = b.confirmedAt ? new Date(b.confirmedAt).getTime() : 0;
            break;
          default:
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Apply pagination
    const total = responseData.length;
    const paginatedData = responseData.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return ok({
      success: true,
      message: 'Returns retrieved successfully',
      data: paginatedData,
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
