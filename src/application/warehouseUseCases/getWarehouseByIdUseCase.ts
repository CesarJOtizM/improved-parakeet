import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
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

    const warehouse = await this.warehouseRepository.findById(request.warehouseId, request.orgId);

    if (!warehouse) {
      return err(new NotFoundError('Warehouse not found'));
    }

    const data = WarehouseMapper.toResponseData(warehouse);
    const statusChangedByName = await this.resolveUserName(warehouse.statusChangedBy);

    return ok({
      success: true,
      message: 'Warehouse retrieved successfully',
      data: { ...data, statusChangedBy: statusChangedByName },
      timestamp: new Date().toISOString(),
    });
  }

  private async resolveUserName(userId?: string | null): Promise<string | null> {
    if (!userId) return null;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (!user) return userId;
      return `${user.firstName} ${user.lastName}`.trim();
    } catch {
      return userId;
    }
  }
}
