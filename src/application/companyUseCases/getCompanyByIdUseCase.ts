import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, err, NotFoundError, ok, Result } from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ICompanyData } from './getCompaniesUseCase';
import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

export interface IGetCompanyByIdRequest {
  companyId: string;
  orgId: string;
}

export type IGetCompanyByIdResponse = IApiResponseSuccess<ICompanyData>;

@Injectable()
export class GetCompanyByIdUseCase {
  private readonly logger = new Logger(GetCompanyByIdUseCase.name);

  constructor(
    @Inject('CompanyRepository') private readonly companyRepository: ICompanyRepository
  ) {}

  async execute(
    request: IGetCompanyByIdRequest
  ): Promise<Result<IGetCompanyByIdResponse, DomainError>> {
    this.logger.log('Getting company by ID', {
      companyId: request.companyId,
      orgId: request.orgId,
    });

    const company = await this.companyRepository.findById(request.companyId, request.orgId);

    if (!company) {
      return err(new NotFoundError('Company not found'));
    }

    const productCount = await this.companyRepository.countProducts(company.id, request.orgId);

    return ok({
      success: true,
      message: 'Company retrieved successfully',
      data: {
        id: company.id,
        name: company.name,
        code: company.code,
        description: company.description,
        isActive: company.isActive,
        productCount,
        createdAt: company.createdAt,
        updatedAt: company.updatedAt,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
