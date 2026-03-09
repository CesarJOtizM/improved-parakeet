import { DeleteCompanyUseCase } from '@application/companyUseCases/deleteCompanyUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Company } from '@inventory/companies/domain/entities/company.entity';
import {
  BusinessRuleError,
  NotFoundError,
  ValidationError,
} from '@shared/domain/result/domainError';

import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

describe('DeleteCompanyUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: DeleteCompanyUseCase;
  let mockCompanyRepository: jest.Mocked<ICompanyRepository>;

  const createMockCompany = () =>
    Company.reconstitute(
      {
        name: 'Acme Corp',
        code: 'ACME',
        description: 'A test company',
        isActive: true,
      },
      'company-1',
      mockOrgId
    );

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

    useCase = new DeleteCompanyUseCase(mockCompanyRepository);
  });

  it('Given: existing company with no products When: deleting Then: should return success', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.countProducts.mockResolvedValue(0);
    mockCompanyRepository.delete.mockResolvedValue(undefined);

    const result = await useCase.execute({ companyId: 'company-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.message).toBe('Company deleted successfully');
        expect(value.data.id).toBe('company-1');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockCompanyRepository.delete).toHaveBeenCalledWith('company-1', mockOrgId);
  });

  it('Given: non-existent company When: deleting Then: should return NotFoundError', async () => {
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

  it('Given: company with associated products When: deleting Then: should return BusinessRuleError', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.countProducts.mockResolvedValue(5);

    const result = await useCase.execute({ companyId: 'company-1', orgId: mockOrgId });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect(error.code).toBe('COMPANY_HAS_PRODUCTS');
        expect(error.message).toContain('5 associated products');
      }
    );
    expect(mockCompanyRepository.delete).not.toHaveBeenCalled();
  });

  it('Given: unknown error When: deleting Then: should return ValidationError', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.countProducts.mockResolvedValue(0);
    mockCompanyRepository.delete.mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({ companyId: 'company-1', orgId: mockOrgId });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe('COMPANY_DELETE_ERROR');
      }
    );
  });

  it('Given: non-Error thrown When: deleting Then: should return ValidationError', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.countProducts.mockResolvedValue(0);
    mockCompanyRepository.delete.mockRejectedValue('string error');

    const result = await useCase.execute({ companyId: 'company-1', orgId: mockOrgId });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe('COMPANY_DELETE_ERROR');
      }
    );
  });
});
