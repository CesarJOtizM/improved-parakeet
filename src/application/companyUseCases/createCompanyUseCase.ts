import { Inject, Injectable, Logger } from '@nestjs/common';
import { Company } from '@inventory/companies/domain/entities/company.entity';
import {
  COMPANY_CODE_CONFLICT,
  COMPANY_CONFLICT,
  COMPANY_CREATION_ERROR,
  COMPANY_NAME_CONFLICT,
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

import type { ICompanyData } from './getCompaniesUseCase';
import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

export interface ICreateCompanyRequest {
  name: string;
  code: string;
  description?: string;
  orgId: string;
}

export type ICreateCompanyResponse = IApiResponseSuccess<ICompanyData>;

@Injectable()
export class CreateCompanyUseCase {
  private readonly logger = new Logger(CreateCompanyUseCase.name);

  constructor(
    @Inject('CompanyRepository') private readonly companyRepository: ICompanyRepository
  ) {}

  async execute(
    request: ICreateCompanyRequest
  ): Promise<Result<ICreateCompanyResponse, DomainError>> {
    this.logger.log('Creating company', { name: request.name, orgId: request.orgId });

    try {
      // Validate code uniqueness
      const codeExists = await this.companyRepository.existsByCode(request.code, request.orgId);
      if (codeExists) {
        return err(
          new ConflictError('A company with this code already exists', COMPANY_CODE_CONFLICT)
        );
      }

      // Validate name uniqueness
      const nameExists = await this.companyRepository.existsByName(request.name, request.orgId);
      if (nameExists) {
        return err(
          new ConflictError('A company with this name already exists', COMPANY_NAME_CONFLICT)
        );
      }

      const company = Company.create(
        {
          name: request.name,
          code: request.code,
          description: request.description,
        },
        request.orgId
      );

      const saved = await this.companyRepository.save(company);

      return ok({
        success: true,
        message: 'Company created successfully',
        data: {
          id: saved.id,
          name: saved.name,
          code: saved.code,
          description: saved.description,
          isActive: saved.isActive,
          productCount: 0,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error creating company', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: request.name,
        orgId: request.orgId,
      });

      if (error && typeof error === 'object' && 'code' in error) {
        const prismaError = error as { code: string };
        if (prismaError.code === 'P2002') {
          return err(
            new ConflictError(
              'A company with this code or name already exists in this organization',
              COMPANY_CONFLICT
            )
          );
        }
      }

      return err(
        new ValidationError(
          `Failed to create company: ${error instanceof Error ? error.message : 'Unknown error'}`,
          COMPANY_CREATION_ERROR
        )
      );
    }
  }
}
