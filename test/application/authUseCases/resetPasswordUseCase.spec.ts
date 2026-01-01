import { ResetPasswordUseCase } from '@application/authUseCases/resetPasswordUseCase';
import { Otp } from '@auth/domain/entities/otp.entity';
import { User } from '@auth/domain/entities/user.entity';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { Email } from '@auth/domain/valueObjects/email.valueObject';
import { UserStatus } from '@auth/domain/valueObjects/userStatus.valueObject';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { TokenError, ValidationError } from '@shared/domain/result/domainError';

import type { IOtpRepository, IUserRepository } from '@auth/domain/repositories';

describe('ResetPasswordUseCase', () => {
  const mockOrgId = 'test-org-id';
  const mockEmail = 'test@example.com';
  const mockOtpCode = '123456';
  const mockNewPassword = 'NewSecurePass123!';

  let useCase: ResetPasswordUseCase;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockOtpRepository: jest.Mocked<IOtpRepository>;

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

    // Mock AuthenticationService static methods
    jest.spyOn(AuthenticationService, 'validatePasswordStrength').mockReturnValue({
      isValid: true,
      errors: [],
    });
    jest.spyOn(AuthenticationService, 'verifyPassword').mockResolvedValue(false);

    useCase = new ResetPasswordUseCase(mockUserRepository, mockOtpRepository);
  });

  describe('execute', () => {
    const validRequest = {
      email: mockEmail,
      otpCode: mockOtpCode,
      newPassword: mockNewPassword,
      confirmPassword: mockNewPassword,
      orgId: mockOrgId,
    };

    const createMockUser = (): User => {
      const user = User.create(
        {
          email: Email.create(mockEmail),
          username: 'testuser',
          password: 'OldSecure123!',
          firstName: 'Test',
          lastName: 'User',
          status: UserStatus.create('ACTIVE'),
          failedLoginAttempts: 0,
        },
        mockOrgId
      );
      Object.defineProperty(user, 'canLogin', {
        value: jest.fn<() => boolean>().mockReturnValue(true),
        writable: true,
        configurable: true,
      });
      jest.spyOn(user, 'changePassword').mockImplementation(() => {
        // Mock implementation
      });
      return user;
    };

    const createMockOtp = (isValid: boolean = true): Otp => {
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
      jest.spyOn(otp, 'verify').mockReturnValue(isValid);
      jest.spyOn(otp, 'markAsUsed').mockImplementation(() => {
        // Mock implementation
      });
      Object.defineProperty(otp, 'hasExceededMaxAttempts', {
        value: jest.fn<() => boolean>().mockReturnValue(false),
        writable: true,
        configurable: true,
      });
      return otp;
    };

    it('Given: valid request When: resetting password Then: should reset password successfully', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const mockOtp = createMockOtp(true);
      mockOtpRepository.findValidByEmailAndType.mockResolvedValue(mockOtp);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockOtpRepository.save.mockResolvedValue(mockOtp);

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isOk()).toBe(true);
      result.match(
        value => {
          expect(value.success).toBe(true);
          expect(value.message).toContain('Password updated successfully');
          expect(value.data.email).toBe(mockEmail);
        },
        () => {
          throw new Error('Expected Ok result');
        }
      );
      expect(mockUser.changePassword).toHaveBeenCalledWith(mockNewPassword);
      expect(mockUserRepository.save).toHaveBeenCalledWith(mockUser);
      expect(mockOtp.verify).toHaveBeenCalledWith(mockOtpCode);
      expect(mockOtp.markAsUsed).toHaveBeenCalled();
      expect(mockOtpRepository.save).toHaveBeenCalledWith(mockOtp);
    });

    it('Given: passwords do not match When: resetting password Then: should return ValidationError', async () => {
      // Arrange
      const invalidRequest = { ...validRequest, confirmPassword: 'DifferentPassword123!' };

      // Act
      const result = await useCase.execute(invalidRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('Passwords do not match');
        }
      );
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('Given: weak password When: resetting password Then: should return ValidationError', async () => {
      // Arrange
      jest.spyOn(AuthenticationService, 'validatePasswordStrength').mockReturnValue({
        isValid: false,
        errors: ['Password too short'],
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
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toContain('Password does not meet security requirements');
        }
      );
      expect(mockUserRepository.findByEmail).not.toHaveBeenCalled();
    });

    it('Given: user not found When: resetting password Then: should return TokenError', async () => {
      // Arrange
      mockUserRepository.findByEmail.mockResolvedValue(null);

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
          expect((error as TokenError).internalReason).toBe('user_not_found');
        }
      );
      expect(mockOtpRepository.findValidByEmailAndType).not.toHaveBeenCalled();
    });

    it('Given: locked user When: resetting password Then: should return TokenError', async () => {
      // Arrange
      const mockUser = createMockUser();
      Object.defineProperty(mockUser, 'canLogin', {
        value: jest.fn<() => boolean>().mockReturnValue(false),
        writable: true,
        configurable: true,
      });
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);

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
          expect((error as TokenError).internalReason).toBe('account_locked');
        }
      );
      expect(mockOtpRepository.findValidByEmailAndType).not.toHaveBeenCalled();
    });

    it('Given: invalid OTP When: resetting password Then: should return TokenError', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockOtpRepository.findValidByEmailAndType.mockResolvedValue(null);

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
          expect((error as TokenError).internalReason).toBe('invalid_or_expired_otp');
        }
      );
      expect(mockUser.changePassword).not.toHaveBeenCalled();
    });

    it('Given: incorrect OTP code When: resetting password Then: should return TokenError', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const mockOtp = createMockOtp(false);
      jest.spyOn(mockOtp, 'verify').mockReturnValue(false);
      mockOtpRepository.findValidByEmailAndType.mockResolvedValue(mockOtp);
      mockOtpRepository.save.mockResolvedValue(mockOtp);

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
          expect((error as TokenError).internalReason).toBe('invalid_otp_code');
        }
      );
      expect(mockOtp.verify).toHaveBeenCalledWith(mockOtpCode);
      expect(mockOtpRepository.save).toHaveBeenCalledWith(mockOtp);
      expect(mockUser.changePassword).not.toHaveBeenCalled();
    });

    it('Given: OTP max attempts exceeded When: resetting password Then: should return TokenError', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const mockOtp = createMockOtp(false);
      jest.spyOn(mockOtp, 'verify').mockReturnValue(false);
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
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(TokenError);
          expect((error as TokenError).internalReason).toBe('max_attempts_exceeded');
        }
      );
      expect(mockUser.changePassword).not.toHaveBeenCalled();
    });

    it('Given: new password same as current When: resetting password Then: should return ValidationError', async () => {
      // Arrange
      const mockUser = createMockUser();
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const mockOtp = createMockOtp(true);
      mockOtpRepository.findValidByEmailAndType.mockResolvedValue(mockOtp);
      jest.spyOn(AuthenticationService, 'verifyPassword').mockResolvedValue(true); // Same password

      // Act
      const result = await useCase.execute(validRequest);

      // Assert
      expect(result.isErr()).toBe(true);
      result.match(
        () => {
          throw new Error('Expected Err result');
        },
        error => {
          expect(error).toBeInstanceOf(ValidationError);
          expect(error.message).toBe('New password must be different from current password');
        }
      );
      expect(mockUser.changePassword).not.toHaveBeenCalled();
    });
  });
});
