/* eslint-disable @typescript-eslint/no-explicit-any */
import { SettingsController } from '@interface/http/routes/settings.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('SettingsController', () => {
  let controller: SettingsController;
  let mockPrisma: any;

  const mockOrgId = 'org-123';

  const mockAlertConfig = {
    id: 'config-123',
    orgId: mockOrgId,
    cronFrequency: 'EVERY_HOUR',
    notifyLowStock: true,
    notifyCriticalStock: true,
    notifyOutOfStock: true,
    recipientEmails: 'admin@test.com',
    isEnabled: true,
    lastRunAt: null,
    createdAt: new Date('2026-02-01T00:00:00Z'),
    updatedAt: new Date('2026-02-01T00:00:00Z'),
  };

  beforeEach(() => {
    mockPrisma = {
      alertConfiguration: {
        findUnique: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
    };

    controller = new SettingsController(mockPrisma);
  });

  describe('getAlertConfiguration', () => {
    it('Given: existing config When: getting alert config Then: should return config', async () => {
      // Arrange
      mockPrisma.alertConfiguration.findUnique.mockResolvedValue(mockAlertConfig);

      // Act
      const result = await controller.getAlertConfiguration(mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Alert configuration retrieved successfully');
      expect(result.data.id).toBe('config-123');
      expect(result.data.cronFrequency).toBe('EVERY_HOUR');
      expect(result.data.isEnabled).toBe(true);
      expect(mockPrisma.alertConfiguration.findUnique).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
      });
    });

    it('Given: no existing config When: getting alert config Then: should create default and return', async () => {
      // Arrange
      mockPrisma.alertConfiguration.findUnique.mockResolvedValue(null);
      mockPrisma.alertConfiguration.create.mockResolvedValue(mockAlertConfig);

      // Act
      const result = await controller.getAlertConfiguration(mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.id).toBe('config-123');
      expect(mockPrisma.alertConfiguration.findUnique).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
      });
      expect(mockPrisma.alertConfiguration.create).toHaveBeenCalledWith({
        data: { orgId: mockOrgId },
      });
    });

    it('Given: database error When: getting alert config Then: should propagate error', async () => {
      // Arrange
      mockPrisma.alertConfiguration.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(controller.getAlertConfiguration(mockOrgId)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('Given: existing config When: getting alert config Then: should include timestamp', async () => {
      // Arrange
      mockPrisma.alertConfiguration.findUnique.mockResolvedValue(mockAlertConfig);

      // Act
      const result = await controller.getAlertConfiguration(mockOrgId);

      // Assert
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('updateAlertConfiguration', () => {
    it('Given: valid update data When: updating config Then: should return updated config', async () => {
      // Arrange
      const dto = {
        cronFrequency: 'EVERY_6_HOURS',
        notifyLowStock: false,
        isEnabled: true,
      };
      const updatedConfig = {
        ...mockAlertConfig,
        cronFrequency: 'EVERY_6_HOURS',
        notifyLowStock: false,
      };
      mockPrisma.alertConfiguration.upsert.mockResolvedValue(updatedConfig);

      // Act
      const result = await controller.updateAlertConfiguration(dto as any, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toBe('Alert configuration updated successfully');
      expect(result.data.cronFrequency).toBe('EVERY_6_HOURS');
      expect(result.data.notifyLowStock).toBe(false);
      expect(mockPrisma.alertConfiguration.upsert).toHaveBeenCalledWith({
        where: { orgId: mockOrgId },
        create: expect.objectContaining({
          orgId: mockOrgId,
          cronFrequency: 'EVERY_6_HOURS',
          notifyLowStock: false,
          isEnabled: true,
        }),
        update: expect.objectContaining({
          cronFrequency: 'EVERY_6_HOURS',
          notifyLowStock: false,
          isEnabled: true,
        }),
      });
    });

    it('Given: partial update When: updating config Then: should only update provided fields', async () => {
      // Arrange
      const dto = {
        isEnabled: false,
      };
      const updatedConfig = { ...mockAlertConfig, isEnabled: false };
      mockPrisma.alertConfiguration.upsert.mockResolvedValue(updatedConfig);

      // Act
      const result = await controller.updateAlertConfiguration(dto as any, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.isEnabled).toBe(false);
    });

    it('Given: no existing config When: updating Then: should upsert create with defaults', async () => {
      // Arrange
      const dto = { cronFrequency: 'EVERY_DAY' };
      const newConfig = { ...mockAlertConfig, cronFrequency: 'EVERY_DAY' };
      mockPrisma.alertConfiguration.upsert.mockResolvedValue(newConfig);

      // Act
      const result = await controller.updateAlertConfiguration(dto as any, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(mockPrisma.alertConfiguration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: mockOrgId },
          create: expect.objectContaining({
            orgId: mockOrgId,
            cronFrequency: 'EVERY_DAY',
          }),
        })
      );
    });

    it('Given: update with recipient emails When: updating Then: should set recipients', async () => {
      // Arrange
      const dto = {
        recipientEmails: 'admin@test.com,manager@test.com',
      };
      const updatedConfig = {
        ...mockAlertConfig,
        recipientEmails: 'admin@test.com,manager@test.com',
      };
      mockPrisma.alertConfiguration.upsert.mockResolvedValue(updatedConfig);

      // Act
      const result = await controller.updateAlertConfiguration(dto as any, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.recipientEmails).toBe('admin@test.com,manager@test.com');
    });

    it('Given: database error When: updating config Then: should propagate error', async () => {
      // Arrange
      const dto = { isEnabled: false };
      mockPrisma.alertConfiguration.upsert.mockRejectedValue(new Error('Database write failed'));

      // Act & Assert
      await expect(controller.updateAlertConfiguration(dto as any, mockOrgId)).rejects.toThrow(
        'Database write failed'
      );
    });

    it('Given: empty dto When: updating config Then: should use default values in create', async () => {
      // Arrange
      const dto = {} as any;
      mockPrisma.alertConfiguration.upsert.mockResolvedValue(mockAlertConfig);

      // Act
      await controller.updateAlertConfiguration(dto, mockOrgId);

      // Assert
      expect(mockPrisma.alertConfiguration.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            cronFrequency: 'EVERY_HOUR',
            notifyLowStock: true,
            notifyCriticalStock: true,
            notifyOutOfStock: true,
            recipientEmails: '',
            isEnabled: true,
          }),
        })
      );
    });
  });
});
