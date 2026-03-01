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
      mockUpdateOrganizationUseCase,
      { execute: jest.fn() } as any // togglePickingSettingUseCase
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

    it('Given: organization with createInitialData When: creating organization Then: should pass through mapped fields', async () => {
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

      // Assert - controller maps specific fields, createInitialData is not passed through
      expect(mockCreateOrganizationUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test Organization',
          slug: 'test-org',
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

  describe('getOrganizationById', () => {
    it('Given: existing organization When: getting by id Then: should return organization', async () => {
      // Arrange
      mockGetOrganizationByIdUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: mockOrganizationData,
          message: 'Organization retrieved successfully',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.getOrganizationById('org-123');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('org-123');
      expect(mockGetOrganizationByIdUseCase.execute).toHaveBeenCalledWith({
        identifier: 'org-123',
      });
    });

    it('Given: non-existing organization When: getting by id Then: should throw', async () => {
      // Arrange
      mockGetOrganizationByIdUseCase.execute.mockResolvedValue(
        err(new ValidationError('Organization not found'))
      );

      // Act & Assert
      await expect(controller.getOrganizationById('non-existent')).rejects.toThrow();
    });
  });

  describe('updateOrganization', () => {
    it('Given: valid update data When: updating organization Then: should return updated organization', async () => {
      // Arrange
      const dto = { name: 'Updated Organization' };
      mockUpdateOrganizationUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { ...mockOrganizationData, name: 'Updated Organization' },
          message: 'Organization updated successfully',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.updateOrganization('org-123', dto as any);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Organization');
      expect(mockUpdateOrganizationUseCase.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'org-123',
          name: 'Updated Organization',
        })
      );
    });

    it('Given: invalid update data When: updating organization Then: should throw', async () => {
      // Arrange
      mockUpdateOrganizationUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid data'))
      );

      // Act & Assert
      await expect(controller.updateOrganization('org-123', {} as any)).rejects.toThrow();
    });
  });

  describe('togglePickingSetting', () => {
    it('Given: valid setting When: toggling picking Then: should return success', async () => {
      // Arrange
      const mockToggleUseCase = (controller as any).togglePickingSettingUseCase;
      mockToggleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { pickingEnabled: true },
          message: 'Picking setting updated successfully',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.togglePickingSetting('org-123', { pickingEnabled: true });

      // Assert
      expect(result.success).toBe(true);
      expect(mockToggleUseCase.execute).toHaveBeenCalledWith({
        orgId: 'org-123',
        pickingEnabled: true,
      });
    });

    it('Given: disable picking When: toggling Then: should pass false', async () => {
      // Arrange
      const mockToggleUseCase = (controller as any).togglePickingSettingUseCase;
      mockToggleUseCase.execute.mockResolvedValue(
        ok({
          success: true,
          data: { pickingEnabled: false },
          message: 'Picking setting updated successfully',
          timestamp: new Date().toISOString(),
        })
      );

      // Act
      const result = await controller.togglePickingSetting('org-123', { pickingEnabled: false });

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
