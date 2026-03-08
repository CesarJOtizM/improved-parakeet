import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { SaleMapper, ISaleResponseData } from '@sale/mappers';
import { SALE_NOT_FOUND } from '@shared/constants/error-codes';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IOrganizationRepository } from '@organization/domain/repositories';
import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';
import type { IProductRepository } from '@product/domain/ports/repositories/iProductRepository.port';
import type { IWarehouseRepository } from '@warehouse/domain/repositories/warehouseRepository.interface';

export interface IGetSaleByIdRequest {
  id: string;
  orgId: string;
}

export type IGetSaleByIdResponse = IApiResponseSuccess<
  ISaleResponseData & { pickingEnabled: boolean }
>;

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
    @Inject('OrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(request: IGetSaleByIdRequest): Promise<Result<IGetSaleByIdResponse, DomainError>> {
    this.logger.log('Getting sale by ID', { saleId: request.id, orgId: request.orgId });

    const sale = await this.saleRepository.findById(request.id, request.orgId);

    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.id} not found`, SALE_NOT_FOUND));
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

    // Resolve contact name
    if (sale.contactId) {
      try {
        const contact = await this.prisma.contact.findUnique({
          where: { id: sale.contactId },
          select: { name: true },
        });
        if (contact) {
          responseData.contactName = contact.name;
        }
      } catch {
        this.logger.warn('Could not resolve contact name', { contactId: sale.contactId });
      }
    }

    // Resolve product names in lines
    if (responseData.lines && responseData.lines.length > 0) {
      const uniqueProductIds = [...new Set(responseData.lines.map(l => l.productId))];
      const productMap = new Map<string, { name: string; sku: string; barcode?: string }>();

      for (const productId of uniqueProductIds) {
        try {
          const product = await this.productRepository.findById(productId, request.orgId);
          if (product) {
            productMap.set(productId, {
              name: product.name.getValue(),
              sku: product.sku.getValue(),
              barcode: product.barcode,
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
          line.productBarcode = product.barcode;
        }
      }
    }

    // Resolve user names for traceability
    responseData.createdByName = await this.resolveUserName(responseData.createdBy);
    responseData.confirmedByName = await this.resolveUserName(responseData.confirmedBy);
    responseData.cancelledByName = await this.resolveUserName(responseData.cancelledBy);
    responseData.pickedByName = await this.resolveUserName(responseData.pickedBy);
    responseData.shippedByName = await this.resolveUserName(responseData.shippedBy);
    responseData.completedByName = await this.resolveUserName(responseData.completedBy);
    responseData.returnedByName = await this.resolveUserName(responseData.returnedBy);

    // Include pickingEnabled from org settings
    let pickingEnabled = false;
    try {
      const org = await this.organizationRepository.findById(request.orgId);
      if (org) {
        pickingEnabled = !!org.getSetting('pickingEnabled');
      }
    } catch {
      this.logger.warn('Could not resolve org settings', { orgId: request.orgId });
    }

    return ok({
      success: true,
      message: 'Sale retrieved successfully',
      data: { ...responseData, pickingEnabled },
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
