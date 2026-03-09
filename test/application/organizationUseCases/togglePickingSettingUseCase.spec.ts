import { TogglePickingSettingUseCase } from '@application/organizationUseCases/togglePickingSettingUseCase';
import { Organization } from '@organization/domain/entities/organization.entity';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { NotFoundError } from '@shared/domain/result/domainError';

import type { IOrganizationRepository } from '@organization/domain/ports/repositories';

describe('TogglePickingSettingUseCase', () => {
  const mockOrgId = 'org-123';

  let useCase: TogglePickingSettingUseCase;
  let mockOrganizationRepository: jest.Mocked<IOrganizationRepository>;

  const createOrganization = (pickingEnabled = false) =>
    Organization.reconstitute(
      {
        name: 'Test Org',
        settings: { pickingEnabled },
        timezone: 'UTC',
        currency: 'COP',
        dateFormat: 'YYYY-MM-DD',
        isActive: true,
      },
      mockOrgId,
      mockOrgId
    );

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrganizationRepository = {
      findById: jest.fn(),
      findBySlug: jest.fn(),
      findByDomain: jest.fn(),
      findActiveOrganizations: jest.fn(),
      existsBySlug: jest.fn(),
      existsByDomain: jest.fn(),
      countActiveOrganizations: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
    } as jest.Mocked<IOrganizationRepository>;

    useCase = new TogglePickingSettingUseCase(mockOrganizationRepository);
  });

  describe('execute', () => {
    it('Given: organization exists When: enabling picking Then: should return success with pickingEnabled true', async () => {
      // Arrange
      const org = createOrganization(false);
      mockOrganizationRepository.findById.mockResolvedValue(org);
      mockOrganizationRepository.update.mockResolvedValue(org);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        pickingEnabled: true,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Picking mode set to OPTIONAL');
          expect(value.data.orgId).toBe(mockOrgId);
          expect(value.data.pickingEnabled).toBe(true);
          expect(value.data.pickingMode).toBe('OPTIONAL');
          expect(value.timestamp).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockOrganizationRepository.findById).toHaveBeenCalledWith(mockOrgId);
      expect(mockOrganizationRepository.update).toHaveBeenCalledWith(org);
    });

    it('Given: organization exists When: disabling picking Then: should return success with pickingEnabled false', async () => {
      // Arrange
      const org = createOrganization(true);
      mockOrganizationRepository.findById.mockResolvedValue(org);
      mockOrganizationRepository.update.mockResolvedValue(org);

      // Act
      const result = await useCase.execute({
        orgId: mockOrgId,
        pickingEnabled: false,
      });

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.message).toBe('Picking mode set to OFF');
          expect(value.data.pickingEnabled).toBe(false);
          expect(value.data.pickingMode).toBe('OFF');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: organization not found When: toggling picking Then: should return NotFoundError', async () => {
      // Arrange
      mockOrganizationRepository.findById.mockResolvedValue(null);

      // Act
      const result = await useCase.execute({
        orgId: 'non-existent-org',
        pickingEnabled: true,
      });

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(NotFoundError);
          expect(error.message).toContain('Organization with ID non-existent-org not found');
        }
      );
      expect(mockOrganizationRepository.update).not.toHaveBeenCalled();
    });

    it('Given: organization exists When: toggling picking Then: should call setSetting on entity', async () => {
      // Arrange
      const org = createOrganization(false);
      const setSettingSpy = jest.spyOn(org, 'setSetting');
      mockOrganizationRepository.findById.mockResolvedValue(org);
      mockOrganizationRepository.update.mockResolvedValue(org);

      // Act
      await useCase.execute({
        orgId: mockOrgId,
        pickingEnabled: true,
      });

      // Assert
      expect(setSettingSpy).toHaveBeenCalledWith('pickingEnabled', true);
    });

    it('Given: organization exists When: toggling picking Then: should call update on repository', async () => {
      // Arrange
      const org = createOrganization(false);
      mockOrganizationRepository.findById.mockResolvedValue(org);
      mockOrganizationRepository.update.mockResolvedValue(org);

      // Act
      await useCase.execute({
        orgId: mockOrgId,
        pickingEnabled: true,
      });

      // Assert
      expect(mockOrganizationRepository.update).toHaveBeenCalledTimes(1);
      expect(mockOrganizationRepository.update).toHaveBeenCalledWith(org);
    });
  });
});
