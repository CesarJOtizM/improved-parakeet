/* eslint-disable @typescript-eslint/no-explicit-any */
import { PasswordResetController } from '@interface/http/routes/passwordReset.controller';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ok, err } from '@shared/domain/result';
import {
  ValidationError,
  AuthenticationError,
  RateLimitError,
} from '@shared/domain/result/domainError';

describe('PasswordResetController', () => {
  let controller: PasswordResetController;
  let mockRequestPasswordResetUseCase: any;
  let mockVerifyOtpUseCase: any;
  let mockResetPasswordUseCase: any;

  const mockOrgId = 'org-123';
  const mockIpAddress = '127.0.0.1';
  const mockUserAgent = 'Mozilla/5.0 Test';

  beforeEach(() => {
    mockRequestPasswordResetUseCase = { execute: jest.fn() };
    mockVerifyOtpUseCase = { execute: jest.fn() };
    mockResetPasswordUseCase = { execute: jest.fn() };

    controller = new PasswordResetController(
      mockRequestPasswordResetUseCase,
      mockVerifyOtpUseCase,
      mockResetPasswordUseCase
    );
  });

  describe('requestPasswordReset', () => {
    it('Given: valid email When: requesting reset Then: should return success response', async () => {
      // Arrange
      const dto = { email: 'user@example.com' };
      const resetResponse = {
        success: true,
        message: 'Password reset email sent',
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 600000).toISOString(),
      };
      mockRequestPasswordResetUseCase.execute.mockResolvedValue(ok(resetResponse));

      // Act
      const result = await controller.requestPasswordReset(
        dto as any,
        mockIpAddress,
        mockUserAgent,
        mockOrgId
      );

      // Assert
      expect(result.success).toBe(true);
      expect((result as any).email).toBe('user@example.com');
      expect(mockRequestPasswordResetUseCase.execute).toHaveBeenCalledWith({
        email: 'user@example.com',
        orgId: mockOrgId,
        ipAddress: mockIpAddress,
        userAgent: mockUserAgent,
      });
    });

    it('Given: invalid email When: requesting reset Then: should throw validation error', async () => {
      // Arrange
      const dto = { email: 'invalid-email' };
      mockRequestPasswordResetUseCase.execute.mockResolvedValue(
        err(new ValidationError('Invalid email address'))
      );

      // Act & Assert
      await expect(
        controller.requestPasswordReset(dto as any, mockIpAddress, mockUserAgent, mockOrgId)
      ).rejects.toThrow();
    });

    it('Given: rate limited When: requesting reset Then: should throw rate limit error', async () => {
      // Arrange
      const dto = { email: 'user@example.com' };
      mockRequestPasswordResetUseCase.execute.mockResolvedValue(
        err(new RateLimitError('Too many requests. Please try again later.'))
      );

      // Act & Assert
      await expect(
        controller.requestPasswordReset(dto as any, mockIpAddress, mockUserAgent, mockOrgId)
      ).rejects.toThrow();
    });
  });

  describe('verifyOtp', () => {
    it('Given: valid OTP When: verifying Then: should return success with valid flag', async () => {
      // Arrange
      const dto = { email: 'user@example.com', otpCode: '123456' };
      const verifyResponse = {
        success: true,
        message: 'OTP verified successfully',
        isValid: true,
        email: 'user@example.com',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        attemptsRemaining: 2,
      };
      mockVerifyOtpUseCase.execute.mockResolvedValue(ok(verifyResponse));

      // Act
      const result = await controller.verifyOtp(dto as any, mockIpAddress, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect((result as any).isValid).toBe(true);
      expect(mockVerifyOtpUseCase.execute).toHaveBeenCalledWith({
        email: 'user@example.com',
        otpCode: '123456',
        orgId: mockOrgId,
      });
    });

    it('Given: invalid OTP When: verifying Then: should throw authentication error', async () => {
      // Arrange
      const dto = { email: 'user@example.com', otpCode: '000000' };
      mockVerifyOtpUseCase.execute.mockResolvedValue(
        err(new AuthenticationError('Invalid OTP code'))
      );

      // Act & Assert
      await expect(controller.verifyOtp(dto as any, mockIpAddress, mockOrgId)).rejects.toThrow();
    });

    it('Given: expired OTP When: verifying Then: should throw', async () => {
      // Arrange
      const dto = { email: 'user@example.com', otpCode: '123456' };
      mockVerifyOtpUseCase.execute.mockResolvedValue(
        err(new ValidationError('OTP code has expired'))
      );

      // Act & Assert
      await expect(controller.verifyOtp(dto as any, mockIpAddress, mockOrgId)).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('Given: valid OTP and new password When: resetting Then: should return success', async () => {
      // Arrange
      const dto = {
        email: 'user@example.com',
        otpCode: '123456',
        newPassword: 'NewP@ssw0rd!',
        confirmPassword: 'NewP@ssw0rd!',
      };
      const resetResponse = {
        success: true,
        message: 'Password reset successfully',
        email: 'user@example.com',
      };
      mockResetPasswordUseCase.execute.mockResolvedValue(ok(resetResponse));

      // Act
      const result = await controller.resetPassword(dto as any, mockIpAddress, mockOrgId);

      // Assert
      expect(result.success).toBe(true);
      expect((result as any).email).toBe('user@example.com');
      expect(mockResetPasswordUseCase.execute).toHaveBeenCalledWith({
        email: 'user@example.com',
        otpCode: '123456',
        newPassword: 'NewP@ssw0rd!',
        confirmPassword: 'NewP@ssw0rd!',
        orgId: mockOrgId,
      });
    });

    it('Given: invalid OTP When: resetting password Then: should throw auth error', async () => {
      // Arrange
      const dto = {
        email: 'user@example.com',
        otpCode: '000000',
        newPassword: 'NewP@ssw0rd!',
        confirmPassword: 'NewP@ssw0rd!',
      };
      mockResetPasswordUseCase.execute.mockResolvedValue(
        err(new AuthenticationError('Invalid OTP code'))
      );

      // Act & Assert
      await expect(
        controller.resetPassword(dto as any, mockIpAddress, mockOrgId)
      ).rejects.toThrow();
    });

    it('Given: weak password When: resetting Then: should throw validation error', async () => {
      // Arrange
      const dto = {
        email: 'user@example.com',
        otpCode: '123456',
        newPassword: '123',
        confirmPassword: '123',
      };
      mockResetPasswordUseCase.execute.mockResolvedValue(
        err(new ValidationError('Password does not meet requirements'))
      );

      // Act & Assert
      await expect(
        controller.resetPassword(dto as any, mockIpAddress, mockOrgId)
      ).rejects.toThrow();
    });
  });
});
