import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  ConflictError,
  DomainError,
  NotFoundError,
  Result,
  ValidationError,
  err,
  ok,
} from '@shared/domain/result';
import { IApiResponseSuccess } from '@shared/types/apiResponse.types';

import type { ICompanyData } from './getCompaniesUseCase';
import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

export interface IUpdateCompanyRequest {
  companyId: string;
  orgId: string;
  name?: string;
  code?: string;
  description?: string;
  isActive?: boolean;
}

export type IUpdateCompanyResponse = IApiResponseSuccess<ICompanyData>;

@Injectable()
export class UpdateCompanyUseCase {
  private readonly logger = new Logger(UpdateCompanyUseCase.name);

  constructor(
    @Inject('CompanyRepository') private readonly companyRepository: ICompanyRepository
  ) {}

  async execute(
    request: IUpdateCompanyRequest
  ): Promise<Result<IUpdateCompanyResponse, DomainError>> {
    this.logger.log('Updating company', { companyId: request.companyId, orgId: request.orgId });

    try {
      const company = await this.companyRepository.findById(request.companyId, request.orgId);
      if (!company) {
        return err(new NotFoundError('Company not found'));
      }

      // Validate name uniqueness if changing name
      if (request.name && request.name !== company.name) {
        const nameExists = await this.companyRepository.existsByName(request.name, request.orgId);
        if (nameExists) {
          return err(
            new ConflictError('A company with this name already exists', 'COMPANY_NAME_CONFLICT')
          );
        }
      }

      // Validate code uniqueness if changing code
      if (request.code && request.code !== company.code) {
        const codeExists = await this.companyRepository.existsByCode(request.code, request.orgId);
        if (codeExists) {
          return err(
            new ConflictError('A company with this code already exists', 'COMPANY_CODE_CONFLICT')
          );
        }
      }

      company.update({
        name: request.name,
        code: request.code,
        description: request.description,
        isActive: request.isActive,
      });

      const saved = await this.companyRepository.save(company);
      const productCount = await this.companyRepository.countProducts(saved.id, request.orgId);

      return ok({
        success: true,
        message: 'Company updated successfully',
        data: {
          id: saved.id,
          name: saved.name,
          code: saved.code,
          description: saved.description,
          isActive: saved.isActive,
          productCount,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error updating company', {
        error: error instanceof Error ? error.message : 'Unknown error',
        companyId: request.companyId,
        orgId: request.orgId,
      });

      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string };
        if (prismaError.code === 'P2002') {
          return err(
            new ConflictError('A company with this code or name already exists', 'COMPANY_CONFLICT')
          );
        }
      }

      return err(
        new ValidationError(
          `Failed to update company: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'COMPANY_UPDATE_ERROR'
        )
      );
    }
  }
}
