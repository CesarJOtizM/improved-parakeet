import { CreateContactUseCase } from '@application/contactUseCases/createContactUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ConflictError, ValidationError } from '@shared/domain/result/domainError';

import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

describe('CreateContactUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: CreateContactUseCase;
  let mockContactRepository: jest.Mocked<IContactRepository>;

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

    useCase = new CreateContactUseCase(mockContactRepository);
  });

  it('Given: valid data When: creating contact Then: should return success', async () => {
    mockContactRepository.existsByIdentification.mockResolvedValue(false);
    mockContactRepository.save.mockImplementation(async c => c);

    const result = await useCase.execute({
      name: 'John Doe',
      identification: 'CC-123',
      type: 'CUSTOMER',
      email: 'john@test.com',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.name).toBe('John Doe');
        expect(value.data.type).toBe('CUSTOMER');
        expect(value.data.salesCount).toBe(0);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: no type provided When: creating contact Then: should default to CUSTOMER', async () => {
    mockContactRepository.existsByIdentification.mockResolvedValue(false);
    mockContactRepository.save.mockImplementation(async c => c);

    const result = await useCase.execute({
      name: 'Jane Doe',
      identification: 'CC-456',
      orgId: mockOrgId,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.data.type).toBe('CUSTOMER');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: duplicate identification When: creating contact Then: should return ConflictError', async () => {
    mockContactRepository.existsByIdentification.mockResolvedValue(true);

    const result = await useCase.execute({
      name: 'John',
      identification: 'CC-123',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ConflictError);
        expect(error.code).toBe('CONTACT_IDENTIFICATION_CONFLICT');
      }
    );
  });

  it('Given: Prisma P2002 error When: creating contact Then: should return ConflictError', async () => {
    mockContactRepository.existsByIdentification.mockResolvedValue(false);
    mockContactRepository.save.mockRejectedValue({ code: 'P2002' });

    const result = await useCase.execute({
      name: 'John',
      identification: 'CC-123',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ConflictError);
        expect(error.code).toBe('CONTACT_CONFLICT');
      }
    );
  });

  it('Given: unknown error When: creating contact Then: should return ValidationError', async () => {
    mockContactRepository.existsByIdentification.mockResolvedValue(false);
    mockContactRepository.save.mockRejectedValue(new Error('DB connection lost'));

    const result = await useCase.execute({
      name: 'John',
      identification: 'CC-123',
      orgId: mockOrgId,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe('CONTACT_CREATION_ERROR');
      }
    );
  });

  it('Given: non-Error thrown When: creating contact Then: should handle unknown error type', async () => {
    mockContactRepository.existsByIdentification.mockResolvedValue(false);
    mockContactRepository.save.mockRejectedValue('string error');

    const result = await useCase.execute({
      name: 'John',
      identification: 'CC-123',
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
