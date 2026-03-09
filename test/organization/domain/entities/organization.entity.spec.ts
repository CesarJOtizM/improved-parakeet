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

  describe('create', () => {
    it('Given: valid props When: creating organization Then: should create with correct values', () => {
      // Arrange & Act
      const organization = buildOrganization();

      // Assert
      expect(organization.name).toBe('Acme');
      expect(organization.taxId).toBe('TAX-1');
      expect(organization.timezone).toBe('UTC');
      expect(organization.currency).toBe('USD');
      expect(organization.dateFormat).toBe('YYYY-MM-DD');
      expect(organization.isActive).toBe(false);
      expect(organization.orgId).toBe('org-1');
    });
  });

  describe('reconstitute', () => {
    it('Given: existing data When: reconstituting Then: should create with given id', () => {
      // Arrange & Act
      const organization = Organization.reconstitute(
        {
          name: 'Test Org',
          settings: {},
          timezone: 'UTC',
          currency: 'EUR',
          dateFormat: 'DD/MM/YYYY',
          isActive: true,
        },
        'org-existing',
        'org-existing'
      );

      // Assert
      expect(organization.id).toBe('org-existing');
      expect(organization.name).toBe('Test Org');
      expect(organization.taxId).toBeUndefined();
    });
  });

  describe('update', () => {
    it('Given: organization When: updating taxId Then: should update taxId', () => {
      // Arrange
      const organization = buildOrganization();

      // Act
      organization.update({ taxId: 'TAX-NEW' });

      // Assert
      expect(organization.taxId).toBe('TAX-NEW');
    });

    it('Given: organization When: updating timezone Then: should update timezone', () => {
      // Arrange
      const organization = buildOrganization();

      // Act
      organization.update({ timezone: 'America/New_York' });

      // Assert
      expect(organization.timezone).toBe('America/New_York');
    });

    it('Given: organization When: updating dateFormat Then: should update dateFormat', () => {
      // Arrange
      const organization = buildOrganization();

      // Act
      organization.update({ dateFormat: 'DD/MM/YYYY' });

      // Assert
      expect(organization.dateFormat).toBe('DD/MM/YYYY');
    });

    it('Given: organization When: updating with empty partial Then: should not change fields', () => {
      // Arrange
      const organization = buildOrganization();

      // Act
      organization.update({});

      // Assert
      expect(organization.name).toBe('Acme');
      expect(organization.currency).toBe('USD');
    });
  });

  describe('settings', () => {
    it('Given: organization When: getting non-existent setting Then: should return undefined', () => {
      // Arrange
      const organization = buildOrganization();

      // Act
      const result = organization.getSetting('nonExistent');

      // Assert
      expect(result).toBeUndefined();
    });

    it('Given: organization When: updating settings Then: should merge without overwriting existing', () => {
      // Arrange
      const organization = buildOrganization();

      // Act
      organization.updateSettings({ newKey: 'newValue' });

      // Assert
      expect(organization.getSetting('theme')).toBe('light');
      expect(organization.getSetting('newKey')).toBe('newValue');
    });

    it('Given: organization When: getting settings Then: should return a defensive copy', () => {
      // Arrange
      const organization = buildOrganization();

      // Act
      const settings1 = organization.settings;
      settings1.hackedKey = 'hackedValue';

      // Assert - original should not be affected
      expect(organization.getSetting('hackedKey')).toBeUndefined();
    });

    it('Given: organization When: setting complex value Then: should store it', () => {
      // Arrange
      const organization = buildOrganization();

      // Act
      organization.setSetting('picking', { enabled: true, requireScan: false });

      // Assert
      const picking = organization.getSetting('picking') as Record<string, unknown>;
      expect(picking.enabled).toBe(true);
      expect(picking.requireScan).toBe(false);
    });

    it('Given: organization When: removing non-existent setting Then: should not throw', () => {
      // Arrange
      const organization = buildOrganization();

      // Act & Assert
      expect(() => organization.removeSetting('nonExistent')).not.toThrow();
    });
  });
});
