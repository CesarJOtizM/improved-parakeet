import { describe, expect, it } from '@jest/globals';
import { Organization } from '@organization/domain/entities/organization.entity';

describe('Organization Entity', () => {
  const buildOrganization = () =>
    Organization.create(
      {
        name: 'Acme',
        taxId: 'TAX-1',
        settings: { theme: 'light' },
        timezone: 'UTC',
        currency: 'USD',
        dateFormat: 'YYYY-MM-DD',
        isActive: false,
      },
      'org-1'
    );

  it('Given: update props When: updating Then: should change fields', () => {
    // Arrange
    const organization = buildOrganization();

    // Act
    organization.update({ name: 'Updated', currency: 'EUR' });

    // Assert
    expect(organization.name).toBe('Updated');
    expect(organization.currency).toBe('EUR');
  });

  it('Given: settings When: updating Then: should merge settings', () => {
    // Arrange
    const organization = buildOrganization();

    // Act
    organization.updateSettings({ locale: 'es' });

    // Assert
    expect(organization.settings).toEqual({ theme: 'light', locale: 'es' });
  });

  it('Given: setting key When: setting and removing Then: should update settings', () => {
    // Arrange
    const organization = buildOrganization();

    // Act
    organization.setSetting('timezone', 'UTC');
    organization.removeSetting('theme');

    // Assert
    expect(organization.getSetting('timezone')).toBe('UTC');
    expect(organization.settings).not.toHaveProperty('theme');
  });

  it('Given: inactive organization When: activating Then: should be active', () => {
    // Arrange
    const organization = buildOrganization();

    // Act
    organization.activate();

    // Assert
    expect(organization.isActive).toBe(true);
  });

  it('Given: active organization When: deactivating Then: should be inactive', () => {
    // Arrange
    const organization = buildOrganization();

    // Act
    organization.deactivate();

    // Assert
    expect(organization.isActive).toBe(false);
  });
});
