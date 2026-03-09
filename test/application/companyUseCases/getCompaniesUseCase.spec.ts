import { GetCompaniesUseCase } from '@application/companyUseCases/getCompaniesUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Company } from '@inventory/companies/domain/entities/company.entity';

import type { ICompanyRepository } from '@inventory/companies/domain/ports/repositories/iCompanyRepository.port';

describe('GetCompaniesUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetCompaniesUseCase;
  let mockCompanyRepository: jest.Mocked<ICompanyRepository>;

  const createCompany = (
    overrides: Partial<{
      name: string;
      code: string;
      description: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
    id?: string
  ) =>
    Company.reconstitute(
      {
        name: overrides.name ?? 'Acme Corp',
        code: overrides.code ?? 'ACME',
        description: overrides.description,
        isActive: overrides.isActive ?? true,
      },
      id ?? 'company-1',
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

    useCase = new GetCompaniesUseCase(mockCompanyRepository);
  });

  it('Given: companies exist When: getting all Then: should return paginated companies', async () => {
    const companies = [createCompany({}, 'c-1'), createCompany({ name: 'Beta Inc' }, 'c-2')];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(2);
        expect(value.pagination.total).toBe(2);
        expect(value.pagination.page).toBe(1);
        expect(value.pagination.limit).toBe(10);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: filtering by isActive=true Then: should return only active', async () => {
    const companies = [
      createCompany({ isActive: true }, 'c-1'),
      createCompany({ isActive: false }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, isActive: true });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].isActive).toBe(true);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: filtering by isActive=false Then: should return only inactive', async () => {
    const companies = [
      createCompany({ isActive: true }, 'c-1'),
      createCompany({ isActive: false }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, isActive: false });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].isActive).toBe(false);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: searching by name Then: should return matching companies', async () => {
    const companies = [
      createCompany({ name: 'Acme Corp', code: 'ACME' }, 'c-1'),
      createCompany({ name: 'Beta Inc', code: 'BETA' }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, search: 'acme' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].name).toBe('Acme Corp');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: searching by code Then: should return matching companies', async () => {
    const companies = [
      createCompany({ name: 'Acme Corp', code: 'ACME' }, 'c-1'),
      createCompany({ name: 'Beta Inc', code: 'BETA' }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, search: 'BETA' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].code).toBe('BETA');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies with description When: searching by description Then: should return matching', async () => {
    const companies = [
      createCompany({ name: 'Acme', description: 'Main headquarters' }, 'c-1'),
      createCompany({ name: 'Beta', description: 'Branch office' }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, search: 'headquarters' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].name).toBe('Acme');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: sorting by name asc Then: should return sorted', async () => {
    const companies = [
      createCompany({ name: 'Zeta Corp' }, 'c-1'),
      createCompany({ name: 'Acme Corp' }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, sortBy: 'name', sortOrder: 'asc' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].name).toBe('Acme Corp');
        expect(value.data[1].name).toBe('Zeta Corp');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: sorting by name desc Then: should return reverse sorted', async () => {
    const companies = [
      createCompany({ name: 'Acme Corp' }, 'c-1'),
      createCompany({ name: 'Zeta Corp' }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, sortBy: 'name', sortOrder: 'desc' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].name).toBe('Zeta Corp');
        expect(value.data[1].name).toBe('Acme Corp');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: sorting by code Then: should sort correctly', async () => {
    const companies = [
      createCompany({ name: 'A', code: 'ZZZ' }, 'c-1'),
      createCompany({ name: 'B', code: 'AAA' }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({
      orgId: mockOrgId,
      sortBy: 'code',
      sortOrder: 'asc',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].code).toBe('AAA');
        expect(value.data[1].code).toBe('ZZZ');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: sorting by isActive Then: should sort correctly', async () => {
    const companies = [
      createCompany({ isActive: true }, 'c-1'),
      createCompany({ isActive: false }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({
      orgId: mockOrgId,
      sortBy: 'isActive',
      sortOrder: 'asc',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].isActive).toBe(false);
        expect(value.data[1].isActive).toBe(true);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: sorting by productCount Then: should sort correctly', async () => {
    const companies = [
      createCompany({ name: 'Many' }, 'c-1'),
      createCompany({ name: 'Few' }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockImplementation(async (companyId: string) => {
      return companyId === 'c-1' ? 10 : 2;
    });

    const result = await useCase.execute({
      orgId: mockOrgId,
      sortBy: 'productCount',
      sortOrder: 'asc',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].productCount).toBe(2);
        expect(value.data[1].productCount).toBe(10);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: sorting by updatedAt Then: should sort by date', async () => {
    const companies = [
      createCompany({ name: 'Newer' }, 'c-1'),
      createCompany({ name: 'Older' }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({
      orgId: mockOrgId,
      sortBy: 'updatedAt',
      sortOrder: 'asc',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(2);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: sorting by createdAt (default) Then: should sort by date', async () => {
    const companies = [createCompany({}, 'c-1'), createCompany({}, 'c-2')];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({
      orgId: mockOrgId,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(2);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies with equal sort values When: sorting Then: should return 0 for equal items', async () => {
    const companies = [
      createCompany({ name: 'Same' }, 'c-1'),
      createCompany({ name: 'Same' }, 'c-2'),
    ];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, sortBy: 'name', sortOrder: 'asc' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(2);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: unknown sortBy When: sorting Then: should use default createdAt sort', async () => {
    const companies = [createCompany({}, 'c-1')];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, sortBy: 'unknownField' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: using pagination Then: should respect page and limit', async () => {
    const companies = Array.from({ length: 15 }, (_, i) =>
      createCompany({ name: `Company ${i}`, code: `C${i}` }, `c-${i}`)
    );
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, page: 2, limit: 5 });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(5);
        expect(value.pagination.page).toBe(2);
        expect(value.pagination.limit).toBe(5);
        expect(value.pagination.total).toBe(15);
        expect(value.pagination.totalPages).toBe(3);
        expect(value.pagination.hasNext).toBe(true);
        expect(value.pagination.hasPrev).toBe(true);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: on last page Then: hasNext should be false', async () => {
    const companies = Array.from({ length: 8 }, (_, i) =>
      createCompany({ name: `Company ${i}`, code: `C${i}` }, `c-${i}`)
    );
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, page: 2, limit: 5 });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(3);
        expect(value.pagination.hasNext).toBe(false);
        expect(value.pagination.hasPrev).toBe(true);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies exist When: on first page Then: hasPrev should be false', async () => {
    const companies = Array.from({ length: 8 }, (_, i) =>
      createCompany({ name: `Company ${i}`, code: `C${i}` }, `c-${i}`)
    );
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, page: 1, limit: 5 });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.pagination.hasPrev).toBe(false);
        expect(value.pagination.hasNext).toBe(true);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: no companies When: getting all Then: should return empty result', async () => {
    mockCompanyRepository.findAll.mockResolvedValue([]);

    const result = await useCase.execute({ orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(0);
        expect(value.pagination.total).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: companies with products When: getting all Then: should include productCount', async () => {
    const companies = [createCompany({}, 'c-1')];
    mockCompanyRepository.findAll.mockResolvedValue(companies);
    mockCompanyRepository.countProducts.mockResolvedValue(5);

    const result = await useCase.execute({ orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].productCount).toBe(5);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });
});
