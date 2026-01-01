import { VerifyOtpUseCase } from '@application/authUseCases/verifyOtpUseCase';
import { Otp } from '@auth/domain/entities/otp.entity';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TokenError } from '@shared/domain/result/domainError';

import type { IOtpRepository } from '@auth/domain/repositories';

describe('VerifyOtpUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockEmail = 'test@example.com';
  const mockOtpCode = '123456';

  let useCase: VerifyOtpUseCase;
  let mockOtpRepository: jest.Mocked<IOtpRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockOtpRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      findByEmailAndType: jest.fn(),
      findValidByEmailAndType: jest.fn(),
      findExpiredOtp: jest.fn(),
      findUsedOtp: jest.fn(),
      deleteExpiredOtp: jest.fn(),
      deleteUsedOtp: jest.fn(),
      countByEmailAndType: jest.fn(),
      findRecentOtpByEmail: jest.fn(),
    } as jest.Mocked<IOtpRepository>;

    useCase = new VerifyOtpUseCase(mockOtpRepository);
  });

  describe('execute', () => {
    const validRequest = {
      email: mockEmail,
      otpCode: mockOtpCode,
      orgId: mockOrgId,
    };

    const createMockOtp = (isValid: boolean = true, verifyResult: boolean = true): Otp => {
      const otp = Otp.create(
        mockEmail,
        'PASSWORD_RESET',
        mockOrgId,
        '192.168.1.1',
        'Mozilla/5.0',
        15
      );
      Object.defineProperty(otp, 'isValid', {
        value: jest.fn<() => boolean>().mockReturnValue(isValid),
        writable: true,
        configurable: true,
      });
      jest.spyOn(otp, 'verify').mockReturnValue(verifyResult);
      Object.defineProperty(otp, 'hasExceededMaxAttempts', {
        value: jest.fn<() => boolean>().mockReturnValue(false),
        writable: true,
        configurable: true,
      });
      Object.defineProperty(otp, 'attempts', {
        get: () => 1,
        configurable: true,
      });
      Object.defineProperty(otp, 'maxAttempts', {
        get: () => 3,
        configurable: true,
      });
      Object.defineProperty(otp, 'expiresAt', {
        get: () => new Date(Date.now() + 15 * 60 * 1000),
        configurable: true,
      });
      return otp;
    };

    it('Given: valid OTP code When: verifying OTP Then: should return success with isValid true', async () => {
      // Arrange
      const mockOtp = createMockOtp(true, true);
      mockOtpRepository.findValidByEmailAndType.mockResolvedValue(mockOtp);
      mockOtpRepository.save.mockResolvedValue(mockOtp);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Valid verification code.');
          expect(value.data.isValid).toBe(true);
          expect(value.data.email).toBe(mockEmail);
          expect(value.data.expiresAt).toBeDefined();
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockOtp.verify).toHaveBeenCalledWith(mockOtpCode);
      expect(mockOtpRepository.save).toHaveBeenCalledWith(mockOtp);
    });

    it('Given: invalid OTP not found When: verifying OTP Then: should return success with isValid false', async () => {
      // Arrange
      mockOtpRepository.findValidByEmailAndType.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toBe('Invalid or expired verification code.');
          expect(value.data.isValid).toBe(false);
          expect(value.data.email).toBe(mockEmail);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockOtpRepository.save).not.toHaveBeenCalled();
    });

    it('Given: incorrect OTP code When: verifying OTP Then: should return success with isValid false and attempts remaining', async () => {
      // Arrange
      const mockOtp = createMockOtp(true, false);
      mockOtpRepository.findValidByEmailAndType.mockResolvedValue(mockOtp);
      mockOtpRepository.save.mockResolvedValue(mockOtp);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('Incorrect code');
          expect(value.data.isValid).toBe(false);
          expect(value.data.email).toBe(mockEmail);
          expect(value.data.attemptsRemaining).toBe(2); // maxAttempts (3) - attempts (1)
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockOtp.verify).toHaveBeenCalledWith(mockOtpCode);
      expect(mockOtpRepository.save).toHaveBeenCalledWith(mockOtp);
    });

    it('Given: OTP max attempts exceeded When: verifying OTP Then: should return success with isValid false and 0 attempts remaining', async () => {
      // Arrange
      const mockOtp = createMockOtp(true, false);
      Object.defineProperty(mockOtp, 'hasExceededMaxAttempts', {
        value: jest.fn<() => boolean>().mockReturnValue(true),
        writable: true,
        configurable: true,
      });
      mockOtpRepository.findValidByEmailAndType.mockResolvedValue(mockOtp);
      mockOtpRepository.save.mockResolvedValue(mockOtp);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('Maximum number of attempts exceeded');
          expect(value.data.isValid).toBe(false);
          expect(value.data.email).toBe(mockEmail);
          expect(value.data.attemptsRemaining).toBe(0);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockOtp.verify).toHaveBeenCalledWith(mockOtpCode);
      expect(mockOtpRepository.save).toHaveBeenCalledWith(mockOtp);
    });

    it('Given: error during verification When: verifying OTP Then: should return TokenError', async () => {
      // Arrange
      mockOtpRepository.findValidByEmailAndType.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(TokenError);
          expect((error as TokenError).internalReason).toBe('internal_error');
        }
      );
    });
  });
});
