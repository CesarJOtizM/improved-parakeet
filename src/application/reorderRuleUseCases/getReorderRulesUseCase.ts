import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';

export interface IGetReorderRulesRequest {
  orgId: string;
}

export interface IReorderRuleData {
  id: string;
  productId: string;
  warehouseId: string;
  minQty: number;
  maxQty: number;
  safetyQty: number;
}

export type IGetReorderRulesResponse = IApiResponseSuccess<IReorderRuleData[]>;

@Injectable()
export class GetReorderRulesUseCase {
  private readonly logger = new Logger(GetReorderRulesUseCase.name);

  constructor(
    @Inject('ReorderRuleRepository')
    private readonly reorderRuleRepository: IReorderRuleRepository
  ) {}

  async execute(
    request: IGetReorderRulesRequest
  ): Promise<Result<IGetReorderRulesResponse, DomainError>> {
    this.logger.log('Getting reorder rules', { orgId: request.orgId });

    const rules = await this.reorderRuleRepository.findAll(request.orgId);

    const data: IReorderRuleData[] = rules.map(rule => ({
      id: rule.id,
      productId: rule.productId,
      warehouseId: rule.warehouseId,
      minQty: rule.minQty.getNumericValue(),
      maxQty: rule.maxQty.getNumericValue(),
      safetyQty: rule.safetyQty.getNumericValue(),
    }));

    this.logger.log('Reorder rules retrieved successfully', { count: data.length });

    return ok({
      success: true,
      message: 'Reorder rules retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    });
  }
}
