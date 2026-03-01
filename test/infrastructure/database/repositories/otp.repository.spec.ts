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
  });
});
