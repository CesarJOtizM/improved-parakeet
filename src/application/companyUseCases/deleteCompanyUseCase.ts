import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  BusinessRuleError,
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

export interface IDeleteCompanyRequest {
  companyId: string;
  orgId: string;
}

export type IDeleteCompanyResponse = IApiResponseSuccess<{ id: string }>;

@Injectable()
export class DeleteCompanyUseCase {
  private readonly logger = new Logger(DeleteCompanyUseCase.name);

  constructor(
    @Inject('CompanyRepository') private readonly companyRepository: ICompanyRepository
  ) {}

  async execute(
    request: IDeleteCompanyRequest
  ): Promise<Result<IDeleteCompanyResponse, DomainError>> {
    this.logger.log('Deleting company', { companyId: request.companyId, orgId: request.orgId });

    try {
      const company = await this.companyRepository.findById(request.companyId, request.orgId);
      if (!company) {
        return err(new NotFoundError('Company not found'));
      }

      // Check for associated products
      const productCount = await this.companyRepository.countProducts(
        request.companyId,
        request.orgId
      );
      if (productCount > 0) {
        return err(
          new BusinessRuleError(
            `Cannot delete company with ${productCount} associated products. Reassign products first.`,
            'COMPANY_HAS_PRODUCTS'
          )
        );
      }

      await this.companyRepository.delete(request.companyId, request.orgId);

      return ok({
        success: true,
        message: 'Company deleted successfully',
        data: { id: request.companyId },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error deleting company', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return err(new ValidationError('Failed to delete company', 'COMPANY_DELETE_ERROR'));
    }
  }
}
