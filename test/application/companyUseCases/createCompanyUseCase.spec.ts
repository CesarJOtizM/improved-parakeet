import { CreateCompanyUseCase } from '@application/companyUseCases/createCompanyUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictError, ValidationError } from '@shared/domain/result/domainError';

import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

describe('CreateCompanyUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: CreateCompanyUseCase;
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

    useCase = new CreateCompanyUseCase(mockCompanyRepository);
  });

  it('Given: valid data When: creating company Then: should return success', async () => {
    mockCompanyRepository.existsByCode.mockResolvedValue(false);
    mockCompanyRepository.existsByName.mockResolvedValue(false);
    mockCompanyRepository.save.mockImplementation(async c => c);

    const result = await useCase.execute({
      name: 'Acme Corp',
      code: 'ACME',
      description: 'A test company',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.message).toBe('Company created successfully');
        expect(value.data.name).toBe('Acme Corp');
        expect(value.data.code).toBe('ACME');
        expect(value.data.description).toBe('A test company');
        expect(value.data.isActive).toBe(true);
        expect(value.data.productCount).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: no description provided When: creating company Then: should succeed with undefined description', async () => {
    mockCompanyRepository.existsByCode.mockResolvedValue(false);
    mockCompanyRepository.existsByName.mockResolvedValue(false);
    mockCompanyRepository.save.mockImplementation(async c => c);

    const result = await useCase.execute({
      name: 'Acme Corp',
      code: 'ACME',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.description).toBeUndefined();
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: duplicate code When: creating company Then: should return ConflictError', async () => {
    mockCompanyRepository.existsByCode.mockResolvedValue(true);

    const result = await useCase.execute({
      name: 'Acme Corp',
      code: 'ACME',
      orgId: mockOrgId,
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

  it('Given: duplicate name When: creating company Then: should return ConflictError', async () => {
    mockCompanyRepository.existsByCode.mockResolvedValue(false);
    mockCompanyRepository.existsByName.mockResolvedValue(true);

    const result = await useCase.execute({
      name: 'Acme Corp',
      code: 'ACME',
      orgId: mockOrgId,
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

  it('Given: Prisma P2002 error When: creating company Then: should return ConflictError', async () => {
    mockCompanyRepository.existsByCode.mockResolvedValue(false);
    mockCompanyRepository.existsByName.mockResolvedValue(false);
    mockCompanyRepository.save.mockRejectedValue({ code: 'P2002' });

    const result = await useCase.execute({
      name: 'Acme Corp',
      code: 'ACME',
      orgId: mockOrgId,
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

  it('Given: unknown error When: creating company Then: should return ValidationError', async () => {
    mockCompanyRepository.existsByCode.mockResolvedValue(false);
    mockCompanyRepository.existsByName.mockResolvedValue(false);
    mockCompanyRepository.save.mockRejectedValue(new Error('DB connection lost'));

    const result = await useCase.execute({
      name: 'Acme Corp',
      code: 'ACME',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe('COMPANY_CREATION_ERROR');
        expect(error.message).toContain('DB connection lost');
      }
    );
  });

  it('Given: non-Error thrown When: creating company Then: should handle unknown error type', async () => {
    mockCompanyRepository.existsByCode.mockResolvedValue(false);
    mockCompanyRepository.existsByName.mockResolvedValue(false);
    mockCompanyRepository.save.mockRejectedValue('string error');

    const result = await useCase.execute({
      name: 'Acme Corp',
      code: 'ACME',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Unknown error');
      }
    );
  });
});
