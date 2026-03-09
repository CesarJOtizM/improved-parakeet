import { GetContactByIdUseCase } from '@application/contactUseCases/getContactByIdUseCase';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Contact } from '@contacts/domain/entities/contact.entity';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IContactRepository } from '@contacts/domain/ports/repositories/iContactRepository.port';

describe('GetContactByIdUseCase', () => {
  const mockOrgId = 'test-org-id';

  let useCase: GetContactByIdUseCase;
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

    useCase = new GetContactByIdUseCase(mockContactRepository);
  });

  it('Given: existing contact When: getting by ID Then: should return contact data', async () => {
    const contact = Contact.reconstitute(
      {
        name: 'John Doe',
        identification: 'CC-123',
        type: 'CUSTOMER',
        email: 'john@test.com',
        phone: '555-0100',
        address: 'Calle 45',
        notes: 'VIP',
        isActive: true,
      },
      'contact-1',
      mockOrgId
    );
    mockContactRepository.findById.mockResolvedValue(contact);
    mockContactRepository.countSales.mockResolvedValue(3);

    const result = await useCase.execute({ contactId: 'contact-1', orgId: mockOrgId });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.name).toBe('John Doe');
        expect(value.data.email).toBe('john@test.com');
        expect(value.data.salesCount).toBe(3);
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
  });

  it('Given: non-existent contact When: getting by ID Then: should return NotFoundError', async () => {
    mockContactRepository.findById.mockResolvedValue(null);

    const result = await useCase.execute({ contactId: 'non-existent', orgId: mockOrgId });

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
});
