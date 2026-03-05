import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { WAREHOUSE_NOT_FOUND } from '@shared/constants/error-codes';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { WarehouseMapper } from '@warehouse/mappers/warehouse.mapper';

import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface IGetWarehouseByIdRequest {
  warehouseId: string;
  orgId: string;
}

export type IGetWarehouseByIdResponse = IApiResponseSuccess<
  ReturnType<typeof WarehouseMapper.toResponseData>
>;

@Injectable()
export class GetWarehouseByIdUseCase {
  private readonly logger = new Logger(GetWarehouseByIdUseCase.name);

  constructor(
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IGetWarehouseByIdRequest
  ): Promise<Result<IGetWarehouseByIdResponse, DomainError>> {
    this.logger.log('Getting warehouse by ID', {
      warehouseId: request.warehouseId,
      orgId: request.orgId,
    });

    // Fetch warehouse and pre-fetch user names in parallel for faster response
    const [warehouse, userMap] = await Promise.all([
      this.warehouseRepository.findById(request.warehouseId, request.orgId),
      this.prisma.warehouse
        .findUnique({
          where: { id: request.warehouseId },
          select: { statusChangedBy: true },
        })
        .then(async w => {
          if (!w?.statusChangedBy) return null;
          const user = await this.prisma.user.findUnique({
            where: { id: w.statusChangedBy },
            select: { firstName: true, lastName: true },
          });
          return user ? `${user.firstName} ${user.lastName}`.trim() : w.statusChangedBy;
        }),
    ]);

    if (!warehouse) {
      return err(new NotFoundError('Warehouse not found', WAREHOUSE_NOT_FOUND));
    }

    const data = WarehouseMapper.toResponseData(warehouse);

    return ok({
      success: true,
      message: 'Warehouse retrieved successfully',
      data: { ...data, statusChangedBy: userMap },
      timestamp: new Date().toISOString(),
    });
  }
}
