import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SaleMapper, ISaleResponseData } from '@sale/mappers';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IProductRepository } from '@product/domain/ports/repositories/iProductRepository.port';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface IGetSaleByIdRequest {
  id: string;
  orgId: string;
}

export type IGetSaleByIdResponse = IApiResponseSuccess<ISaleResponseData>;

@Injectable()
export class GetSaleByIdUseCase {
  private readonly logger = new Logger(GetSaleByIdUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    @Inject('WarehouseRepository')
    private readonly warehouseRepository: IWarehouseRepository,
    @Inject('ProductRepository')
    private readonly productRepository: IProductRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(request: IGetSaleByIdRequest): Promise<Result<IGetSaleByIdResponse, DomainError>> {
    this.logger.log('Getting sale by ID', { saleId: request.id, orgId: request.orgId });

    const sale = await this.saleRepository.findById(request.id, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.id} not found`));
    }

    const responseData = SaleMapper.toResponseData(sale, true);

    // Resolve warehouse name
    try {
      const warehouse = await this.warehouseRepository.findById(sale.warehouseId, request.orgId);
      if (warehouse) {
        responseData.warehouseName = `${warehouse.name} (${warehouse.code.getValue()})`;
      }
    } catch {
      this.logger.warn('Could not resolve warehouse name', { warehouseId: sale.warehouseId });
    }

    // Resolve product names in lines
    if (responseData.lines && responseData.lines.length > 0) {
      const uniqueProductIds = [...new Set(responseData.lines.map(l => l.productId))];
      const productMap = new Map<string, { name: string; sku: string }>();

      for (const productId of uniqueProductIds) {
        try {
          const product = await this.productRepository.findById(productId, request.orgId);
          if (product) {
            productMap.set(productId, {
              name: product.name.getValue(),
              sku: product.sku.getValue(),
            });
          }
        } catch {
          this.logger.warn('Could not resolve product', { productId });
        }
      }

      for (const line of responseData.lines) {
        const product = productMap.get(line.productId);
        if (product) {
          line.productName = product.name;
          line.productSku = product.sku;
        }
      }
    }

    // Resolve confirmedBy/cancelledBy user names
    responseData.confirmedByName = await this.resolveUserName(responseData.confirmedBy);
    responseData.cancelledByName = await this.resolveUserName(responseData.cancelledBy);

    return ok({
      success: true,
      message: 'Sale retrieved successfully',
      data: responseData,
      timestamp: new Date().toISOString(),
    });
  }

  private async resolveUserName(userId?: string | null): Promise<string | undefined> {
    if (!userId) return undefined;
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) {
        return `${user.firstName} ${user.lastName}`.trim();
      }
    } catch {
      this.logger.warn('Could not resolve user name', { userId });
    }
    return undefined;
  }
}
