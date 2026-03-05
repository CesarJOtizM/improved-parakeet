import { Inject, Injectable, Logger } from '@nestjs/common';
import { REORDER_RULE_DELETE_ERROR, REORDER_RULE_NOT_FOUND } from '@shared/constants/error-codes';
import {
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { IReorderRuleRepository } from '@stock/domain/ports/repositories/iReorderRuleRepository.port';

export interface IDeleteReorderRuleRequest {
  id: string;
  orgId: string;
}

export type IDeleteReorderRuleResponse = IApiResponseSuccess<{ deleted: true }>;

@Injectable()
export class DeleteReorderRuleUseCase {
  private readonly logger = new Logger(DeleteReorderRuleUseCase.name);

  constructor(
    @Inject('ReorderRuleRepository')
    private readonly reorderRuleRepository: IReorderRuleRepository
  ) {}

  async execute(
    request: IDeleteReorderRuleRequest
  ): Promise<Result<IDeleteReorderRuleResponse, DomainError>> {
    this.logger.log('Deleting reorder rule', { id: request.id, orgId: request.orgId });

    try {
      const existing = await this.reorderRuleRepository.findById(request.id, request.orgId);

      if (!existing) {
        return err(new NotFoundError('Reorder rule not found', REORDER_RULE_NOT_FOUND));
      }

      await this.reorderRuleRepository.delete(request.id, request.orgId);

      this.logger.log('Reorder rule deleted successfully', { id: request.id });

      return ok({
        success: true,
        message: 'Reorder rule deleted successfully',
        data: { deleted: true },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error deleting reorder rule', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return err(
        new ValidationError(
          error instanceof Error ? error.message : 'Failed to delete reorder rule',
          REORDER_RULE_DELETE_ERROR
        )
      );
    }
  }
}
