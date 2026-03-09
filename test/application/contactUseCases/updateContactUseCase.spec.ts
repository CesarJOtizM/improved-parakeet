import { UpdateContactUseCase } from '@application/contactUseCases/updateContactUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Contact } from '@contacts/domain/entities/contact.entity';
import { ConflictError, NotFoundError, ValidationError } from '@shared/domain/result/domainError';

import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

describe('UpdateContactUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: UpdateContactUseCase;
  let mockContactRepository: jest.Mocked<IContactRepository>;

  const createMockContact = () =>
    Contact.reconstitute(
      {
        name: 'John Doe',
        identification: 'CC-123',
        type: 'CUSTOMER',
        email: 'john@test.com',
        phone: '555-0100',
        isActive: true,
      },
      'contact-1',
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

    useCase = new UpdateContactUseCase(mockContactRepository);
  });

  it('Given: existing contact When: updating name Then: should return success', async () => {
    const contact = createMockContact();
    mockContactRepository.findById.mockResolvedValue(contact);
    mockContactRepository.save.mockImplementation(async c => c);
    mockContactRepository.countSales.mockResolvedValue(2);

    const result = await useCase.execute({
      contactId: 'contact-1',
      orgId: mockOrgId,
      name: 'Jane Doe',
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.name).toBe('Jane Doe');
        expect(value.data.salesCount).toBe(2);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: non-existent contact When: updating Then: should return NotFoundError', async () => {
    mockContactRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({
      contactId: 'non-existent',
      orgId: mockOrgId,
      name: 'Jane',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.code).toBe('CONTACT_NOT_FOUND');
      }
    );
  });

  it('Given: changing identification to existing one When: updating Then: should return ConflictError', async () => {
    const contact = createMockContact();
    mockContactRepository.findById.mockResolvedValue(contact);
    mockContactRepository.existsByIdentification.mockResolvedValue(true);

    const result = await useCase.execute({
      contactId: 'contact-1',
      orgId: mockOrgId,
      identification: 'CC-999',
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

  it('Given: keeping same identification When: updating Then: should skip uniqueness check', async () => {
    const contact = createMockContact();
    mockContactRepository.findById.mockResolvedValue(contact);
    mockContactRepository.save.mockImplementation(async c => c);
    mockContactRepository.countSales.mockResolvedValue(0);

    const result = await useCase.execute({
      contactId: 'contact-1',
      orgId: mockOrgId,
      identification: 'CC-123', // same as existing
    });

    expect(result.isOk()).toBe(true);
    expect(mockContactRepository.existsByIdentification).not.toHaveBeenCalled();
  });

  it('Given: Prisma P2002 error When: updating Then: should return ConflictError', async () => {
    const contact = createMockContact();
    mockContactRepository.findById.mockResolvedValue(contact);
    mockContactRepository.save.mockRejectedValue({ code: 'P2002' });

    const result = await useCase.execute({
      contactId: 'contact-1',
      orgId: mockOrgId,
      name: 'Jane',
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

  it('Given: unknown error When: updating Then: should return ValidationError', async () => {
    const contact = createMockContact();
    mockContactRepository.findById.mockResolvedValue(contact);
    mockContactRepository.save.mockRejectedValue(new Error('DB error'));

    const result = await useCase.execute({
      contactId: 'contact-1',
      orgId: mockOrgId,
      name: 'Jane',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.code).toBe('CONTACT_UPDATE_ERROR');
      }
    );
  });

  it('Given: non-Error thrown When: updating Then: should handle unknown error type', async () => {
    const contact = createMockContact();
    mockContactRepository.findById.mockResolvedValue(contact);
    mockContactRepository.save.mockRejectedValue('string error');

    const result = await useCase.execute({
      contactId: 'contact-1',
      orgId: mockOrgId,
      name: 'Jane',
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
