import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  REORDER_RULE_CONFLICT,
  REORDER_RULE_CREATION_ERROR,
  REORDER_RULE_INVALID_QUANTITIES,
} from '@shared/constants/error-codes';
import {
  ConflictError,
  DomainError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';
import { ReorderRule } from '@stock/domain/entities/reorderRule.entity';
import { MaxQuantity } from '@stock/domain/valueObjects/maxQuantity.valueObject';
import { MinQuantity } from '@stock/domain/valueObjects/minQuantity.valueObject';
import { SafetyStock } from '@stock/domain/valueObjects/safetyStock.valueObject';

import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';

export interface ICreateReorderRuleRequest {
  productId: string;
  warehouseId: string;
  minQty: number;
  maxQty: number;
  safetyQty: number;
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

export type ICreateReorderRuleResponse = IApiResponseSuccess<IReorderRuleData>;

@Injectable()
export class CreateReorderRuleUseCase {
  private readonly logger = new Logger(CreateReorderRuleUseCase.name);

  constructor(
    @Inject('ReorderRuleRepository')
    private readonly reorderRuleRepository: IReorderRuleRepository
  ) {}

  async execute(
    request: ICreateReorderRuleRequest
  ): Promise<Result<ICreateReorderRuleResponse, DomainError>> {
    this.logger.log('Creating reorder rule', {
      productId: request.productId,
      warehouseId: request.warehouseId,
      orgId: request.orgId,
    });

    try {
      // Validate maxQty > minQty
      if (request.maxQty <= request.minQty) {
        return err(
          new ValidationError(
            'Maximum quantity must be greater than minimum quantity',
            REORDER_RULE_INVALID_QUANTITIES
          )
        );
      }

      // Check for existing rule (uniqueness)
      const existing = await this.reorderRuleRepository.findByProductAndWarehouse(
        request.productId,
        request.warehouseId,
        request.orgId
      );

      if (existing) {
        return err(
          new ConflictError(
            'A reorder rule already exists for this product and warehouse combination',
            REORDER_RULE_CONFLICT,
            { productId: request.productId, warehouseId: request.warehouseId }
          )
        );
      }

      // Create domain entity
      const rule = ReorderRule.create(
        {
          productId: request.productId,
          warehouseId: request.warehouseId,
          minQty: MinQuantity.create(request.minQty),
          maxQty: MaxQuantity.create(request.maxQty),
          safetyQty: SafetyStock.create(request.safetyQty),
        },
        request.orgId
      );

      const saved = await this.reorderRuleRepository.create(rule);

      this.logger.log('Reorder rule created successfully', { id: saved.id });

      return ok({
        success: true,
        message: 'Reorder rule created successfully',
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
      this.logger.error('Error creating reorder rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return err(
        new ValidationError(
          error instanceof Error ? error.message : 'Failed to create reorder rule',
          REORDER_RULE_CREATION_ERROR
        )
      );
    }
  }
}
