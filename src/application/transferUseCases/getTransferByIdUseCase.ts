import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { TRANSFER_NOT_FOUND } from '@shared/constants/error-codes';
import { DomainError, NotFoundError, Result, err, ok } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

export interface IGetTransferByIdRequest {
  transferId: string;
  orgId: string;
}

export interface ITransferLineDetail {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  fromLocationId?: string;
  toLocationId?: string;
}

export interface ITransferDetailData {
  id: string;
  fromWarehouseId: string;
  fromWarehouseName: string;
  toWarehouseId: string;
  toWarehouseName: string;
  status: string;
  createdBy: string;
  receivedBy?: string;
  note?: string;
  linesCount: number;
  lines: ITransferLineDetail[];
  orgId: string;
  initiatedAt?: Date;
  receivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type IGetTransferByIdResponse = IApiResponseSuccess<ITransferDetailData>;

@Injectable()
export class GetTransferByIdUseCase {
  private readonly logger = new Logger(GetTransferByIdUseCase.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    request: IGetTransferByIdRequest
  ): Promise<Result<IGetTransferByIdResponse, DomainError>> {
    this.logger.log('Getting transfer by ID', {
      transferId: request.transferId,
      orgId: request.orgId,
    });

    const transfer = await this.prisma.transfer.findFirst({
      where: { id: request.transferId, orgId: request.orgId },
      include: {
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        lines: {
          include: {
            product: { select: { name: true, sku: true } },
          },
        },
      },
    });

    if (!transfer) {
      return err(new NotFoundError('Transfer not found', TRANSFER_NOT_FOUND));
    }

    return ok({
      success: true,
      message: 'Transfer retrieved successfully',
      data: {
        id: transfer.id,
        fromWarehouseId: transfer.fromWarehouseId,
        fromWarehouseName: transfer.fromWarehouse.name,
        toWarehouseId: transfer.toWarehouseId,
        toWarehouseName: transfer.toWarehouse.name,
        status: transfer.status,
        createdBy: transfer.createdBy,
        receivedBy: transfer.receivedBy ?? undefined,
        note: transfer.note ?? undefined,
        linesCount: transfer.lines.length,
        lines: transfer.lines.map(line => ({
          id: line.id,
          productId: line.productId,
          productName: line.product.name,
          productSku: line.product.sku,
          quantity: line.quantity,
          fromLocationId: line.fromLocationId ?? undefined,
          toLocationId: line.toLocationId ?? undefined,
        })),
        orgId: transfer.orgId,
        initiatedAt: transfer.initiatedAt ?? undefined,
        receivedAt: transfer.receivedAt ?? undefined,
        createdAt: transfer.createdAt,
        updatedAt: transfer.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
