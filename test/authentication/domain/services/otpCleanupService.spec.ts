import { IOtpRepository } from '@auth/domain/repositories/otpRepository.interface';
import { OtpCleanupService } from '@auth/domain/services/otpCleanupService';

describe('OtpCleanupService', () => {
  let otpCleanupService: OtpCleanupService;
  let mockOtpRepository: jest.Mocked<IOtpRepository>;

  beforeEach(() => {
    mockOtpRepository = {
      deleteExpiredOtp: jest.fn(),
      deleteUsedOtp: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByEmailAndType: jest.fn(),
      findValidByEmailAndType: jest.fn(),
      findExpiredOtp: jest.fn(),
      findUsedOtp: jest.fn(),
      countByEmailAndType: jest.fn(),
      findRecentOtpByEmail: jest.fn(),
    };

    otpCleanupService = new OtpCleanupService(mockOtpRepository);
  });

  describe('cleanupExpiredOtp', () => {
    it('Given: expired OTPs exist When: cleaning up expired OTPs Then: should delete expired OTPs and log success', async () => {
      // Arrange
      // const _orgId = 'test-org';
      const deletedCount = 5;
      mockOtpRepository.deleteExpiredOtp.mockResolvedValue(deletedCount);

      // Act
      await otpCleanupService.cleanupExpiredOtp();

      // Assert
      expect(mockOtpRepository.deleteExpiredOtp).toHaveBeenCalledWith('default');
    });

    it('Given: no expired OTPs When: cleaning up expired OTPs Then: should not delete any OTPs', async () => {
      // Arrange
      mockOtpRepository.deleteExpiredOtp.mockResolvedValue(0);

      // Act
      await otpCleanupService.cleanupExpiredOtp();

      // Assert
      expect(mockOtpRepository.deleteExpiredOtp).toHaveBeenCalledWith('default');
    });

    it('Given: repository error When: cleaning up expired OTPs Then: should handle error gracefully', async () => {
      // Arrange
      const error = new Error('Database error');
      mockOtpRepository.deleteExpiredOtp.mockRejectedValue(error);

      // Act
      await otpCleanupService.cleanupExpiredOtp();

      // Assert
      expect(mockOtpRepository.deleteExpiredOtp).toHaveBeenCalledWith('default');
    });
  });

  describe('cleanupUsedOtp', () => {
    it('Given: used OTPs exist When: cleaning up used OTPs Then: should delete used OTPs and log success', async () => {
      // Arrange
      // const _orgId = 'test-org';
      const deletedCount = 3;
      mockOtpRepository.deleteUsedOtp.mockResolvedValue(deletedCount);

      // Act
      await otpCleanupService.cleanupUsedOtp();

      // Assert
      expect(mockOtpRepository.deleteUsedOtp).toHaveBeenCalledWith('default', 24);
    });

    it('Given: no used OTPs When: cleaning up used OTPs Then: should not delete any OTPs', async () => {
      // Arrange
      mockOtpRepository.deleteUsedOtp.mockResolvedValue(0);

      // Act
      await otpCleanupService.cleanupUsedOtp();

      // Assert
      expect(mockOtpRepository.deleteUsedOtp).toHaveBeenCalledWith('default', 24);
    });

    it('Given: repository error When: cleaning up used OTPs Then: should handle error gracefully', async () => {
      // Arrange
      const error = new Error('Database error');
      mockOtpRepository.deleteUsedOtp.mockRejectedValue(error);

      // Act
      await otpCleanupService.cleanupUsedOtp();

      // Assert
      expect(mockOtpRepository.deleteUsedOtp).toHaveBeenCalledWith('default', 24);
    });
  });

  describe('manualCleanupExpiredOtp', () => {
    it('Given: valid orgId When: manually cleaning up expired OTPs Then: should return deleted count', async () => {
      // Arrange
      const _orgId = 'test-org';
      const deletedCount = 7;
      mockOtpRepository.deleteExpiredOtp.mockResolvedValue(deletedCount);

      // Act
      const result = await otpCleanupService.manualCleanupExpiredOtp(_orgId);

      // Assert
      expect(result).toBe(deletedCount);
      expect(mockOtpRepository.deleteExpiredOtp).toHaveBeenCalledWith(_orgId);
    });

    it('Given: repository error When: manually cleaning up expired OTPs Then: should throw error', async () => {
      // Arrange
      const _orgId = 'test-org';
      const error = new Error('Database error');
      mockOtpRepository.deleteExpiredOtp.mockRejectedValue(error);

      // Act & Assert
      await expect(otpCleanupService.manualCleanupExpiredOtp(_orgId)).rejects.toThrow(error);
      expect(mockOtpRepository.deleteExpiredOtp).toHaveBeenCalledWith(_orgId);
    });
  });

  describe('manualCleanupUsedOtp', () => {
    it('Given: valid orgId and hours When: manually cleaning up used OTPs Then: should return deleted count', async () => {
      // Arrange
      const _orgId = 'test-org';
      const hoursOld = 48;
      const deletedCount = 4;
      mockOtpRepository.deleteUsedOtp.mockResolvedValue(deletedCount);

      // Act
      const result = await otpCleanupService.manualCleanupUsedOtp(_orgId, hoursOld);

      // Assert
      expect(result).toBe(deletedCount);
      expect(mockOtpRepository.deleteUsedOtp).toHaveBeenCalledWith(_orgId, hoursOld);
    });

    it('Given: valid orgId with default hours When: manually cleaning up used OTPs Then: should use default hours', async () => {
      // Arrange
      const _orgId = 'test-org';
      const deletedCount = 2;
      mockOtpRepository.deleteUsedOtp.mockResolvedValue(deletedCount);

      // Act
      const result = await otpCleanupService.manualCleanupUsedOtp(_orgId);

      // Assert
      expect(result).toBe(deletedCount);
      expect(mockOtpRepository.deleteUsedOtp).toHaveBeenCalledWith(_orgId, 24);
    });

    it('Given: repository error When: manually cleaning up used OTPs Then: should throw error', async () => {
      // Arrange
      const _orgId = 'test-org';
      const hoursOld = 12;
      const error = new Error('Database error');
      mockOtpRepository.deleteUsedOtp.mockRejectedValue(error);

      // Act & Assert
      await expect(otpCleanupService.manualCleanupUsedOtp(_orgId, hoursOld)).rejects.toThrow(error);
      expect(mockOtpRepository.deleteUsedOtp).toHaveBeenCalledWith(_orgId, hoursOld);
    });
  });
});
