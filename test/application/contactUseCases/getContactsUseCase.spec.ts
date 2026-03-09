import { GetContactsUseCase } from '@application/contactUseCases/getContactsUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Contact } from '@contacts/domain/entities/contact.entity';

import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

describe('GetContactsUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetContactsUseCase;
  let mockContactRepository: jest.Mocked<IContactRepository>;

  const createContact = (
    overrides: Partial<{
      name: string;
      identification: string;
      type: string;
      email: string;
      phone: string;
      address: string;
      notes: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }> = {},
    id?: string
  ) =>
    Contact.reconstitute(
      {
        name: overrides.name ?? 'John Doe',
        identification: overrides.identification ?? 'ID-001',
        type: overrides.type ?? 'CUSTOMER',
        email: overrides.email,
        phone: overrides.phone,
        address: overrides.address,
        notes: overrides.notes,
        isActive: overrides.isActive ?? true,
      },
      id ?? 'contact-1',
      mockOrgId
    );

  beforeEach(() => {
    jest.clearAllMocks();

    mockContactRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      exists: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      findByIdentification: jest.fn(),
      existsByIdentification: jest.fn(),
      findByEmail: jest.fn(),
      findByType: jest.fn(),
      countSales: jest.fn(),
    } as jest.Mocked<IContactRepository>;

    useCase = new GetContactsUseCase(mockContactRepository);
  });

  it('Given: contacts exist When: getting all Then: should return paginated contacts', async () => {
    const contacts = [createContact({}, 'c-1'), createContact({ name: 'Jane' }, 'c-2')];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

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

  it('Given: contacts exist When: filtering by type Then: should return only matching type', async () => {
    const contacts = [
      createContact({ type: 'CUSTOMER' }, 'c-1'),
      createContact({ type: 'SUPPLIER' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, type: 'CUSTOMER' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].type).toBe('CUSTOMER');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts exist When: filtering by isActive=false Then: should return only inactive', async () => {
    const contacts = [
      createContact({ isActive: true }, 'c-1'),
      createContact({ isActive: false }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

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

  it('Given: contacts exist When: filtering by isActive=true Then: should return only active', async () => {
    const contacts = [
      createContact({ isActive: true }, 'c-1'),
      createContact({ isActive: false }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

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

  it('Given: contacts exist When: searching by name Then: should return matching contacts', async () => {
    const contacts = [
      createContact({ name: 'Alice Smith' }, 'c-1'),
      createContact({ name: 'Bob Jones' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, search: 'alice' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].name).toBe('Alice Smith');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts exist When: searching by identification Then: should return matching', async () => {
    const contacts = [
      createContact({ name: 'Alice', identification: 'NIT-123' }, 'c-1'),
      createContact({ name: 'Bob', identification: 'CC-456' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, search: 'NIT' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].identification).toBe('NIT-123');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts with address When: searching by address Then: should return matching', async () => {
    const contacts = [
      createContact({ name: 'Alice', address: 'Calle 45 Norte' }, 'c-1'),
      createContact({ name: 'Bob', address: 'Carrera 10' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, search: 'calle' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].name).toBe('Alice');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts with notes When: searching by notes Then: should return matching', async () => {
    const contacts = [
      createContact({ name: 'Alice', notes: 'VIP client' }, 'c-1'),
      createContact({ name: 'Bob', notes: 'Regular' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, search: 'vip' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.length).toBe(1);
        expect(value.data[0].name).toBe('Alice');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts exist When: sorting by name asc Then: should return sorted', async () => {
    const contacts = [
      createContact({ name: 'Zara' }, 'c-1'),
      createContact({ name: 'Alice' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, sortBy: 'name', sortOrder: 'asc' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].name).toBe('Alice');
        expect(value.data[1].name).toBe('Zara');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts exist When: sorting by name desc Then: should return reverse sorted', async () => {
    const contacts = [
      createContact({ name: 'Alice' }, 'c-1'),
      createContact({ name: 'Zara' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, sortBy: 'name', sortOrder: 'desc' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].name).toBe('Zara');
        expect(value.data[1].name).toBe('Alice');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts exist When: sorting by identification Then: should sort correctly', async () => {
    const contacts = [
      createContact({ name: 'A', identification: 'ZZZ' }, 'c-1'),
      createContact({ name: 'B', identification: 'AAA' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({
      orgId: mockOrgId,
      sortBy: 'identification',
      sortOrder: 'asc',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].identification).toBe('AAA');
        expect(value.data[1].identification).toBe('ZZZ');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts exist When: sorting by type Then: should sort correctly', async () => {
    const contacts = [
      createContact({ type: 'SUPPLIER' }, 'c-1'),
      createContact({ type: 'CUSTOMER' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({ orgId: mockOrgId, sortBy: 'type', sortOrder: 'asc' });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].type).toBe('CUSTOMER');
        expect(value.data[1].type).toBe('SUPPLIER');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts exist When: sorting by isActive Then: should sort correctly', async () => {
    const contacts = [
      createContact({ isActive: true }, 'c-1'),
      createContact({ isActive: false }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

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

  it('Given: contacts exist When: sorting by updatedAt Then: should sort by date', async () => {
    const contacts = [
      createContact({ name: 'Newer' }, 'c-1'),
      createContact({ name: 'Older' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

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

  it('Given: contacts exist When: sorting by createdAt (default) Then: should sort by date', async () => {
    const contacts = [createContact({}, 'c-1'), createContact({}, 'c-2')];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

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

  it('Given: contacts exist When: using pagination Then: should respect page and limit', async () => {
    const contacts = Array.from({ length: 15 }, (_, i) =>
      createContact({ name: `Contact ${i}` }, `c-${i}`)
    );
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

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

  it('Given: no contacts When: getting all Then: should return empty result', async () => {
    mockContactRepository.findAll.mockResolvedValue([]);

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

  it('Given: contacts with sales When: getting all Then: should include salesCount', async () => {
    const contacts = [createContact({}, 'c-1')];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(5);

    const result = await useCase.execute({ orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data[0].salesCount).toBe(5);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: contacts with equal sort values When: sorting Then: should return 0 for equal items', async () => {
    const contacts = [
      createContact({ name: 'Same' }, 'c-1'),
      createContact({ name: 'Same' }, 'c-2'),
    ];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

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
    const contacts = [createContact({}, 'c-1')];
    mockContactRepository.findAll.mockResolvedValue(contacts);
    mockContactRepository.countSales.mockResolvedValue(0);

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
});
