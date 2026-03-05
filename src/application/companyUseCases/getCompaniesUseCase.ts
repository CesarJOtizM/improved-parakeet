import { QueryPagination } from '@infrastructure/database/utils/queryOptimizer';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainError, ok, Result } from '@shared/domain/result';
import { IPaginatedResponse } from '@shared/types/apiResponse.types';

import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

export interface IGetCompaniesRequest {
  orgId: string;
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ICompanyData {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  productCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type IGetCompaniesResponse = IPaginatedResponse<ICompanyData>;

@Injectable()
export class GetCompaniesUseCase {
  private readonly logger = new Logger(GetCompaniesUseCase.name);

  constructor(
    @Inject('CompanyRepository') private readonly companyRepository: ICompanyRepository
  ) {}

  async execute(
    request: IGetCompaniesRequest
  ): Promise<Result<IGetCompaniesResponse, DomainError>> {
    this.logger.log('Getting companies', { orgId: request.orgId });

    const page = request.page || 1;
    const limit = request.limit || 10;
    const { skip, take } = QueryPagination.fromPage(page, limit);

    let companies = await this.companyRepository.findAll(request.orgId);

    // Apply filters
    if (request.isActive !== undefined) {
      companies = companies.filter(c => c.isActive === request.isActive);
    }

    if (request.search) {
      const searchLower = request.search.toLowerCase();
      companies = companies.filter(
        c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.code.toLowerCase().includes(searchLower) ||
          c.description?.toLowerCase().includes(searchLower)
      );
    }

    const total = companies.length;
    const paginatedCompanies = companies.slice(skip, skip + take);

    // Count products per company
    const productCountMap = new Map<string, number>();
    for (const company of paginatedCompanies) {
      const count = await this.companyRepository.countProducts(company.id, request.orgId);
      productCountMap.set(company.id, count);
    }

    const data: ICompanyData[] = paginatedCompanies.map(company => ({
      id: company.id,
      name: company.name,
      code: company.code,
      description: company.description,
      isActive: company.isActive,
      productCount: productCountMap.get(company.id) || 0,
      createdAt: company.createdAt,
      updatedAt: company.updatedAt,
    }));

    // Apply sorting
    if (request.sortBy) {
      const sortOrder = request.sortOrder || 'asc';
      data.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (request.sortBy) {
          case 'name':
            aValue = a.name;
            bValue = b.name;
            break;
          case 'code':
            aValue = a.code;
            bValue = b.code;
            break;
          case 'isActive':
            aValue = a.isActive ? 1 : 0;
            bValue = b.isActive ? 1 : 0;
            break;
          case 'productCount':
            aValue = a.productCount;
            bValue = b.productCount;
            break;
          case 'updatedAt':
            aValue = a.updatedAt.getTime();
            bValue = b.updatedAt.getTime();
            break;
          case 'createdAt':
          default:
            aValue = a.createdAt.getTime();
            bValue = b.createdAt.getTime();
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const totalPages = Math.ceil(total / limit);

    return ok({
      success: true,
      message: 'Companies retrieved successfully',
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      timestamp: new Date().toISOString(),
    });
  }
}
