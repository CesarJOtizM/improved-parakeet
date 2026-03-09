/* eslint-disable @typescript-eslint/no-explicit-any */
import { ContactsController } from '@interface/http/contacts/contacts.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  BusinessRuleError,
} from '@shared/domain/result/domainError';

describe('ContactsController', () => {
  let controller: ContactsController;
  let mockGetContactsUseCase: any;
  let mockGetContactByIdUseCase: any;
  let mockCreateContactUseCase: any;
  let mockUpdateContactUseCase: any;
  let mockDeleteContactUseCase: any;

  const mockContactData = {
    id: 'contact-123',
    name: 'John Doe',
    identification: '900123456-7',
    type: 'CUSTOMER',
    email: 'john@example.com',
    phone: '+573001234567',
    address: 'Calle 123 #45-67',
    notes: 'Preferred customer',
    isActive: true,
    orgId: 'org-123',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockGetContactsUseCase = { execute: jest.fn() };
    mockGetContactByIdUseCase = { execute: jest.fn() };
    mockCreateContactUseCase = { execute: jest.fn() };
    mockUpdateContactUseCase = { execute: jest.fn() };
    mockDeleteContactUseCase = { execute: jest.fn() };

    controller = new ContactsController(
      mockGetContactsUseCase,
      mockGetContactByIdUseCase,
      mockCreateContactUseCase,
      mockUpdateContactUseCase,
      mockDeleteContactUseCase
    );
  });

  describe('getContacts', () => {
    it('Given: valid query params When: getting contacts Then: should return contacts list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      const responseData = {
        success: true,
        data: [mockContactData],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false },
        message: 'Contacts retrieved',
        timestamp: new Date().toISOString(),
      };
      mockGetContactsUseCase.execute.mockResolvedValue(ok(responseData));

      // Act
      const result = await controller.getContacts(query as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].name).toBe('John Doe');
    });

    it('Given: search filter When: getting contacts Then: should pass search to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, search: 'john' };
      mockGetContactsUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [mockContactData],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getContacts(query as any, 'org-123');

      // Assert
      expect(mockGetContactsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123', search: 'john' })
      );
    });

    it('Given: type filter When: getting contacts Then: should pass type to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, type: 'SUPPLIER' };
      mockGetContactsUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getContacts(query as any, 'org-123');

      // Assert
      expect(mockGetContactsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123', type: 'SUPPLIER' })
      );
    });

    it('Given: isActive filter When: getting contacts Then: should pass isActive to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, isActive: true };
      mockGetContactsUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [mockContactData],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getContacts(query as any, 'org-123');

      // Assert
      expect(mockGetContactsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ orgId: 'org-123', isActive: true })
      );
    });

    it('Given: sortBy and sortOrder params When: getting contacts Then: should pass sorting to use case', async () => {
      // Arrange
      const query = { page: 1, limit: 10, sortBy: 'name', sortOrder: 'asc' as const };
      mockGetContactsUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [mockContactData],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getContacts(query as any, 'org-123');

      // Assert
      expect(mockGetContactsUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'name', sortOrder: 'asc' })
      );
    });

    it('Given: all query params When: getting contacts Then: should pass all params to use case', async () => {
      // Arrange
      const query = {
        page: 2,
        limit: 20,
        search: 'doe',
        type: 'CUSTOMER',
        isActive: false,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };
      mockGetContactsUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {},
          message: 'OK',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getContacts(query as any, 'org-123');

      // Assert
      expect(mockGetContactsUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        page: 2,
        limit: 20,
        search: 'doe',
        type: 'CUSTOMER',
        isActive: false,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
    });

    it('Given: no contacts exist When: getting contacts Then: should return empty list', async () => {
      // Arrange
      const query = { page: 1, limit: 10 };
      mockGetContactsUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          message: 'Contacts retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getContacts(query as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getContactById', () => {
    it('Given: valid contact id When: getting contact Then: should return contact', async () => {
      // Arrange
      mockGetContactByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockContactData,
          message: 'Contact retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getContactById('contact-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('contact-123');
      expect(result.data.name).toBe('John Doe');
    });

    it('Given: valid contact id When: getting contact Then: should pass contactId and orgId to use case', async () => {
      // Arrange
      mockGetContactByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockContactData,
          message: 'Contact retrieved',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.getContactById('contact-123', 'org-123');

      // Assert
      expect(mockGetContactByIdUseCase.execute).toHaveBeenCalledWith({
        contactId: 'contact-123',
        orgId: 'org-123',
      });
    });

    it('Given: non-existent contact id When: getting contact Then: should throw NotFoundException', async () => {
      // Arrange
      mockGetContactByIdUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Contact not found'))
      );

      // Act & Assert
      await expect(controller.getContactById('non-existent', 'org-123')).rejects.toThrow();
    });
  });

  describe('createContact', () => {
    it('Given: valid contact data When: creating contact Then: should return created contact', async () => {
      // Arrange
      const dto = {
        name: 'John Doe',
        identification: '900123456-7',
        type: 'CUSTOMER',
        email: 'john@example.com',
        phone: '+573001234567',
        address: 'Calle 123 #45-67',
        notes: 'Preferred customer',
      };
      mockCreateContactUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockContactData,
          message: 'Contact created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createContact(dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('John Doe');
      expect(result.data.identification).toBe('900123456-7');
    });

    it('Given: valid contact data When: creating Then: should pass all fields and orgId to use case', async () => {
      // Arrange
      const dto = {
        name: 'Jane Smith',
        identification: '800987654-3',
        type: 'SUPPLIER',
        email: 'jane@example.com',
        phone: '+573009876543',
        address: 'Carrera 10 #20-30',
        notes: 'Main supplier',
      };
      mockCreateContactUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockContactData, ...dto },
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.createContact(dto as any, 'org-123');

      // Assert
      expect(mockCreateContactUseCase.execute).toHaveBeenCalledWith({
        name: 'Jane Smith',
        identification: '800987654-3',
        type: 'SUPPLIER',
        email: 'jane@example.com',
        phone: '+573009876543',
        address: 'Carrera 10 #20-30',
        notes: 'Main supplier',
        orgId: 'org-123',
      });
    });

    it('Given: minimal contact data When: creating Then: should pass undefined for optional fields', async () => {
      // Arrange
      const dto = {
        name: 'Minimal Contact',
        identification: '123456789',
      };
      mockCreateContactUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockContactData, name: 'Minimal Contact' },
          message: 'Created',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.createContact(dto as any, 'org-123');

      // Assert
      expect(mockCreateContactUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Minimal Contact',
          identification: '123456789',
          orgId: 'org-123',
        })
      );
    });

    it('Given: invalid data When: creating contact Then: should throw ValidationError', async () => {
      // Arrange
      const dto = { name: '' };
      mockCreateContactUseCase.execute.mockResolvedValue(
        err(new ValidationError('Contact name is required'))
      );

      // Act & Assert
      await expect(controller.createContact(dto as any, 'org-123')).rejects.toThrow();
    });

    it('Given: duplicate identification When: creating Then: should throw ConflictError', async () => {
      // Arrange
      const dto = { name: 'John Doe', identification: '900123456-7' };
      mockCreateContactUseCase.execute.mockResolvedValue(
        err(new ConflictError('Contact identification already exists'))
      );

      // Act & Assert
      await expect(controller.createContact(dto as any, 'org-123')).rejects.toThrow();
    });
  });

  describe('updateContact', () => {
    it('Given: valid update data When: updating contact Then: should return updated contact', async () => {
      // Arrange
      const dto = { name: 'Updated Name', email: 'updated@example.com' };
      mockUpdateContactUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockContactData, name: 'Updated Name', email: 'updated@example.com' },
          message: 'Contact updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.updateContact('contact-123', dto as any, 'org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Name');
      expect(result.data.email).toBe('updated@example.com');
    });

    it('Given: isActive toggle When: updating contact Then: should pass isActive to use case', async () => {
      // Arrange
      const dto = { isActive: false };
      mockUpdateContactUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockContactData, isActive: false },
          message: 'Updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.updateContact('contact-123', dto as any, 'org-123');

      // Assert
      expect(mockUpdateContactUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({ contactId: 'contact-123', orgId: 'org-123', isActive: false })
      );
    });

    it('Given: all fields When: updating contact Then: should pass all fields to use case', async () => {
      // Arrange
      const dto = {
        name: 'Updated Name',
        identification: '111222333-4',
        type: 'SUPPLIER',
        email: 'new@example.com',
        phone: '+573005555555',
        address: 'New Address',
        notes: 'Updated notes',
        isActive: true,
      };
      mockUpdateContactUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockContactData, ...dto },
          message: 'Updated',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.updateContact('contact-123', dto as any, 'org-123');

      // Assert
      expect(mockUpdateContactUseCase.execute).toHaveBeenCalledWith({
        contactId: 'contact-123',
        orgId: 'org-123',
        name: 'Updated Name',
        identification: '111222333-4',
        type: 'SUPPLIER',
        email: 'new@example.com',
        phone: '+573005555555',
        address: 'New Address',
        notes: 'Updated notes',
        isActive: true,
      });
    });

    it('Given: non-existent contact When: updating Then: should throw NotFoundError', async () => {
      // Arrange
      const dto = { name: 'Updated' };
      mockUpdateContactUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Contact not found'))
      );

      // Act & Assert
      await expect(
        controller.updateContact('non-existent', dto as any, 'org-123')
      ).rejects.toThrow();
    });

    it('Given: duplicate identification When: updating Then: should throw ConflictError', async () => {
      // Arrange
      const dto = { identification: '900123456-7' };
      mockUpdateContactUseCase.execute.mockResolvedValue(
        err(new ConflictError('Contact identification already exists'))
      );

      // Act & Assert
      await expect(
        controller.updateContact('contact-123', dto as any, 'org-123')
      ).rejects.toThrow();
    });
  });

  describe('deleteContact', () => {
    it('Given: valid contact id When: deleting Then: should return success', async () => {
      // Arrange
      mockDeleteContactUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Contact deleted',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.deleteContact('contact-123', 'org-123');

      // Assert
      expect(result.success).toBe(true);
    });

    it('Given: valid contact id When: deleting Then: should pass contactId and orgId to use case', async () => {
      // Arrange
      mockDeleteContactUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          message: 'Contact deleted',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.deleteContact('contact-123', 'org-123');

      // Assert
      expect(mockDeleteContactUseCase.execute).toHaveBeenCalledWith({
        contactId: 'contact-123',
        orgId: 'org-123',
      });
    });

    it('Given: non-existent contact When: deleting Then: should throw NotFoundError', async () => {
      // Arrange
      mockDeleteContactUseCase.execute.mockResolvedValue(
        err(new NotFoundError('Contact not found'))
      );

      // Act & Assert
      await expect(controller.deleteContact('non-existent', 'org-123')).rejects.toThrow();
    });

    it('Given: contact with associated sales When: deleting Then: should throw BusinessRuleError', async () => {
      // Arrange
      mockDeleteContactUseCase.execute.mockResolvedValue(
        err(new BusinessRuleError('Contact has associated sales'))
      );

      // Act & Assert
      await expect(controller.deleteContact('contact-123', 'org-123')).rejects.toThrow();
    });
  });
});
