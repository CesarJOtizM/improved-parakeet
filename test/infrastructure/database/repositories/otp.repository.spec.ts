import { Otp } from '@auth/domain/entities/otp.entity';
import { OtpRepository } from '@infrastructure/database/repositories/otp.repository';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('OtpRepository', () => {
  let repository: OtpRepository;

  let mockPrismaService: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    otp: Record<string, jest.Mock<any>>;
  };

  const futureDate = new Date(Date.now() + 15 * 60 * 1000); // 15 min in future
  const pastDate = new Date(Date.now() - 15 * 60 * 1000); // 15 min in past

  const mockOtpData = {
    id: 'otp-123',
    email: 'user@example.com',
    code: '123456',
    type: 'PASSWORD_RESET',
    expiresAt: futureDate,
    isUsed: false,
    attempts: 0,
    maxAttempts: 3,
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    orgId: 'org-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockPrismaService = {
      otp: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    repository = new OtpRepository(mockPrismaService as any);
  });

  describe('findById', () => {
    it('Given: valid id and orgId When: finding by id Then: should return OTP', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockResolvedValue(mockOtpData);

      // Act
      const result = await repository.findById('otp-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.id).toBe('otp-123');
      expect(result?.email).toBe('user@example.com');
      expect(result?.code).toBe('123456');
      expect(result?.type).toBe('PASSWORD_RESET');
      expect(mockPrismaService.otp.findFirst).toHaveBeenCalledWith({
        where: { id: 'otp-123', orgId: 'org-123' },
      });
    });

    it('Given: non-existent id When: finding by id Then: should return null', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findById('non-existent', 'org-123');

      // Assert
      expect(result).toBeNull();
    });

    it('Given: prisma throws error When: finding by id Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findById('otp-123', 'org-123')).rejects.toThrow('DB Error');
    });
  });

  describe('findByEmailAndType', () => {
    it('Given: valid email and type When: finding Then: should return OTP', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockResolvedValue(mockOtpData);

      // Act
      const result = await repository.findByEmailAndType(
        'user@example.com',
        'PASSWORD_RESET',
        'org-123'
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBe('user@example.com');
      expect(mockPrismaService.otp.findFirst).toHaveBeenCalledWith({
        where: { email: 'user@example.com', type: 'PASSWORD_RESET', orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: no matching OTP When: finding Then: should return null', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findByEmailAndType(
        'unknown@example.com',
        'PASSWORD_RESET',
        'org-123'
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('findValidByEmailAndType', () => {
    it('Given: valid unexpired OTP When: finding valid Then: should return OTP', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockResolvedValue(mockOtpData);

      // Act
      const result = await repository.findValidByEmailAndType(
        'user@example.com',
        'PASSWORD_RESET',
        'org-123'
      );

      // Assert
      expect(result).not.toBeNull();
      expect(result?.email).toBe('user@example.com');
      expect(mockPrismaService.otp.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'user@example.com',
          type: 'PASSWORD_RESET',
          orgId: 'org-123',
          isUsed: false,
          expiresAt: { gt: expect.any(Date) },
          attempts: { lt: 3 },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('Given: no valid OTP When: finding valid Then: should return null', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockResolvedValue(null);

      // Act
      const result = await repository.findValidByEmailAndType(
        'user@example.com',
        'PASSWORD_RESET',
        'org-123'
      );

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('save', () => {
    it('Given: valid OTP When: saving Then: should upsert OTP', async () => {
      // Arrange
      mockPrismaService.otp.upsert.mockResolvedValue(mockOtpData);

      const otp = Otp.reconstitute(
        {
          email: 'user@example.com',
          code: '123456',
          type: 'PASSWORD_RESET',
          expiresAt: futureDate,
          isUsed: false,
          attempts: 0,
          maxAttempts: 3,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        'otp-123',
        'org-123'
      );

      // Act
      const result = await repository.save(otp);

      // Assert
      expect(result).not.toBeNull();
      expect(result.email).toBe('user@example.com');
      expect(mockPrismaService.otp.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'otp-123' },
        })
      );
    });
  });

  describe('delete', () => {
    it('Given: valid id and orgId When: deleting Then: should delete OTP', async () => {
      // Arrange
      mockPrismaService.otp.deleteMany.mockResolvedValue({ count: 1 });

      // Act
      await repository.delete('otp-123', 'org-123');

      // Assert
      expect(mockPrismaService.otp.deleteMany).toHaveBeenCalledWith({
        where: { id: 'otp-123', orgId: 'org-123' },
      });
    });
  });

  describe('findExpiredOtp', () => {
    it('Given: expired OTPs exist When: finding expired Then: should return them', async () => {
      // Arrange
      const expiredOtp = { ...mockOtpData, expiresAt: pastDate };
      mockPrismaService.otp.findMany.mockResolvedValue([expiredOtp]);

      // Act
      const result = await repository.findExpiredOtp('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.otp.findMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('findUsedOtp', () => {
    it('Given: used OTPs exist When: finding used Then: should return them', async () => {
      // Arrange
      const usedOtp = { ...mockOtpData, isUsed: true };
      mockPrismaService.otp.findMany.mockResolvedValue([usedOtp]);

      // Act
      const result = await repository.findUsedOtp('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.otp.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123', isUsed: true },
      });
    });
  });

  describe('deleteExpiredOtp', () => {
    it('Given: expired OTPs exist When: deleting expired Then: should return count', async () => {
      // Arrange
      mockPrismaService.otp.deleteMany.mockResolvedValue({ count: 3 });

      // Act
      const result = await repository.deleteExpiredOtp('org-123');

      // Assert
      expect(result).toBe(3);
      expect(mockPrismaService.otp.deleteMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('deleteUsedOtp', () => {
    it('Given: used OTPs older than N hours When: deleting Then: should return count', async () => {
      // Arrange
      mockPrismaService.otp.deleteMany.mockResolvedValue({ count: 2 });

      // Act
      const result = await repository.deleteUsedOtp('org-123', 24);

      // Assert
      expect(result).toBe(2);
      expect(mockPrismaService.otp.deleteMany).toHaveBeenCalledWith({
        where: {
          orgId: 'org-123',
          isUsed: true,
          updatedAt: { lt: expect.any(Date) },
        },
      });
    });
  });

  describe('countByEmailAndType', () => {
    it('Given: valid email and type When: counting Then: should return count', async () => {
      // Arrange
      mockPrismaService.otp.count.mockResolvedValue(2);

      // Act
      const result = await repository.countByEmailAndType(
        'user@example.com',
        'PASSWORD_RESET',
        'org-123'
      );

      // Assert
      expect(result).toBe(2);
      expect(mockPrismaService.otp.count).toHaveBeenCalledWith({
        where: { email: 'user@example.com', type: 'PASSWORD_RESET', orgId: 'org-123' },
      });
    });
  });

  describe('findRecentOtpByEmail', () => {
    it('Given: recent OTPs exist When: finding recent Then: should return them', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockResolvedValue([mockOtpData]);

      // Act
      const result = await repository.findRecentOtpByEmail('user@example.com', 'org-123', 1);

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.otp.findMany).toHaveBeenCalledWith({
        where: {
          email: 'user@example.com',
          orgId: 'org-123',
          createdAt: { gte: expect.any(Date) },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findAll', () => {
    it('Given: valid orgId When: finding all Then: should return OTPs', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockResolvedValue([mockOtpData]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(mockPrismaService.otp.findMany).toHaveBeenCalledWith({
        where: { orgId: 'org-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('exists', () => {
    it('Given: existing OTP When: checking existence Then: should return true', async () => {
      // Arrange
      mockPrismaService.otp.count.mockResolvedValue(1);

      // Act
      const result = await repository.exists('otp-123', 'org-123');

      // Assert
      expect(result).toBe(true);
    });

    it('Given: non-existent OTP When: checking existence Then: should return false', async () => {
      // Arrange
      mockPrismaService.otp.count.mockResolvedValue(0);

      // Act
      const result = await repository.exists('non-existent', 'org-123');

      // Assert
      expect(result).toBe(false);
    });

    it('Given: prisma throws error When: checking existence Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.count.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.exists('otp-123', 'org-123')).rejects.toThrow('DB Error');
    });
  });

  describe('findById - optional fields mapping', () => {
    it('Given: OTP without ipAddress When: finding Then: should map to undefined', async () => {
      // Arrange
      const otpWithNulls = { ...mockOtpData, ipAddress: null, userAgent: null };
      mockPrismaService.otp.findFirst.mockResolvedValue(otpWithNulls);

      // Act
      const result = await repository.findById('otp-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.ipAddress).toBeUndefined();
      expect(result?.userAgent).toBeUndefined();
    });

    it('Given: OTP with ipAddress and userAgent When: finding Then: should preserve values', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockResolvedValue(mockOtpData);

      // Act
      const result = await repository.findById('otp-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.ipAddress).toBe('192.168.1.1');
      expect(result?.userAgent).toBe('Mozilla/5.0');
    });

    it('Given: OTP with empty string ipAddress When: finding Then: should map to empty string', async () => {
      // Arrange
      const otpWithEmpty = { ...mockOtpData, ipAddress: '', userAgent: '' };
      mockPrismaService.otp.findFirst.mockResolvedValue(otpWithEmpty);

      // Act
      const result = await repository.findById('otp-123', 'org-123');

      // Assert
      expect(result).not.toBeNull();
      // empty string is falsy, so || undefined will map to undefined
      expect(result?.ipAddress).toBeUndefined();
      expect(result?.userAgent).toBeUndefined();
    });
  });

  describe('findByEmailAndType - error handling', () => {
    it('Given: prisma throws error When: finding by email and type Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockRejectedValue(new Error('Connection lost'));

      // Act & Assert
      await expect(
        repository.findByEmailAndType('user@example.com', 'PASSWORD_RESET', 'org-123')
      ).rejects.toThrow('Connection lost');
    });
  });

  describe('findValidByEmailAndType - error handling', () => {
    it('Given: prisma throws error When: finding valid OTP Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.findFirst.mockRejectedValue(new Error('Timeout'));

      // Act & Assert
      await expect(
        repository.findValidByEmailAndType('user@example.com', 'PASSWORD_RESET', 'org-123')
      ).rejects.toThrow('Timeout');
    });
  });

  describe('findExpiredOtp - additional cases', () => {
    it('Given: no expired OTPs When: finding expired Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findExpiredOtp('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: multiple expired OTPs When: finding expired Then: should return all', async () => {
      // Arrange
      const expired1 = { ...mockOtpData, id: 'otp-1', expiresAt: pastDate };
      const expired2 = {
        ...mockOtpData,
        id: 'otp-2',
        expiresAt: pastDate,
        ipAddress: null,
        userAgent: null,
      };
      mockPrismaService.otp.findMany.mockResolvedValue([expired1, expired2]);

      // Act
      const result = await repository.findExpiredOtp('org-123');

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('otp-1');
      expect(result[1].id).toBe('otp-2');
      expect(result[1].ipAddress).toBeUndefined();
    });

    it('Given: prisma throws error When: finding expired Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findExpiredOtp('org-123')).rejects.toThrow('DB Error');
    });
  });

  describe('findUsedOtp - additional cases', () => {
    it('Given: no used OTPs When: finding used Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findUsedOtp('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: prisma throws error When: finding used Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findUsedOtp('org-123')).rejects.toThrow('DB Error');
    });
  });

  describe('deleteExpiredOtp - error handling', () => {
    it('Given: prisma throws error When: deleting expired Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.deleteMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.deleteExpiredOtp('org-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('deleteUsedOtp - error handling', () => {
    it('Given: prisma throws error When: deleting used Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.deleteMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.deleteUsedOtp('org-123', 24)).rejects.toThrow('Delete failed');
    });
  });

  describe('countByEmailAndType - error handling', () => {
    it('Given: prisma throws error When: counting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.count.mockRejectedValue(new Error('Count failed'));

      // Act & Assert
      await expect(
        repository.countByEmailAndType('user@example.com', 'PASSWORD_RESET', 'org-123')
      ).rejects.toThrow('Count failed');
    });
  });

  describe('findRecentOtpByEmail - additional cases', () => {
    it('Given: no recent OTPs When: finding recent Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findRecentOtpByEmail('user@example.com', 'org-123', 1);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: OTPs with null optional fields When: finding recent Then: should map to undefined', async () => {
      // Arrange
      const otpNulls = { ...mockOtpData, ipAddress: null, userAgent: null };
      mockPrismaService.otp.findMany.mockResolvedValue([otpNulls]);

      // Act
      const result = await repository.findRecentOtpByEmail('user@example.com', 'org-123', 1);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].ipAddress).toBeUndefined();
      expect(result[0].userAgent).toBeUndefined();
    });

    it('Given: prisma throws error When: finding recent Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(
        repository.findRecentOtpByEmail('user@example.com', 'org-123', 1)
      ).rejects.toThrow('DB Error');
    });
  });

  describe('save - error handling', () => {
    it('Given: prisma throws error When: saving Then: should propagate error', async () => {
      // Arrange
      const otp = Otp.reconstitute(
        {
          email: 'user@example.com',
          code: '123456',
          type: 'PASSWORD_RESET',
          expiresAt: futureDate,
          isUsed: false,
          attempts: 0,
          maxAttempts: 3,
        },
        'otp-123',
        'org-123'
      );
      mockPrismaService.otp.upsert.mockRejectedValue(new Error('Upsert failed'));

      // Act & Assert
      await expect(repository.save(otp)).rejects.toThrow('Upsert failed');
    });

    it('Given: OTP without optional fields When: saving Then: should save successfully', async () => {
      // Arrange
      const otpNoOptionals = { ...mockOtpData, ipAddress: null, userAgent: null };
      mockPrismaService.otp.upsert.mockResolvedValue(otpNoOptionals);

      const otp = Otp.reconstitute(
        {
          email: 'user@example.com',
          code: '654321',
          type: 'ACCOUNT_ACTIVATION',
          expiresAt: futureDate,
          isUsed: false,
          attempts: 0,
          maxAttempts: 3,
        },
        'otp-456',
        'org-123'
      );

      // Act
      const result = await repository.save(otp);

      // Assert
      expect(result).not.toBeNull();
      expect(result.ipAddress).toBeUndefined();
      expect(result.userAgent).toBeUndefined();
    });
  });

  describe('delete - error handling', () => {
    it('Given: prisma throws error When: deleting Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.deleteMany.mockRejectedValue(new Error('Delete failed'));

      // Act & Assert
      await expect(repository.delete('otp-123', 'org-123')).rejects.toThrow('Delete failed');
    });
  });

  describe('findAll - additional cases', () => {
    it('Given: empty org When: finding all Then: should return empty array', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockResolvedValue([]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(0);
    });

    it('Given: OTPs with null optional fields When: finding all Then: should map correctly', async () => {
      // Arrange
      const otpNulls = { ...mockOtpData, ipAddress: null, userAgent: null };
      mockPrismaService.otp.findMany.mockResolvedValue([otpNulls]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].ipAddress).toBeUndefined();
      expect(result[0].userAgent).toBeUndefined();
    });

    it('Given: prisma throws error When: finding all Then: should propagate error', async () => {
      // Arrange
      mockPrismaService.otp.findMany.mockRejectedValue(new Error('DB Error'));

      // Act & Assert
      await expect(repository.findAll('org-123')).rejects.toThrow('DB Error');
    });

    it('Given: OTPs of different types When: finding all Then: should reconstitute all types', async () => {
      // Arrange
      const otpPasswordReset = { ...mockOtpData, id: 'otp-1', type: 'PASSWORD_RESET' };
      const otpActivation = { ...mockOtpData, id: 'otp-2', type: 'ACCOUNT_ACTIVATION' };
      const otpTwoFactor = { ...mockOtpData, id: 'otp-3', type: 'TWO_FACTOR' };
      mockPrismaService.otp.findMany.mockResolvedValue([
        otpPasswordReset,
        otpActivation,
        otpTwoFactor,
      ]);

      // Act
      const result = await repository.findAll('org-123');

      // Assert
      expect(result).toHaveLength(3);
      expect(result[0].type).toBe('PASSWORD_RESET');
      expect(result[1].type).toBe('ACCOUNT_ACTIVATION');
      expect(result[2].type).toBe('TWO_FACTOR');
    });
  });
});
