/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OrganizationController } from '@organization/organization.controller';
import { ok, err } from '@shared/domain/result';
import { ValidationError, ConflictError } from '@shared/domain/result/domainError';

describe('OrganizationController', () => {
  let controller: OrganizationController;
  let mockCreateOrganizationUseCase: any;
  let mockGetOrganizationByIdUseCase: any;
  let mockUpdateOrganizationUseCase: any;

  const mockOrganizationData = {
    id: 'org-123',
    name: 'Test Organization',
    slug: 'test-org',
    domain: 'test.example.com',
    timezone: 'America/Bogota',
    currency: 'COP',
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  beforeEach(() => {
    mockCreateOrganizationUseCase = { execute: jest.fn() };
    mockGetOrganizationByIdUseCase = { execute: jest.fn() };
    mockUpdateOrganizationUseCase = { execute: jest.fn() };
    controller = new OrganizationController(
      mockCreateOrganizationUseCase,
      mockGetOrganizationByIdUseCase,
      mockUpdateOrganizationUseCase
    );
  });

  describe('createOrganization', () => {
    it('Given: valid organization data When: creating organization Then: should return created organization', async () => {
      // Arrange
      const dto = {
        name: 'Test Organization',
        slug: 'test-org',
        domain: 'test.example.com',
        timezone: 'America/Bogota',
        currency: 'COP',
        dateFormat: 'DD/MM/YYYY',
      };
      mockCreateOrganizationUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockOrganizationData,
          message: 'Organization created successfully',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createOrganization(dto as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.slug).toBe('test-org');
      expect(mockCreateOrganizationUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Organization',
          slug: 'test-org',
        })
      );
    });

    it('Given: organization data with admin user When: creating organization Then: should include admin user', async () => {
      // Arrange
      const dto = {
        name: 'Test Organization',
        slug: 'test-org',
        adminUser: {
          email: 'admin@test.com',
          username: 'admin',
          password: 'password123',
          firstName: 'Admin',
          lastName: 'User',
        },
      };
      mockCreateOrganizationUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockOrganizationData, adminUser: { id: 'user-123', email: 'admin@test.com' } },
          message: 'Organization created successfully',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.createOrganization(dto as any);

      // Assert
      expect(result.success).toBe(true);
      expect(mockCreateOrganizationUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          adminUser: expect.objectContaining({
            email: 'admin@test.com',
            username: 'admin',
          }),
        })
      );
    });

    it('Given: organization with createInitialData When: creating organization Then: should include flag', async () => {
      // Arrange
      const dto = {
        name: 'Test Organization',
        slug: 'test-org',
        createInitialData: true,
      };
      mockCreateOrganizationUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockOrganizationData,
          message: 'Organization created successfully',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      await controller.createOrganization(dto as any);

      // Assert
      expect(mockCreateOrganizationUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          createInitialData: true,
        })
      );
    });

    it('Given: invalid data When: creating organization Then: should throw', async () => {
      // Arrange
      const dto = { name: '', slug: '' };
      mockCreateOrganizationUseCase.execute.mockResolvedValue(
        err(new ValidationError('Name is required'))
      );

      // Act & Assert
      await expect(controller.createOrganization(dto as any)).rejects.toThrow();
    });

    it('Given: duplicate slug When: creating organization Then: should throw conflict', async () => {
      // Arrange
      const dto = { name: 'Test Org', slug: 'existing-slug' };
      mockCreateOrganizationUseCase.execute.mockResolvedValue(
        err(new ConflictError('Organization with this slug already exists'))
      );

      // Act & Assert
      await expect(controller.createOrganization(dto as any)).rejects.toThrow();
    });
  });
});
