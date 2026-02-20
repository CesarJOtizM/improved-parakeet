import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';

export interface IUpdateReorderRuleRequest {
  id: string;
  orgId: string;
  minQty?: number;
  maxQty?: number;
  safetyQty?: number;
}

export interface IReorderRuleData {
  id: string;
  productId: string;
  warehouseId: string;
  minQty: number;
  maxQty: number;
  safetyQty: number;
}

export type IUpdateReorderRuleResponse = IApiResponseSuccess<IReorderRuleData>;

@Injectable()
export class UpdateReorderRuleUseCase {
  private readonly logger = new Logger(UpdateReorderRuleUseCase.name);

  constructor(
    @Inject('ReorderRuleRepository')
    private readonly reorderRuleRepository: IReorderRuleRepository
  ) {}

  async execute(
    request: IUpdateReorderRuleRequest
  ): Promise<Result<IUpdateReorderRuleResponse, DomainError>> {
    this.logger.log('Updating reorder rule', { id: request.id, orgId: request.orgId });

    try {
      const existing = await this.reorderRuleRepository.findById(request.id, request.orgId);

      if (!existing) {
        return err(new NotFoundError('Reorder rule not found', 'REORDER_RULE_NOT_FOUND'));
      }

      // Apply partial updates
      if (request.minQty !== undefined) {
        existing.updateMinQty(MinQuantity.create(request.minQty));
      }
      if (request.maxQty !== undefined) {
        existing.updateMaxQty(MaxQuantity.create(request.maxQty));
      }
      if (request.safetyQty !== undefined) {
        existing.updateSafetyQty(SafetyStock.create(request.safetyQty));
      }

      const saved = await this.reorderRuleRepository.update(existing);

      this.logger.log('Reorder rule updated successfully', { id: saved.id });

      return ok({
        success: true,
        message: 'Reorder rule updated successfully',
        data: {
          id: saved.id,
          productId: saved.productId,
          warehouseId: saved.warehouseId,
          minQty: saved.minQty.getNumericValue(),
          maxQty: saved.maxQty.getNumericValue(),
          safetyQty: saved.safetyQty.getNumericValue(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error updating reorder rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return err(
        new ValidationError(
          error instanceof Error ? error.message : 'Failed to update reorder rule',
          'REORDER_RULE_UPDATE_ERROR'
        )
      );
    }
  }
}
