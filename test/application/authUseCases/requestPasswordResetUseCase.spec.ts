import { RequestPasswordResetUseCase } from '@application/authUseCases/requestPasswordResetUseCase';
import { Otp } from '@auth/domain/entities/otp.entity';
import { User } from '@auth/domain/entities/user.entity';
import { RateLimitService } from '@auth/domain/services/rateLimitService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { EmailService } from '@infrastructure/externalServices/emailService';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { RateLimitError } from '@shared/domain/result/domainError';

import type { IOtpRepository, IUserRepository } from '@auth/domain/repositories';

describe('RequestPasswordResetUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockEmail = 'test@example.com';

  let useCase: RequestPasswordResetUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockOtpRepository: jest.Mocked<IOtpRepository>;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockRateLimitService: jest.Mocked<RateLimitService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepository = {
      save: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByStatus: jest.fn(),
      findByRole: jest.fn(),
      findActiveUsers: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      findOne: jest.fn(),
      exists: jest.fn(),
      delete: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      findLockedUsers: jest.fn(),
      countByStatus: jest.fn(),
      countActiveUsers: jest.fn(),
      countLockedUsers: jest.fn(),
      findUsersWithFailedLogins: jest.fn(),
      findAll: jest.fn(),
      findBySpecification: jest.fn(),
    } as jest.Mocked<IUserRepository>;

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

    mockEmailService = {
      sendWelcomeEmail: jest.fn(),
      sendNewUserNotificationToAdmin: jest.fn(),
      sendPasswordResetOtpEmail: jest.fn(),
    } as unknown as jest.Mocked<EmailService>;

    mockRateLimitService = {
      checkRateLimit: jest.fn(),
      checkRefreshTokenRateLimit: jest.fn(),
      checkPasswordResetRateLimit: jest.fn(),
      checkLoginRateLimit: jest.fn(),
    } as unknown as jest.Mocked<RateLimitService>;

    useCase = new RequestPasswordResetUseCase(
      mockUserRepository,
      mockOtpRepository,
      mockEmailService,
      mockRateLimitService
    );
  });

  describe('execute', () => {
    const validRequest = {
      email: mockEmail,
      orgId: mockOrgId,
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    it('Given: valid email When: requesting password reset Then: should return success result', async () => {
      // Arrange
      mockRateLimitService.checkPasswordResetRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      const mockUser = User.create(
        {
          email: Email.create(mockEmail),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      Object.defineProperty(mockUser, 'canLogin', {
        value: jest.fn<() => boolean>().mockReturnValue(true),
        writable: true,
        configurable: true,
      });
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockOtpRepository.findRecentOtpByEmail.mockResolvedValue([]);
      const mockOtp = Otp.create(
        mockEmail,
        'PASSWORD_RESET',
        mockOrgId,
        '192.168.1.1',
        'Mozilla/5.0',
        15
      );
      mockOtpRepository.save.mockResolvedValue(mockOtp);
      mockEmailService.sendPasswordResetOtpEmail.mockResolvedValue({ success: true });

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.data.email).toBe(mockEmail);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockOtpRepository.save).toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetOtpEmail).toHaveBeenCalled();
    });

    it('Given: rate limit exceeded When: requesting password reset Then: should return RateLimitError', async () => {
      // Arrange
      mockRateLimitService.checkPasswordResetRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetTime: new Date(Date.now() + 60000),
        blocked: true,
        blockExpiresAt: new Date(Date.now() + 3600000),
      });

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(RateLimitError);
        }
      );
    });

    it('Given: non-existent email When: requesting password reset Then: should still return success for security', async () => {
      // Arrange
      mockRateLimitService.checkPasswordResetRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      mockUserRepository.findByEmail.mockResolvedValue(null);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('If the email exists');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });

    it('Given: existing valid OTP When: requesting password reset Then: should return existing OTP info', async () => {
      // Arrange
      mockRateLimitService.checkPasswordResetRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: new Date(Date.now() + 60000),
        blocked: false,
      });
      const mockUser = User.create(
        {
          email: Email.create(mockEmail),
          username: 'testuser',
          password: 'SecurePass123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      Object.defineProperty(mockUser, 'canLogin', {
        value: jest.fn<() => boolean>().mockReturnValue(true),
        writable: true,
        configurable: true,
      });
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const existingOtp = Otp.create(
        mockEmail,
        'PASSWORD_RESET',
        mockOrgId,
        '192.168.1.1',
        'Mozilla/5.0',
        15
      );
      Object.defineProperty(existingOtp, 'isValid', {
        value: jest.fn<() => boolean>().mockReturnValue(true),
        writable: true,
        configurable: true,
      });
      Object.defineProperty(existingOtp, 'type', {
        get: () => 'PASSWORD_RESET',
        configurable: true,
      });
      mockOtpRepository.findRecentOtpByEmail.mockResolvedValue([existingOtp]);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('already been sent');
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
    });
  });
});
