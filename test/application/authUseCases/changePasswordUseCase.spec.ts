import { ChangePasswordUseCase } from '@application/authUseCases/changePasswordUseCase';
import { AuthenticationService } from '@auth/domain/services/authenticationService';
import { User } from '@auth/domain/entities/user.entity';
import { UserStatus } from '@auth/domain';
import { ValidationError } from '@shared/domain/result/domainError';

describe('ChangePasswordUseCase', () => {
  let useCase: ChangePasswordUseCase;
  let mockUserRepository: {
    findById: jest.Mock;
    save: jest.Mock;
    findByEmail: jest.Mock;
    findAll: jest.Mock;
    delete: jest.Mock;
  };

  const orgId = 'org-123';
  const userId = 'user-123';
  const currentPassword = 'OldP@ssw0rd!';
  const newPassword = 'N3wP@ssw0rd!';

  function createMockUser(passwordHash: string): User {
    return User.reconstitute(
      {
        email: { getValue: () => 'test@test.com' } as any,
        username: 'testuser',
        passwordHash: { getValue: () => passwordHash } as any,
        firstName: 'Test',
        lastName: 'User',
        status: UserStatus.create('ACTIVE'),
        failedLoginAttempts: 0,
      },
      userId,
      orgId
    );
  }

  beforeEach(() => {
    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn(),
      findByEmail: jest.fn(),
      findAll: jest.fn(),
      delete: jest.fn(),
    };

    useCase = new ChangePasswordUseCase(mockUserRepository as any);
  });

  it('Given: valid credentials When: changing password Then: should change password successfully', async () => {
    const hashedCurrent = await AuthenticationService.hashPassword(currentPassword);
    const user = createMockUser(hashedCurrent);
    mockUserRepository.findById.mockResolvedValue(user);
    mockUserRepository.save.mockResolvedValue(undefined);

    const result = await useCase.execute({
      userId,
      orgId,
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    });

    expect(result.isOk()).toBe(true);
    result.match(
      value => {
        expect(value.success).toBe(true);
        expect(value.data.userId).toBe(userId);
        expect(value.message).toBe('Password changed successfully');
      },
      () => {
        throw new Error('Expected Ok result');
      }
    );
    expect(mockUserRepository.save).toHaveBeenCalled();
  });

  it('Given: incorrect current password When: changing password Then: should return ValidationError', async () => {
    const hashedCurrent = await AuthenticationService.hashPassword(currentPassword);
    const user = createMockUser(hashedCurrent);
    mockUserRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute({
      userId,
      orgId,
      currentPassword: 'WrongP@ssw0rd!',
      newPassword,
      confirmPassword: newPassword,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Current password is incorrect');
      }
    );
  });

  it('Given: new password same as current When: changing password Then: should return ValidationError', async () => {
    const hashedCurrent = await AuthenticationService.hashPassword(currentPassword);
    const user = createMockUser(hashedCurrent);
    mockUserRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute({
      userId,
      orgId,
      currentPassword,
      newPassword: currentPassword,
      confirmPassword: currentPassword,
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('different');
      }
    );
  });

  it('Given: weak password When: changing password Then: should return ValidationError', async () => {
    const hashedCurrent = await AuthenticationService.hashPassword(currentPassword);
    const user = createMockUser(hashedCurrent);
    mockUserRepository.findById.mockResolvedValue(user);

    const result = await useCase.execute({
      userId,
      orgId,
      currentPassword,
      newPassword: 'weak',
      confirmPassword: 'weak',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('security requirements');
      }
    );
  });

  it('Given: user with mustChangePassword=true When: changing password Then: should set mustChangePassword to false', async () => {
    const hashedCurrent = await AuthenticationService.hashPassword(currentPassword);
    const user = User.reconstitute(
      {
        email: { getValue: () => 'test@test.com' } as any,
        username: 'testuser',
        passwordHash: { getValue: () => hashedCurrent } as any,
        firstName: 'Test',
        lastName: 'User',
        status: UserStatus.create('ACTIVE'),
        failedLoginAttempts: 0,
        mustChangePassword: true,
      },
      userId,
      orgId
    );
    mockUserRepository.findById.mockResolvedValue(user);
    mockUserRepository.save.mockResolvedValue(undefined);

    const result = await useCase.execute({
      userId,
      orgId,
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    });

    expect(result.isOk()).toBe(true);
    expect(user.mustChangePassword).toBe(false);
    expect(mockUserRepository.save).toHaveBeenCalledWith(user);
  });

  it('Given: mismatched confirmation When: changing password Then: should return ValidationError', async () => {
    const result = await useCase.execute({
      userId,
      orgId,
      currentPassword,
      newPassword,
      confirmPassword: 'D1fferentP@ss!',
    });

    expect(result.isErr()).toBe(true);
    result.match(
      () => {
        throw new Error('Expected Err result');
      },
      error => {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('do not match');
      }
    );
  });
});
