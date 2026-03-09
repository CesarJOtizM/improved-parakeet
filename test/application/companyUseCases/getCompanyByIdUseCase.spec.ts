import { GetCompanyByIdUseCase } from '@application/companyUseCases/getCompanyByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Company } from '@inventory/companies/domain/entities/company.entity';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

describe('GetCompanyByIdUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetCompanyByIdUseCase;
  let mockCompanyRepository: jest.Mocked<ICompanyRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCompanyRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByCode: jest.fn(),
      findByName: jest.fn(),
      existsByCode: jest.fn(),
      existsByName: jest.fn(),
      countProducts: jest.fn(),
    } as jest.Mocked<ICompanyRepository>;

    useCase = new GetCompanyByIdUseCase(mockCompanyRepository);
  });

  it('Given: existing company When: getting by ID Then: should return company data', async () => {
    const company = Company.reconstitute(
      {
        name: 'Acme Corp',
        code: 'ACME',
        description: 'Main company',
        isActive: true,
      },
      'company-1',
      mockOrgId
    );
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.countProducts.mockResolvedValue(3);

    const result = await useCase.execute({ companyId: 'company-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.name).toBe('Acme Corp');
        expect(value.data.code).toBe('ACME');
        expect(value.data.description).toBe('Main company');
        expect(value.data.isActive).toBe(true);
        expect(value.data.productCount).toBe(3);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: existing company with no description When: getting by ID Then: should return undefined description', async () => {
    const company = Company.reconstitute(
      {
        name: 'Acme Corp',
        code: 'ACME',
        isActive: true,
      },
      'company-1',
      mockOrgId
    );
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ companyId: 'company-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.description).toBeUndefined();
        expect(value.data.productCount).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: non-existent company When: getting by ID Then: should return NotFoundError', async () => {
    mockCompanyRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({ companyId: 'non-existent', orgId: mockOrgId });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.code).toBe('COMPANY_NOT_FOUND');
      }
    );
  });
});
