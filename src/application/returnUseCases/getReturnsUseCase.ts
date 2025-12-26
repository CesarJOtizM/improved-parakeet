import { Inject, Injectable, Logger } from '@nestjs/common';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { IReturnData } from './createReturnUseCase';
import type { IReturnRepository } from '@returns/domain/repositories/returnRepository.interface';

export interface IGetReturnsRequest {
  orgId: string;
  page?: number;
  limit?: number;
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

  async execute(request: IGetReturnsRequest): Promise<IGetReturnsResponse> {
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
      returns = returns.filter(r => r.warehouseId === request.warehouseId);
    }

    if (request.status && returns.length > 0) {
      returns = returns.filter(r => r.status.getValue() === request.status);
    }

    if (request.type && returns.length > 0) {
      returns = returns.filter(r => r.type.getValue() === request.type);
    }

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      returns.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'returnNumber':
            aValue = a.returnNumber.getValue();
            bValue = b.returnNumber.getValue();
            break;
          case 'status':
            aValue = a.status.getValue();
            bValue = b.status.getValue();
            break;
          case 'createdAt':
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
            break;
          case 'confirmedAt':
            aValue = a.confirmedAt?.getTime() || 0;
            bValue = b.confirmedAt?.getTime() || 0;
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
    const total = returns.length;
    const paginatedReturns = returns.slice(skip, skip + limit);
    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      message: 'Returns retrieved successfully',
      data: paginatedReturns.map(returnEntity => {
        const totalAmount = returnEntity.getTotalAmount();
        const lines = returnEntity.getLines().map(line => {
          const lineTotal = line.getTotalPrice();
          return {
            id: line.id,
            productId: line.productId,
            locationId: line.locationId,
            quantity: line.quantity.getNumericValue(),
            originalSalePrice: line.originalSalePrice?.getAmount(),
            originalUnitCost: line.originalUnitCost?.getAmount(),
            currency: line.currency,
            totalPrice: lineTotal?.getAmount() || 0,
          };
        });

        return {
          id: returnEntity.id,
          returnNumber: returnEntity.returnNumber.getValue(),
          status: returnEntity.status.getValue(),
          type: returnEntity.type.getValue(),
          reason: returnEntity.reason.getValue(),
          warehouseId: returnEntity.warehouseId,
          saleId: returnEntity.saleId,
          sourceMovementId: returnEntity.sourceMovementId,
          returnMovementId: returnEntity.returnMovementId,
          note: returnEntity.note,
          confirmedAt: returnEntity.confirmedAt,
          cancelledAt: returnEntity.cancelledAt,
          createdBy: returnEntity.createdBy,
          orgId: returnEntity.orgId,
          createdAt: returnEntity.createdAt,
          updatedAt: returnEntity.updatedAt,
          totalAmount: totalAmount?.getAmount(),
          currency: totalAmount?.getCurrency(),
          lines,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }
}
