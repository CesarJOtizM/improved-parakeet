import { UpdateCompanyUseCase } from '@application/companyUseCases/updateCompanyUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Company } from '@inventory/companies/domain/entities/company.entity';
import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

describe('UpdateCompanyUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: UpdateCompanyUseCase;
  let mockCompanyRepository: jest.Mocked<ICompanyRepository>;

  const createMockCompany = () =>
    Company.reconstitute(
      {
        name: 'Acme Corp',
        code: 'ACME',
        description: 'Original description',
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

    useCase = new UpdateCompanyUseCase(mockCompanyRepository);
  });

  it('Given: existing company When: updating name Then: should return success', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.existsByName.mockResolvedValue(false);
    mockCompanyRepository.save.mockImplementation(async c => c);
    mockCompanyRepository.countProducts.mockResolvedValue(2);

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      name: 'Beta Inc',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.name).toBe('Beta Inc');
        expect(value.data.productCount).toBe(2);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: existing company When: updating code Then: should return success', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.existsByCode.mockResolvedValue(false);
    mockCompanyRepository.save.mockImplementation(async c => c);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      code: 'BETA',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.code).toBe('BETA');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: existing company When: updating description and isActive Then: should return success', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.save.mockImplementation(async c => c);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      description: 'Updated description',
      isActive: false,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.description).toBe('Updated description');
        expect(value.data.isActive).toBe(false);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: non-existent company When: updating Then: should return NotFoundError', async () => {
    mockCompanyRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      companyId: 'non-existent',
      orgId: mockOrgId,
      name: 'Beta Inc',
    });

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

  it('Given: changing name to existing one When: updating Then: should return ConflictError', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.existsByName.mockResolvedValue(true);

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      name: 'Existing Corp',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ConflictError);
        expect(error.code).toBe('COMPANY_NAME_CONFLICT');
      }
    );
  });

  it('Given: changing code to existing one When: updating Then: should return ConflictError', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.existsByCode.mockResolvedValue(true);

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      code: 'EXISTING',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ConflictError);
        expect(error.code).toBe('COMPANY_CODE_CONFLICT');
      }
    );
  });

  it('Given: keeping same name When: updating Then: should skip name uniqueness check', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.save.mockImplementation(async c => c);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      name: 'Acme Corp', // same as existing
    });

    expect(result.isOk()).toBe(true);
    expect(mockCompanyRepository.existsByName).not.toHaveBeenCalled();
  });

  it('Given: keeping same code When: updating Then: should skip code uniqueness check', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.save.mockImplementation(async c => c);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      code: 'ACME', // same as existing
    });

    expect(result.isOk()).toBe(true);
    expect(mockCompanyRepository.existsByCode).not.toHaveBeenCalled();
  });

  it('Given: Prisma P2002 error When: updating Then: should return ConflictError', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.save.mockRejectedValue({ code: 'P2002' });

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      name: 'Beta Inc',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ConflictError);
        expect(error.code).toBe('COMPANY_CONFLICT');
      }
    );
  });

  it('Given: unknown error When: updating Then: should return ValidationError', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.save.mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      name: 'Beta Inc',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe('COMPANY_UPDATE_ERROR');
        expect(error.message).toContain('DB error');
      }
    );
  });

  it('Given: non-Error thrown When: updating Then: should handle unknown error type', async () => {
    const company = createMockCompany();
    mockCompanyRepository.findById.mockResolvedValue(company);
    mockCompanyRepository.save.mockRejectedValue('string error');

    const result = await useCase.execute({
      companyId: 'company-1',
      orgId: mockOrgId,
      name: 'Beta Inc',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error.message).toContain('Unknown error');
      }
    );
  });
});
