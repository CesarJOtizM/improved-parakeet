import { PrismaService } from '@infrastructure/database/prisma.service';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ISaleRepository } from '@sale/domain/repositories/saleRepository.interface';

export interface IGetSaleSwapsRequest {
  saleId: string;
  orgId: string;
}

export interface ISwapItem {
  id: string;
  saleId: string;
  originalLineId: string;
  newLineId: string | null;
  originalProductId: string;
  originalProductName: string;
  originalProductSku: string;
  replacementProductId: string;
  replacementProductName: string;
  replacementProductSku: string;
  originalQuantity: number;
  replacementQuantity: number;
  originalSalePrice: number;
  replacementSalePrice: number;
  originalCurrency: string;
  replacementCurrency: string;
  pricingStrategy: string;
  isCrossWarehouse: boolean;
  reason: string | null;
  performedBy: string;
  performedByName: string;
  createdAt: string;
}

export type IGetSaleSwapsResponse = IApiResponseSuccess<ISwapItem[]>;

@Injectable()
export class GetSaleSwapsUseCase {
  private readonly logger = new Logger(GetSaleSwapsUseCase.name);

  constructor(
    @Inject('SaleRepository')
    private readonly saleRepository: ISaleRepository,
    private readonly prisma: PrismaService
  ) {}

  async execute(
    request: IGetSaleSwapsRequest
  ): Promise<Result<IGetSaleSwapsResponse, DomainError>> {
    this.logger.log('Getting swap history for sale', {
      saleId: request.saleId,
      orgId: request.orgId,
    });

    // Validate sale exists
    const sale = await this.saleRepository.findById(request.saleId, request.orgId);
    if (!sale) {
      return err(new NotFoundError(`Sale with ID ${request.saleId} not found`));
    }

    // Query swap records with product relations
    const swaps = await this.prisma.saleLineSwap.findMany({
      where: {
        saleId: request.saleId,
        orgId: request.orgId,
      },
      include: {
        originalProduct: {
          select: { name: true, sku: true },
        },
        replacementProduct: {
          select: { name: true, sku: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Resolve performedBy user names
    const uniqueUserIds = [...new Set(swaps.map(s => s.performedBy))];
    const userMap = new Map<string, string>();

    for (const userId of uniqueUserIds) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true },
        });
        if (user) {
          userMap.set(userId, `${user.firstName} ${user.lastName}`.trim());
        }
      } catch {
        this.logger.warn('Could not resolve user name', { userId });
      }
    }

    const data: ISwapItem[] = swaps.map(swap => ({
      id: swap.id,
      saleId: swap.saleId,
      originalLineId: swap.originalLineId,
      newLineId: swap.newLineId,
      originalProductId: swap.originalProductId,
      originalProductName: swap.originalProduct.name,
      originalProductSku: swap.originalProduct.sku,
      replacementProductId: swap.replacementProductId,
      replacementProductName: swap.replacementProduct.name,
      replacementProductSku: swap.replacementProduct.sku,
      originalQuantity: Number(swap.originalQuantity),
      replacementQuantity: Number(swap.replacementQuantity),
      originalSalePrice: Number(swap.originalSalePrice),
      replacementSalePrice: Number(swap.replacementSalePrice),
      originalCurrency: swap.originalCurrency,
      replacementCurrency: swap.replacementCurrency,
      pricingStrategy: swap.pricingStrategy,
      isCrossWarehouse: swap.isCrossWarehouse,
      reason: swap.reason,
      performedBy: swap.performedBy,
      performedByName: userMap.get(swap.performedBy) || swap.performedBy,
      createdAt: swap.createdAt.toISOString(),
    }));

    return ok({
      success: true,
      message: 'Swap history retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
