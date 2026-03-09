import { PrismaContactRepository } from '@infrastructure/database/repositories/contact.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Contact } from '@contacts/domain/entities/contact.entity';

describe('PrismaContactRepository', () => {
  let repository: PrismaContactRepository;

  let mockPrismaService: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contact: Record<string, jest.Mock<any>>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sale: Record<string, jest.Mock<any>>;
  };

  const mockContactData = {
    id: 'contact-123',
    name: 'John Doe',
    identification: '123456789',
    type: 'CUSTOMER',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St',
    notes: 'VIP customer',
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockContactDataNullOptionals = {
    id: 'contact-456',
    name: 'Jane Smith',
    identification: '987654321',
    type: 'SUPPLIER',
    email: null,
    phone: null,
    address: null,
    notes: null,
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      contact: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      sale: {
        count: jest.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new PrismaContactRepository(mockPrismaService as any);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return contact', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContactData);

      // Act
      const result = await repository.findById('contact-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('contact-123');
      expect(result?.name).toBe('John Doe');
      expect(result?.identification).toBe('123456789');
      expect(result?.type).toBe('CUSTOMER');
      expect(result?.email).toBe('john@example.com');
      expect(result?.phone).toBe('+1234567890');
      expect(result?.address).toBe('123 Main St');
      expect(result?.notes).toBe('VIP customer');
      expect(result?.isActive).toBe(true);
      expect(mockPrismaService.contact.findFirst).toHaveBeenCalledWith({
        where: { id: 'contact-123', orgId: 'org-123' },
      });
    });

    it('Given: contact with null optional fields When: finding by id Then: should return contact with undefined optionals', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContactDataNullOptionals);

      // Act
      const result = await repository.findById('contact-456', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBeUndefined();
      expect(result?.phone).toBeUndefined();
      expect(result?.address).toBeUndefined();
      expect(result?.notes).toBeUndefined();
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: prisma throws error When: finding by id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findById('contact-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: finding by id Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findById('contact-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return contacts', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockResolvedValue([
        mockContactData,
        mockContactDataNullOptionals,
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John Doe');
      expect(result[1].name).toBe('Jane Smith');
      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        orderBy: { name: 'asc' },
      });
    });

    it('Given: no contacts When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: contacts with null optionals When: finding all Then: should map undefined optionals', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockResolvedValue([mockContactDataNullOptionals]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].email).toBeUndefined();
      expect(result[0].phone).toBeUndefined();
      expect(result[0].address).toBeUndefined();
      expect(result[0].notes).toBeUndefined();
    });

    it('Given: prisma throws error When: finding all Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: finding all Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toBe('string-error');
    });
  });

  describe('exists', () => {
    it('Given: existing contact When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.contact.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('contact-123', 'org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.contact.count).toHaveBeenCalledWith({
        where: { id: 'contact-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent contact When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.contact.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: prisma throws error When: checking existence Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.contact.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.exists('contact-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: checking existence Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.contact.count.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.exists('contact-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('save', () => {
    it('Given: existing contact When: saving Then: should update contact', async () => {
      // Arrange
      mockPrismaService.contact.findUnique.mockResolvedValue(mockContactData);
      mockPrismaService.contact.update.mockResolvedValue({
        ...mockContactData,
        name: 'John Updated',
      });

      const contact = Contact.reconstitute(
        {
          name: 'John Updated',
          identification: '123456789',
          type: 'CUSTOMER',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St',
          notes: 'VIP customer',
          isActive: true,
        },
        'contact-123',
        'org-123'
      );

      // Act
      const result = await repository.save(contact);

      // Assert
      expect(result).not.toBeNull();
      expect(result.name).toBe('John Updated');
      expect(mockPrismaService.contact.update).toHaveBeenCalled();
      expect(mockPrismaService.contact.create).not.toHaveBeenCalled();
    });

    it('Given: new contact When: saving Then: should create contact', async () => {
      // Arrange
      mockPrismaService.contact.findUnique.mockResolvedValue(null);
      mockPrismaService.contact.create.mockResolvedValue(mockContactData);

      const contact = Contact.reconstitute(
        {
          name: 'John Doe',
          identification: '123456789',
          type: 'CUSTOMER',
          email: 'john@example.com',
          phone: '+1234567890',
          address: '123 Main St',
          notes: 'VIP customer',
          isActive: true,
        },
        'contact-123',
        'org-123'
      );

      // Act
      const result = await repository.save(contact);

      // Assert
      expect(result).not.toBeNull();
      expect(mockPrismaService.contact.create).toHaveBeenCalled();
      expect(mockPrismaService.contact.update).not.toHaveBeenCalled();
    });

    it('Given: contact with no optional fields When: saving Then: should save with null optionals', async () => {
      // Arrange
      mockPrismaService.contact.findUnique.mockResolvedValue(null);
      mockPrismaService.contact.create.mockResolvedValue(mockContactDataNullOptionals);

      const contact = Contact.reconstitute(
        {
          name: 'Jane Smith',
          identification: '987654321',
          type: 'SUPPLIER',
          isActive: true,
        },
        'contact-456',
        'org-123'
      );

      // Act
      const result = await repository.save(contact);

      // Assert
      expect(result).not.toBeNull();
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.address).toBeUndefined();
      expect(result.notes).toBeUndefined();
      expect(mockPrismaService.contact.create).toHaveBeenCalled();
    });

    it('Given: existing contact with null optionals When: updating Then: should return updated contact', async () => {
      // Arrange
      mockPrismaService.contact.findUnique.mockResolvedValue(mockContactDataNullOptionals);
      mockPrismaService.contact.update.mockResolvedValue(mockContactDataNullOptionals);

      const contact = Contact.reconstitute(
        {
          name: 'Jane Smith',
          identification: '987654321',
          type: 'SUPPLIER',
          isActive: true,
        },
        'contact-456',
        'org-123'
      );

      // Act
      const result = await repository.save(contact);

      // Assert
      expect(result).not.toBeNull();
      expect(result.email).toBeUndefined();
      expect(result.phone).toBeUndefined();
      expect(result.address).toBeUndefined();
      expect(result.notes).toBeUndefined();
      expect(mockPrismaService.contact.update).toHaveBeenCalled();
    });

    it('Given: prisma throws error When: saving Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.contact.findUnique.mockRejectedValue(new Error('DB Error'));

      const contact = Contact.reconstitute(
        {
          name: 'John Doe',
          identification: '123456789',
          type: 'CUSTOMER',
          isActive: true,
        },
        'contact-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.save(contact)).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: saving Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.contact.findUnique.mockRejectedValue('string-error');

      const contact = Contact.reconstitute(
        {
          name: 'John Doe',
          identification: '123456789',
          type: 'CUSTOMER',
          isActive: true,
        },
        'contact-123',
        'org-123'
      );

      // Act & Assert
      await expect(repository.save(contact)).rejects.toBe('string-error');
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should delete contact', async () => {
      // Arrange
      mockPrismaService.contact.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('contact-123', 'org-123');

      // Assert
      expect(mockPrismaService.contact.deleteMany).toHaveBeenCalledWith({
        where: { id: 'contact-123', orgId: 'org-123' },
      });
    });

    it('Given: prisma throws error When: deleting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.contact.deleteMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.delete('contact-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: deleting Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.contact.deleteMany.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.delete('contact-123', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('findByIdentification', () => {
    it('Given: valid identification and orgId When: finding by identification Then: should return contact', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContactData);

      // Act
      const result = await repository.findByIdentification('123456789', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.identification).toBe('123456789');
      expect(result?.name).toBe('John Doe');
      expect(mockPrismaService.contact.findFirst).toHaveBeenCalledWith({
        where: { identification: '123456789', orgId: 'org-123' },
      });
    });

    it('Given: non-existent identification When: finding by identification Then: should return null', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByIdentification('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: contact with null optionals When: finding by identification Then: should return contact with undefined optionals', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContactDataNullOptionals);

      // Act
      const result = await repository.findByIdentification('987654321', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBeUndefined();
      expect(result?.phone).toBeUndefined();
      expect(result?.address).toBeUndefined();
      expect(result?.notes).toBeUndefined();
    });

    it('Given: prisma throws error When: finding by identification Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByIdentification('123456789', 'org-123')).rejects.toThrow(
        'DB Error'
      );
    });

    it('Given: prisma throws non-Error When: finding by identification Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findByIdentification('123456789', 'org-123')).rejects.toBe(
        'string-error'
      );
    });
  });

  describe('existsByIdentification', () => {
    it('Given: existing identification When: checking identification existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.contact.count.mockResolvedValue(1);

      // Act
      const result = await repository.existsByIdentification('123456789', 'org-123');

      // Assert
      expect(result).toBe(true);
      expect(mockPrismaService.contact.count).toHaveBeenCalledWith({
        where: { identification: '123456789', orgId: 'org-123' },
      });
    });

    it('Given: non-existent identification When: checking identification existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.contact.count.mockResolvedValue(0);

      // Act
      const result = await repository.existsByIdentification('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: prisma throws error When: checking identification existence Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.contact.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.existsByIdentification('123456789', 'org-123')).rejects.toThrow(
        'DB Error'
      );
    });

    it('Given: prisma throws non-Error When: checking identification existence Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.contact.count.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.existsByIdentification('123456789', 'org-123')).rejects.toBe(
        'string-error'
      );
    });
  });

  describe('findByEmail', () => {
    it('Given: valid email and orgId When: finding by email Then: should return contact', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContactData);

      // Act
      const result = await repository.findByEmail('john@example.com', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBe('john@example.com');
      expect(result?.name).toBe('John Doe');
      expect(mockPrismaService.contact.findFirst).toHaveBeenCalledWith({
        where: { email: 'john@example.com', orgId: 'org-123' },
      });
    });

    it('Given: non-existent email When: finding by email Then: should return null', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByEmail('nonexistent@example.com', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: contact with null optionals When: finding by email Then: should return contact with undefined optionals', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockResolvedValue(mockContactDataNullOptionals);

      // Act
      const result = await repository.findByEmail('jane@example.com', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBeUndefined();
      expect(result?.phone).toBeUndefined();
      expect(result?.address).toBeUndefined();
      expect(result?.notes).toBeUndefined();
    });

    it('Given: prisma throws error When: finding by email Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByEmail('john@example.com', 'org-123')).rejects.toThrow(
        'DB Error'
      );
    });

    it('Given: prisma throws non-Error When: finding by email Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.contact.findFirst.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findByEmail('john@example.com', 'org-123')).rejects.toBe(
        'string-error'
      );
    });
  });

  describe('findByType', () => {
    it('Given: valid type and orgId When: finding by type Then: should return contacts', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockResolvedValue([mockContactData]);

      // Act
      const result = await repository.findByType('CUSTOMER', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('CUSTOMER');
      expect(result[0].name).toBe('John Doe');
      expect(mockPrismaService.contact.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123', type: 'CUSTOMER' },
        orderBy: { name: 'asc' },
      });
    });

    it('Given: no contacts of type When: finding by type Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findByType('SUPPLIER', 'org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: multiple contacts of type When: finding by type Then: should return all matching contacts', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockResolvedValue([
        mockContactData,
        { ...mockContactData, id: 'contact-789', name: 'Alice Doe' },
      ]);

      // Act
      const result = await repository.findByType('CUSTOMER', 'org-123');

      // Assert
      expect(result).toHaveLength(2);
    });

    it('Given: contacts with null optionals When: finding by type Then: should map undefined optionals', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockResolvedValue([mockContactDataNullOptionals]);

      // Act
      const result = await repository.findByType('SUPPLIER', 'org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].email).toBeUndefined();
      expect(result[0].phone).toBeUndefined();
      expect(result[0].address).toBeUndefined();
      expect(result[0].notes).toBeUndefined();
    });

    it('Given: prisma throws error When: finding by type Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findByType('CUSTOMER', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: finding by type Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.contact.findMany.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.findByType('CUSTOMER', 'org-123')).rejects.toBe('string-error');
    });
  });

  describe('countSales', () => {
    it('Given: contact with sales When: counting sales Then: should return count', async () => {
      // Arrange
      mockPrismaService.sale.count.mockResolvedValue(5);

      // Act
      const result = await repository.countSales('contact-123', 'org-123');

      // Assert
      expect(result).toBe(5);
      expect(mockPrismaService.sale.count).toHaveBeenCalledWith({
        where: { contactId: 'contact-123', orgId: 'org-123' },
      });
    });

    it('Given: contact with no sales When: counting sales Then: should return zero', async () => {
      // Arrange
      mockPrismaService.sale.count.mockResolvedValue(0);

      // Act
      const result = await repository.countSales('contact-123', 'org-123');

      // Assert
      expect(result).toBe(0);
    });

    it('Given: prisma throws error When: counting sales Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.sale.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.countSales('contact-123', 'org-123')).rejects.toThrow('DB Error');
    });

    it('Given: prisma throws non-Error When: counting sales Then: should propagate non-Error', async () => {
      // Arrange
      mockPrismaService.sale.count.mockRejectedValue('string-error');

      // Act & Assert
      await expect(repository.countSales('contact-123', 'org-123')).rejects.toBe('string-error');
    });
  });
});
